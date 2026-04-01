// packages/orchestrator/src/workflows/protect.ts

import { WorkflowDefinition } from "./engine.js";
import { callAndParse } from "./helpers.js";

export const protectWorkflow: WorkflowDefinition = {
  name: "apply_protection",
  description: "Apply security and CDN settings to a domain",
  parameters: {
    domain: { type: "string", description: "Domain to apply protection to" },
  },
  requiredParams: ["domain"],
  requirements: [
    { role: "security", pattern: "*protection*" },
  ],
  async execute(args, ctx) {
    const domain = args.domain as string;
    const summary: Record<string, unknown> = { domain };

    const protectionTool = ctx.resolver.resolve("security", "*protection*");
    if (protectionTool) {
      summary.security = await callAndParse(ctx, protectionTool, { domain });
    }

    const cdnTool = ctx.resolver.resolve("cdn", "*cache*");
    if (cdnTool) {
      summary.cdn = await callAndParse(ctx, cdnTool, { domain });
    }

    return summary;
  },
};
