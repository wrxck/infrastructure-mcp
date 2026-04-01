// packages/orchestrator/src/server.ts

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { InfraConfig, validateConfig, ORCHESTRATOR_NAME, ORCHESTRATOR_VERSION } from "@infrastructure-mcp/shared";
import { ProviderProxy } from "./proxy.js";
import { WorkflowEngine } from "./workflows/engine.js";
import { onboardWorkflow } from "./workflows/onboard.js";
import { migrateWorkflow } from "./workflows/migrate.js";
import { protectWorkflow } from "./workflows/protect.js";

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

  const resolver = proxy.buildCapabilityResolver();
  const workflowEngine = new WorkflowEngine(resolver, proxy);
  workflowEngine.register(onboardWorkflow);
  workflowEngine.register(migrateWorkflow);
  workflowEngine.register(protectWorkflow);

  const providerTools = proxy.getAllTools();
  const workflowTools = workflowEngine.getTools();
  const builtinTools = [
    {
      name: "provider_status",
      description: "Get the connection status of all configured providers",
      inputSchema: { type: "object" as const, properties: {} },
    },
  ];
  const allTools = [...providerTools, ...workflowTools, ...builtinTools];
  const workflowNames = new Set(workflowTools.map((t) => t.name));
  const builtinNames = new Set(builtinTools.map((t) => t.name));

  const server = new Server(
    { name: ORCHESTRATOR_NAME, version: ORCHESTRATOR_VERSION },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: allTools.map((t) => ({
        name: t.name,
        description: t.description ?? "",
        inputSchema: t.inputSchema as { type: "object"; properties?: Record<string, unknown>; required?: string[] },
        ...("annotations" in t && t.annotations ? { annotations: t.annotations } : {}),
      })),
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    if (builtinNames.has(name)) {
      if (name === "provider_status") {
        const statuses = proxy.getStatuses();
        return {
          content: [{ type: "text" as const, text: JSON.stringify(statuses) }],
          isError: false,
        };
      }
    }

    const result = workflowNames.has(name)
      ? await workflowEngine.execute(name, args ?? {})
      : await proxy.callTool(name, args ?? {});
    return {
      content: [{ type: "text" as const, text: result.content }],
      isError: result.isError,
    };
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error(
    `${ORCHESTRATOR_NAME} v${ORCHESTRATOR_VERSION} started (${allTools.length} tools from ${config.providers.length} providers)`
  );

  const shutdown = async () => {
    await proxy.shutdownAll();
    await server.close();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}
