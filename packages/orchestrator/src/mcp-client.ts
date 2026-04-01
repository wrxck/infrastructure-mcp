// packages/orchestrator/src/mcp-client.ts

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import {
  ProviderConfig,
  McpToolDefinition,
  ToolResult,
  ORCHESTRATOR_NAME,
  ORCHESTRATOR_VERSION,
} from "@infrastructure-mcp/shared";

export interface ProviderClient {
  readonly name: string;
  connect(): Promise<void>;
  listTools(): Promise<McpToolDefinition[]>;
  callTool(name: string, args?: Record<string, unknown>): Promise<ToolResult>;
  isConnected(): boolean;
  disconnect(): Promise<void>;
}

export function createProviderClient(config: ProviderConfig): ProviderClient {
  let client: Client | null = null;
  let transport: StdioClientTransport | null = null;
  let connected = false;

  return {
    name: config.name,

    async connect(): Promise<void> {
      transport = new StdioClientTransport({
        command: config.command,
        args: config.args,
        env: { ...process.env, ...(config.env ?? {}) } as Record<string, string>,
        stderr: "pipe",
      });

      client = new Client(
        { name: ORCHESTRATOR_NAME, version: ORCHESTRATOR_VERSION },
        { capabilities: {} }
      );

      transport.onclose = () => { connected = false; };
      transport.onerror = () => { connected = false; };

      await client.connect(transport);
      connected = true;
    },

    async listTools(): Promise<McpToolDefinition[]> {
      if (!client) throw new Error("Not connected");
      const result = await client.listTools();
      return result.tools.map((t) => ({
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema as Record<string, unknown>,
        annotations: t.annotations,
      }));
    },

    async callTool(name: string, args: Record<string, unknown> = {}): Promise<ToolResult> {
      if (!client) throw new Error("Not connected");
      const result = await client.callTool({ name, arguments: args });
      const content = (result.content as Array<{ type: string; text?: string }>)
        .filter((item): item is { type: "text"; text: string } => item.type === "text" && "text" in item)
        .map((item) => item.text)
        .join("\n");
      return { content, isError: result.isError === true };
    },

    isConnected(): boolean {
      return connected;
    },

    async disconnect(): Promise<void> {
      connected = false;
      if (client) {
        await client.close();
        client = null;
        transport = null;
      }
    },
  };
}
