import { spawn, ChildProcessWithoutNullStreams } from "child_process";
import * as path from "node:path";
import * as fs from "node:fs";
import { CallToolResult, ContentItem, McpClient, PendingRequest, Tool, ToolInfo, ToolResult } from "./types/index.js";
import { SANITIZATION_PATTERN } from "./constants/index.js";

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
  let buffer = Buffer.alloc(0);

  const pending = new Map<number, PendingRequest>();

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

      if (separatorIdx === -1) {
        break;
      }

      const header = buffer.slice(0, separatorIdx).toString("utf8");
      const match = header.match(/Content-Length:\s*(\d+)/i);

      if (!match) {
        // Malformed — skip past the separator
        buffer = buffer.subarray(separatorIdx + 4);
        continue;
      }

      const contentLength = parseInt(match[1], 10);
      const bodyStart = separatorIdx + 4;

      if (buffer.length < bodyStart + contentLength) {
        // Haven't received the full body yet
        break;
      }

      const body = buffer.subarray(bodyStart, bodyStart + contentLength).toString("utf8");
      buffer = buffer.subarray(bodyStart + contentLength);

      let message: any;

      try {
        message = JSON.parse(body);
      } catch {
        // Malformed JSON — skip
        continue;
      }

      const hasMessage = message.id !== undefined && pending.has(message.id);

      if (hasMessage) {
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

  function sendRequest<T>(method: string, params: object): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      if (!proc) {
        reject(new Error("Not connected"));

        return;
      }

      const id = nextId++;

      pending.set(id, { resolve: (value: unknown) => resolve(value as T), reject });

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

        const cleanUpAndExit = () => { cleanup(); process.exit(0); };

        process.on("exit", cleanup);
        process.on("SIGINT", cleanUpAndExit);
        process.on("SIGTERM", cleanUpAndExit);

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
      const result: CallToolResult = (await sendRequest<CallToolResult>("tools/call", {
        name,
        arguments: args,
      }));

      const contentItems: Array<ContentItem> =
        result?.content ?? [];

      const rawText = contentItems
        .filter((item: ContentItem) => item.type === "text" && item.text != null)
        .map((item: ContentItem) => item.text!)
        .join("\n");

      const content = stripSanitizationMarkers(rawText);
      const isError = result?.isError === true;

      return { content, isError };
    },

    async listTools(): Promise<ToolInfo[]> {
      const result = (await sendRequest("tools/list", {})) as any;
      const tools: Array<{ name: string; description?: string }> =
        result?.tools ?? [];

      return tools.map((t: Tool) => ({
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
