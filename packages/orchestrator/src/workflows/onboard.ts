// packages/orchestrator/src/workflows/onboard.ts

import { WorkflowDefinition } from "./engine.js";
import { callAndParse, resolveTool } from "./helpers.js";

export const onboardWorkflow: WorkflowDefinition = {
  name: "onboard_domain",
  description: "Onboard a domain: create zone at DNS host, migrate DNS from registrar, update nameservers, apply security and CDN settings",
  parameters: {
    domain: { type: "string", description: "Domain to onboard (e.g. example.com)" },
    migrateRecords: { type: "boolean", description: "Migrate DNS records from registrar (default true)" },
    applyProtection: { type: "boolean", description: "Apply security and CDN settings (default true)" },
  },
  requiredParams: ["domain"],
  requirements: [
    { role: "dns_host", pattern: "*create_zone*" },
    { role: "dns_registrar", pattern: "*get_dns*" },
    { role: "dns_registrar", pattern: "*set_nameservers*" },
    { role: "security", pattern: "*protection*" },
  ],
  async execute(args, ctx) {
    const domain = args.domain as string;
    const migrateRecords = args.migrateRecords !== false;
    const applyProtection = args.applyProtection !== false;
    const summary: Record<string, unknown> = { domain };

    // 1. Create zone
    const createZoneTool = resolveTool(ctx, "dns_host", "*create_zone*");
    const zone = await callAndParse(ctx, createZoneTool, { domain }) as Record<string, unknown>;
    summary.zoneId = zone.id;
    summary.nameServers = zone.nameServers;

    // 2. Migrate DNS
    if (migrateRecords) {
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
              zoneId: zone.id,
              ...(typeof record === "object" && record !== null ? record : {}),
            });
            created++;
          } catch (err) {
            errors.push(err instanceof Error ? err.message : String(err));
          }
        }
        summary.recordsMigrated = created;
        if (errors.length > 0) summary.migrationErrors = errors;
      }

      // 3. Update nameservers
      const nameServers = zone.nameServers;
      if (Array.isArray(nameServers) && nameServers.length > 0) {
        const setNsTool = resolveTool(ctx, "dns_registrar", "*set_nameservers*");
        try {
          await callAndParse(ctx, setNsTool, { domain, nameservers: nameServers });
          summary.nameserversUpdated = true;
        } catch (err) {
          summary.nameserversUpdated = false;
          summary.nameserverError = err instanceof Error ? err.message : String(err);
        }
      }
    }

    // 4. Apply protection
    if (applyProtection) {
      const protectionTool = resolveTool(ctx, "security", "*protection*");
      try {
        summary.protectionApplied = await callAndParse(ctx, protectionTool, { domain });
      } catch (err) {
        summary.protectionError = err instanceof Error ? err.message : String(err);
      }

      const cdnTool = ctx.resolver.resolve("cdn", "*cache*");
      if (cdnTool) {
        try {
          summary.cdnApplied = await callAndParse(ctx, cdnTool, { domain });
        } catch (err) {
          summary.cdnError = err instanceof Error ? err.message : String(err);
        }
      }
    }

    return summary;
  },
};
