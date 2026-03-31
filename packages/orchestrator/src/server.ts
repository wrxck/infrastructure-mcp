// packages/orchestrator/src/server.ts

import { InfraConfig, validateConfig, ORCHESTRATOR_NAME, ORCHESTRATOR_VERSION, MCP_PROTOCOL_VERSION } from "@infrastructure-mcp/shared";
import { ProviderProxy } from "./proxy.js";

interface McpRequest {
  jsonrpc: string;
  id: number;
  method: string;
  params?: Record<string, unknown>;
}

function buildMessage(obj: object): string {
  const json = JSON.stringify(obj);
  const length = Buffer.byteLength(json);
  return `Content-Length: ${length}\r\n\r\n${json}`;
}

function sendResponse(id: number, result: object): void {
  process.stdout.write(buildMessage({ jsonrpc: "2.0", id, result }));
}

function sendError(id: number, code: number, message: string): void {
  process.stdout.write(
    buildMessage({ jsonrpc: "2.0", id, error: { code, message } })
  );
}

export async function startServer(config: InfraConfig): Promise<void> {
  const errors = validateConfig(config);
  if (errors.length > 0) {
    console.error("Config validation failed:");
    for (const err of errors) {
      console.error(`  - ${err}`);
    }
    process.exit(1);
  }

  const proxy = new ProviderProxy(config);
  await proxy.startAll();

  const allTools = proxy.getAllTools();

  let buffer = Buffer.alloc(0);

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

      let request: McpRequest;
      try {
        request = JSON.parse(body);
      } catch {
        continue;
      }

      handleRequest(request, proxy, allTools);
    }
  }

  function handleRequest(
    request: McpRequest,
    proxy: ProviderProxy,
    tools: Array<{ name: string; description: string }>,
  ): void {
    switch (request.method) {
      case "initialize":
        sendResponse(request.id, {
          protocolVersion: MCP_PROTOCOL_VERSION,
          capabilities: { tools: {} },
          serverInfo: { name: ORCHESTRATOR_NAME, version: ORCHESTRATOR_VERSION },
        });
        break;

      case "tools/list":
        sendResponse(request.id, {
          tools: tools.map((t) => ({
            name: t.name,
            description: t.description,
            inputSchema: { type: "object", properties: {}, required: [] },
          })),
        });
        break;

      case "tools/call": {
        const params = request.params ?? {};
        const toolName = params.name as string;
        const args = (params.arguments as Record<string, unknown>) ?? {};

        proxy.callTool(toolName, args).then((result) => {
          sendResponse(request.id, {
            content: [{ type: "text", text: result.content }],
            isError: result.isError,
          });
        }).catch((err) => {
          sendError(request.id, -32603, err instanceof Error ? err.message : String(err));
        });
        break;
      }

      default:
        sendError(request.id, -32601, `Method not found: ${request.method}`);
    }
  }

  process.stdin.on("data", (chunk: Buffer) => {
    buffer = Buffer.concat([buffer, chunk]);
    processBuffer();
  });

  const shutdown = async () => {
    await proxy.shutdownAll();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  console.error(
    `${ORCHESTRATOR_NAME} v${ORCHESTRATOR_VERSION} started (${allTools.length} tools from ${config.providers.length} providers)`
  );
}
