// packages/orchestrator/src/workflows/migrate.ts

import { WorkflowDefinition } from "./engine.js";
import { callAndParse, resolveTool } from "./helpers.js";

export const migrateWorkflow: WorkflowDefinition = {
  name: "migrate_dns",
  description: "Migrate DNS records from registrar to DNS host",
  parameters: {
    domain: { type: "string", description: "Domain to migrate DNS for" },
  },
  requiredParams: ["domain"],
  requirements: [
    { role: "dns_registrar", pattern: "*get_dns*" },
    { role: "dns_host", pattern: "*create_dns*" },
  ],
  async execute(args, ctx) {
    const domain = args.domain as string;
    const summary: Record<string, unknown> = { domain };

    const getDnsTool = resolveTool(ctx, "dns_registrar", "*get_dns*");
    const records = await callAndParse(ctx, getDnsTool, { domain }) as unknown[];
    summary.recordsFound = Array.isArray(records) ? records.length : 0;

    if (Array.isArray(records)) {
      const createDnsTool = resolveTool(ctx, "dns_host", "*create_dns*");
      let created = 0;
      const errors: string[] = [];

      for (const record of records) {
        try {
          await callAndParse(ctx, createDnsTool, {
            domain,
            ...(typeof record === "object" && record !== null ? record : {}),
          });
          created++;
        } catch (err) {
          errors.push(err instanceof Error ? err.message : String(err));
        }
      }
      summary.recordsMigrated = created;
      if (errors.length > 0) summary.errors = errors;
    }

    return summary;
  },
};
