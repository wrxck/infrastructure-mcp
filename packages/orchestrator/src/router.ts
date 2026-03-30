// packages/orchestrator/src/router.ts

import { Role, ToolInfo } from "@infrastructure-mcp/shared";

export interface ResolvedTool {
  provider: string;
  toolName: string;
}

export class ToolRouter {
  private routes = new Map<string, ResolvedTool>();
  private roleMap = new Map<string, string>();
  private tools: ToolInfo[] = [];

  registerProvider(providerName: string, roles: Role[], tools: ToolInfo[]): void {
    for (const role of roles) {
      this.roleMap.set(role, providerName);
    }

    for (const tool of tools) {
      const providerKey = `${providerName}.${tool.name}`;

      if (!this.routes.has(providerKey)) {
        this.routes.set(providerKey, { provider: providerName, toolName: tool.name });
        this.tools.push({
          name: providerKey,
          description: `[${providerName}] ${tool.description}`,
        });
      }

      for (const role of roles) {
        const roleKey = `${role}.${tool.name}`;
        if (roleKey === providerKey) continue;

        if (!this.routes.has(roleKey)) {
          this.routes.set(roleKey, { provider: providerName, toolName: tool.name });
          this.tools.push({
            name: roleKey,
            description: `[${role}] ${tool.description}`,
          });
        }
      }
    }
  }

  getAllTools(): ToolInfo[] {
    return this.tools;
  }

  resolve(namespacedName: string): ResolvedTool | null {
    return this.routes.get(namespacedName) ?? null;
  }

  getProviderForRole(role: string): string | null {
    return this.roleMap.get(role) ?? null;
  }
}
