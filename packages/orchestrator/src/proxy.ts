// packages/orchestrator/src/proxy.ts

import {
  InfraConfig,
  ProviderConfig,
  ProviderStatus,
  Role,
  McpToolDefinition,
  ToolResult,
  validateCapabilities,
} from "@infrastructure-mcp/shared";
import { ProviderClient, createProviderClient } from "./mcp-client.js";
import { ToolRouter } from "./router.js";

type ClientFactory = (config: ProviderConfig) => ProviderClient;

export class ProviderProxy {
  private clients = new Map<string, ProviderClient>();
  private toolCounts = new Map<string, number>();
  private router = new ToolRouter();
  private config: InfraConfig;
  private clientFactory: ClientFactory;

  constructor(config: InfraConfig, clientFactory?: ClientFactory) {
    this.config = config;
    this.clientFactory = clientFactory ?? createProviderClient;
  }

  async startAll(): Promise<void> {
    for (const providerConfig of this.config.providers) {
      const client = this.clientFactory(providerConfig);

      try {
        await client.connect();
        const tools = await client.listTools();

        this.clients.set(providerConfig.name, client);
        this.toolCounts.set(providerConfig.name, tools.length);
        this.router.registerProvider(
          providerConfig.name,
          providerConfig.roles as Role[],
          tools,
        );

        const toolNames = tools.map((t) => t.name);
        const warnings = validateCapabilities(toolNames, providerConfig.roles as Role[]);
        for (const warning of warnings) {
          console.warn(`[${providerConfig.name}] ${warning}`);
        }
      } catch (err) {
        if (providerConfig.optional) {
          const msg = err instanceof Error ? err.message : String(err);
          console.warn(
            `Optional provider '${providerConfig.name}' failed to start: ${msg}`
          );
        } else {
          throw new Error(
            `Required provider '${providerConfig.name}' failed to start: ${err instanceof Error ? err.message : String(err)}`
          );
        }
      }
    }
  }

  getAllTools(): McpToolDefinition[] {
    return this.router.getAllTools();
  }

  async callTool(namespacedName: string, args: Record<string, unknown>): Promise<ToolResult> {
    const resolved = this.router.resolve(namespacedName);

    if (!resolved) {
      return { content: `Unknown tool: ${namespacedName}`, isError: true };
    }

    const client = this.clients.get(resolved.provider);

    if (!client || !client.isConnected()) {
      return { content: `Provider '${resolved.provider}' is disconnected`, isError: true };
    }

    return client.callTool(resolved.toolName, args);
  }

  getStatuses(): ProviderStatus[] {
    return this.config.providers.map((p) => {
      const client = this.clients.get(p.name);
      return {
        name: p.name,
        roles: p.roles as Role[],
        connected: client?.isConnected() ?? false,
        toolCount: this.toolCounts.get(p.name) ?? 0,
        error: client ? undefined : "Not started",
      };
    });
  }

  getProviderForRole(role: string): string | null {
    return this.router.getProviderForRole(role);
  }

  async shutdownAll(): Promise<void> {
    for (const [, client] of this.clients) {
      await client.disconnect();
    }
    this.clients.clear();
  }
}
