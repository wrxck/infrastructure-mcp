// packages/orchestrator/src/router.ts

import { Role, McpToolDefinition } from "@infrastructure-mcp/shared";

export interface ResolvedTool {
  provider: string;
  toolName: string;
}

export class ToolRouter {
  private routes = new Map<string, ResolvedTool>();
  private roleMap = new Map<string, string>();
  private tools: McpToolDefinition[] = [];

  registerProvider(providerName: string, roles: Role[], tools: McpToolDefinition[]): void {
    for (const role of roles) {
      this.roleMap.set(role, providerName);
    }

    for (const tool of tools) {
      const providerKey = `${providerName}.${tool.name}`;

      if (!this.routes.has(providerKey)) {
        this.routes.set(providerKey, { provider: providerName, toolName: tool.name });
        this.tools.push({
          ...tool,
          name: providerKey,
          description: `[${providerName}] ${tool.description ?? ""}`,
        });
      }

      for (const role of roles) {
        const roleKey = `${role}.${tool.name}`;
        if (roleKey === providerKey) continue;

        if (!this.routes.has(roleKey)) {
          this.routes.set(roleKey, { provider: providerName, toolName: tool.name });
          this.tools.push({
            ...tool,
            name: roleKey,
            description: `[${role}] ${tool.description ?? ""}`,
          });
        }
      }
    }
  }

  getAllTools(): McpToolDefinition[] {
    return this.tools;
  }

  resolve(namespacedName: string): ResolvedTool | null {
    return this.routes.get(namespacedName) ?? null;
  }

  getProviderForRole(role: string): string | null {
    return this.roleMap.get(role) ?? null;
  }
}
