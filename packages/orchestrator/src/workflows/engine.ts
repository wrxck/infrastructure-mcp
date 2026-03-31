// packages/orchestrator/src/workflows/engine.ts

import { McpToolDefinition, ToolResult } from "@infrastructure-mcp/shared";
import { CapabilityResolver, CapabilityRequirement } from "../capability-resolver.js";
import { ProviderProxy } from "../proxy.js";

export interface WorkflowContext {
  proxy: ProviderProxy;
  resolver: CapabilityResolver;
}

export interface WorkflowDefinition {
  name: string;
  description: string;
  parameters: Record<string, { type: string; description: string }>;
  requiredParams: string[];
  requirements: CapabilityRequirement[];
  execute: (
    args: Record<string, unknown>,
    ctx: WorkflowContext,
  ) => Promise<Record<string, unknown>>;
}

export class WorkflowEngine {
  private workflows = new Map<string, WorkflowDefinition>();
  private enabled = new Set<string>();
  private resolver: CapabilityResolver;
  private proxy: ProviderProxy;

  constructor(resolver: CapabilityResolver, proxy: ProviderProxy) {
    this.resolver = resolver;
    this.proxy = proxy;
  }

  register(workflow: WorkflowDefinition): void {
    this.workflows.set(workflow.name, workflow);

    if (this.resolver.hasAll(workflow.requirements)) {
      this.enabled.add(workflow.name);
    } else {
      const missing = this.resolver.getMissing(workflow.requirements);
      console.warn(
        `Workflow '${workflow.name}' disabled: missing capabilities: ${missing.map((m) => `${m.role}:${m.pattern}`).join(", ")}`
      );
    }
  }

  getTools(): McpToolDefinition[] {
    const tools: McpToolDefinition[] = [];

    for (const [name, workflow] of this.workflows) {
      if (!this.enabled.has(name)) continue;

      tools.push({
        name: workflow.name,
        description: workflow.description,
        inputSchema: {
          type: "object",
          properties: workflow.parameters,
          required: workflow.requiredParams,
        },
        annotations: { destructiveHint: true },
      });
    }

    return tools;
  }

  async execute(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    const workflow = this.workflows.get(name);

    if (!workflow || !this.enabled.has(name)) {
      return { content: `Unknown or disabled workflow: ${name}`, isError: true };
    }

    try {
      const result = await workflow.execute(args, {
        proxy: this.proxy,
        resolver: this.resolver,
      });

      return { content: JSON.stringify(result, null, 2), isError: false };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { content: `Workflow '${name}' failed: ${msg}`, isError: true };
    }
  }
}
