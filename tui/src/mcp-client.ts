import { spawn, ChildProcessWithoutNullStreams } from "child_process";
import * as path from "path";
import * as fs from "fs";

export interface ToolResult {
  content: string;
  isError: boolean;
}

export interface ToolInfo {
  name: string;
  description: string;
}

export interface McpClient {
  connect(): Promise<void>;
  callTool(name: string, args?: Record<string, unknown>): Promise<ToolResult>;
  listTools(): Promise<ToolInfo[]>;
  isConnected(): boolean;
  disconnect(): Promise<void>;
}

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
}

const SANITIZATION_PATTERN = /----UNTRUSTED_CONTENT_[a-f0-9]+\n?/g;

function stripSanitizationMarkers(text: string): string {
  return text.replace(SANITIZATION_PATTERN, "");
}

function buildMessage(obj: object): string {
  const json = JSON.stringify(obj);
  const length = Buffer.byteLength(json);
  return `Content-Length: ${length}\r\n\r\n${json}`;
}

export function createMcpClient(
  jarPath: string,
  env: Record<string, string>
): McpClient {
  // Validate JAR path
  const resolvedJar = path.resolve(jarPath);
  if (!resolvedJar.endsWith(".jar")) {
    throw new Error(`Invalid JAR path: must end with .jar`);
  }
  if (!fs.existsSync(resolvedJar)) {
    throw new Error(`JAR not found: ${resolvedJar}`);
  }

  let proc: ChildProcessWithoutNullStreams | null = null;
  let connected = false;
  let nextId = 1;
  const pending = new Map<number, PendingRequest>();
  let buffer = Buffer.alloc(0);

  function rejectAll(reason: Error): void {
    for (const [, { reject }] of pending) {
      reject(reason);
    }
    pending.clear();
  }

  function processBuffer(): void {
    while (true) {
      // Find the header separator
      const separatorIdx = buffer.indexOf("\r\n\r\n");
      if (separatorIdx === -1) break;

      const header = buffer.slice(0, separatorIdx).toString("utf8");
      const match = header.match(/Content-Length:\s*(\d+)/i);
      if (!match) {
        // Malformed — skip past the separator
        buffer = buffer.slice(separatorIdx + 4);
        continue;
      }

      const contentLength = parseInt(match[1], 10);
      const bodyStart = separatorIdx + 4;
      if (buffer.length < bodyStart + contentLength) {
        // Haven't received the full body yet
        break;
      }

      const body = buffer.slice(bodyStart, bodyStart + contentLength).toString("utf8");
      buffer = buffer.slice(bodyStart + contentLength);

      let message: any;
      try {
        message = JSON.parse(body);
      } catch {
        // Malformed JSON — skip
        continue;
      }

      if (message.id !== undefined && pending.has(message.id)) {
        const { resolve, reject } = pending.get(message.id)!;
        pending.delete(message.id);
        if (message.error) {
          reject(new Error(message.error.message ?? "RPC error"));
        } else {
          resolve(message.result);
        }
      }
    }
  }

  function sendRequest(method: string, params: object): Promise<unknown> {
    return new Promise((resolve, reject) => {
      if (!proc) {
        reject(new Error("Not connected"));
        return;
      }
      const id = nextId++;
      pending.set(id, { resolve, reject });
      const msg = buildMessage({ jsonrpc: "2.0", id, method, params });
      proc.stdin.write(msg);
    });
  }

  return {
    async connect(): Promise<void> {
      return new Promise((resolve, reject) => {
        const mergedEnv = { ...process.env, ...env };

        proc = spawn("java", ["-jar", resolvedJar], {
          env: mergedEnv,
          stdio: ["pipe", "pipe", "pipe"],
        }) as unknown as ChildProcessWithoutNullStreams;

        // Kill child process on parent exit to prevent orphans
        const cleanup = () => {
          if (proc) {
            proc.kill();
            proc = null;
          }
        };
        process.on("exit", cleanup);
        process.on("SIGINT", () => { cleanup(); process.exit(0); });
        process.on("SIGTERM", () => { cleanup(); process.exit(0); });

        proc.stdout.on("data", (chunk: Buffer) => {
          buffer = Buffer.concat([buffer, chunk]);
          processBuffer();
        });

        proc.stderr.on("data", (_chunk: Buffer) => {
          // Ignore stderr output from the Java process
        });

        proc.on("error", (err: Error) => {
          connected = false;
          rejectAll(err);
          reject(err);
        });

        proc.on("exit", (_code: number | null) => {
          connected = false;
          rejectAll(new Error("MCP server process exited"));
        });

        // Send initialize
        const id = nextId++;
        pending.set(id, {
          resolve: (_result: unknown) => {
            connected = true;
            resolve();
          },
          reject: (err: unknown) => {
            reject(err);
          },
        });

        const msg = buildMessage({
          jsonrpc: "2.0",
          id,
          method: "initialize",
          params: {
            protocolVersion: "2024-11-05",
            clientInfo: { name: "infrastructure-tui", version: "1.2.0" },
            capabilities: {},
          },
        });
        proc.stdin.write(msg);
      });
    },

    async callTool(
      name: string,
      args: Record<string, unknown> = {}
    ): Promise<ToolResult> {
      const result = (await sendRequest("tools/call", {
        name,
        arguments: args,
      })) as any;

      const contentItems: Array<{ type: string; text?: string }> =
        result?.content ?? [];

      const rawText = contentItems
        .filter((item) => item.type === "text" && item.text != null)
        .map((item) => item.text!)
        .join("\n");

      const content = stripSanitizationMarkers(rawText);
      const isError = result?.isError === true;

      return { content, isError };
    },

    async listTools(): Promise<ToolInfo[]> {
      const result = (await sendRequest("tools/list", {})) as any;
      const tools: Array<{ name: string; description?: string }> =
        result?.tools ?? [];
      return tools.map((t) => ({
        name: t.name,
        description: t.description ?? "",
      }));
    },

    isConnected(): boolean {
      return connected;
    },

    async disconnect(): Promise<void> {
      connected = false;
      rejectAll(new Error("Client disconnected"));
      if (proc) {
        proc.kill();
        proc = null;
      }
    },
  };
}
