// packages/orchestrator/src/capability-resolver.ts

import { McpToolDefinition, Role } from "@infrastructure-mcp/shared";
import { matchesPattern } from "@infrastructure-mcp/shared";

export interface CapabilityRequirement {
  role: Role;
  pattern: string;
}

export class CapabilityResolver {
  private providers = new Map<string, { providerName: string; tools: McpToolDefinition[] }>();

  registerProvider(providerName: string, roles: Role[], tools: McpToolDefinition[]): void {
    for (const role of roles) {
      this.providers.set(role, { providerName, tools });
    }
  }

  resolve(role: string, pattern: string): string | null {
    const entry = this.providers.get(role);
    if (!entry) return null;

    for (const tool of entry.tools) {
      if (matchesPattern(tool.name, pattern)) {
        return `${entry.providerName}.${tool.name}`;
      }
    }

    return null;
  }

  hasAll(requirements: CapabilityRequirement[]): boolean {
    return requirements.every((req) => this.resolve(req.role, req.pattern) !== null);
  }

  getMissing(requirements: CapabilityRequirement[]): CapabilityRequirement[] {
    return requirements.filter((req) => this.resolve(req.role, req.pattern) === null);
  }
}
