// packages/orchestrator/src/mcp-client.ts

import { spawn, ChildProcessWithoutNullStreams } from "child_process";
import {
  ProviderConfig,
  ToolInfo,
  ToolResult,
  MCP_PROTOCOL_VERSION,
  ORCHESTRATOR_NAME,
  ORCHESTRATOR_VERSION,
} from "@infrastructure-mcp/shared";

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
}

interface ContentItem {
  type: string;
  text?: string;
}

interface CallToolRpcResult {
  content: ContentItem[];
  isError: boolean;
}

export interface ProviderClient {
  readonly name: string;
  connect(): Promise<void>;
  listTools(): Promise<ToolInfo[]>;
  callTool(name: string, args?: Record<string, unknown>): Promise<ToolResult>;
  isConnected(): boolean;
  disconnect(): Promise<void>;
}

function buildMessage(obj: object): string {
  const json = JSON.stringify(obj);
  const length = Buffer.byteLength(json);
  return `Content-Length: ${length}\r\n\r\n${json}`;
}

export function createProviderClient(config: ProviderConfig): ProviderClient {
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
      const separatorIdx = buffer.indexOf("\r\n\r\n");
      if (separatorIdx === -1) break;

      const header = buffer.subarray(0, separatorIdx).toString("utf8");
      const match = header.match(/Content-Length:\s*(\d+)/i);

      if (!match) {
        buffer = buffer.subarray(separatorIdx + 4);
        continue;
      }

      const contentLength = parseInt(match[1], 10);
      const bodyStart = separatorIdx + 4;

      if (buffer.length < bodyStart + contentLength) break;

      const body = buffer.subarray(bodyStart, bodyStart + contentLength).toString("utf8");
      buffer = buffer.subarray(bodyStart + contentLength);

      let message: any;
      try {
        message = JSON.parse(body);
      } catch {
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

  function sendRequest<T>(method: string, params: object): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      if (!proc) {
        reject(new Error("Not connected"));
        return;
      }

      const id = nextId++;
      pending.set(id, { resolve: (v: unknown) => resolve(v as T), reject });
      proc.stdin.write(buildMessage({ jsonrpc: "2.0", id, method, params }));
    });
  }

  return {
    name: config.name,

    async connect(): Promise<void> {
      return new Promise((resolve, reject) => {
        const mergedEnv = { ...process.env, ...(config.env ?? {}) };

        proc = spawn(config.command, config.args ?? [], {
          env: mergedEnv,
          stdio: ["pipe", "pipe", "pipe"],
        }) as unknown as ChildProcessWithoutNullStreams;

        proc.stdout.on("data", (chunk: Buffer) => {
          buffer = Buffer.concat([buffer, chunk]);
          processBuffer();
        });

        proc.stderr.on("data", () => {});

        proc.on("error", (err: Error) => {
          connected = false;
          rejectAll(err);
          reject(err);
        });

        proc.on("exit", () => {
          connected = false;
          rejectAll(new Error(`Provider '${config.name}' process exited`));
        });

        const id = nextId++;
        pending.set(id, {
          resolve: () => {
            connected = true;
            resolve();
          },
          reject: (err: unknown) => reject(err),
        });

        proc.stdin.write(
          buildMessage({
            jsonrpc: "2.0",
            id,
            method: "initialize",
            params: {
              protocolVersion: MCP_PROTOCOL_VERSION,
              clientInfo: { name: ORCHESTRATOR_NAME, version: ORCHESTRATOR_VERSION },
              capabilities: {},
            },
          })
        );
      });
    },

    async listTools(): Promise<ToolInfo[]> {
      const result = (await sendRequest("tools/list", {})) as any;
      const tools: Array<{ name: string; description?: string }> = result?.tools ?? [];
      return tools.map((t) => ({
        name: t.name,
        description: t.description ?? "",
      }));
    },

    async callTool(name: string, args: Record<string, unknown> = {}): Promise<ToolResult> {
      const result = await sendRequest<CallToolRpcResult>("tools/call", {
        name,
        arguments: args,
      });

      const items: ContentItem[] = result?.content ?? [];
      const content = items
        .filter((item) => item.type === "text" && item.text != null)
        .map((item) => item.text!)
        .join("\n");

      return { content, isError: result?.isError === true };
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
