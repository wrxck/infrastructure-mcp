// packages/orchestrator/src/workflows/helpers.ts

import { WorkflowContext } from "./engine.js";

export async function callAndParse(
  ctx: WorkflowContext,
  toolName: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  const result = await ctx.proxy.callTool(toolName, args);
  if (result.isError) {
    throw new Error(`${toolName} failed: ${result.content}`);
  }
  try {
    return JSON.parse(result.content);
  } catch {
    return result.content;
  }
}

export function resolveTool(ctx: WorkflowContext, role: string, pattern: string): string {
  const tool = ctx.resolver.resolve(role, pattern);
  if (!tool) throw new Error(`No tool found for ${role}:${pattern}`);
  return tool;
}
