import { spawn } from "child_process";
import * as path from "node:path";
import * as fs from "node:fs";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { McpClient, ToolInfo, ToolResult } from "./types/index.js";
import { SANITIZATION_PATTERN } from "./constants/index.js";

function stripSanitizationMarkers(text: string): string {
  return text.replace(SANITIZATION_PATTERN, "");
}

export function createMcpClient(
  serverCommand: string,
  env: Record<string, string>,
  serverArgs?: string[]
): McpClient {
  let client: Client | null = null;
  let transport: StdioClientTransport | null = null;
  let connected = false;

  // Determine command and args based on server type
  let command: string;
  let args: string[];

  if (serverCommand.endsWith(".jar")) {
    // Java JAR — validate path
    const resolvedJar = path.resolve(serverCommand);
    if (!fs.existsSync(resolvedJar)) {
      throw new Error(`JAR not found: ${resolvedJar}`);
    }
    command = "java";
    args = ["-jar", resolvedJar];
  } else if (serverCommand.endsWith(".js") || serverCommand.endsWith(".ts")) {
    // Node script
    command = "node";
    args = [path.resolve(serverCommand), ...(serverArgs ?? [])];
  } else {
    // Arbitrary command (e.g. "npx", "node", etc.)
    command = serverCommand;
    args = serverArgs ?? [];
  }

  return {
    async connect(): Promise<void> {
      transport = new StdioClientTransport({
        command,
        args,
        env: { ...process.env, ...env } as Record<string, string>,
      });

      client = new Client(
        { name: "infrastructure-tui", version: "1.2.0" },
        { capabilities: {} }
      );

      await client.connect(transport);
      connected = true;
    },

    async callTool(
      name: string,
      toolArgs: Record<string, unknown> = {}
    ): Promise<ToolResult> {
      if (!client) {
        return { content: "Not connected", isError: true };
      }

      const result = await client.callTool({ name, arguments: toolArgs });

      const contentItems = (result?.content ?? []) as Array<{
        type: string;
        text?: string;
      }>;

      const rawText = contentItems
        .filter((item) => item.type === "text" && item.text != null)
        .map((item) => item.text!)
        .join("\n");

      const content = stripSanitizationMarkers(rawText);
      const isError = result?.isError === true;

      return { content, isError };
    },

    async listTools(): Promise<ToolInfo[]> {
      if (!client) {
        return [];
      }

      const result = await client.listTools();
      return (result?.tools ?? []).map((t) => ({
        name: t.name,
        description: t.description ?? "",
      }));
    },

    isConnected(): boolean {
      return connected;
    },

    async disconnect(): Promise<void> {
      connected = false;
      if (transport) {
        await transport.close();
        transport = null;
      }
      client = null;
    },
  };
}
