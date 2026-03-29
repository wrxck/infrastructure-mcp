package com.infrastructure.mcp;

import com.cloudflare.mcp.CloudflareRestClient;
import com.namecheap.mcp.NamecheapClient;
import io.modelcontextprotocol.server.McpServerFeatures.SyncToolSpecification;
import io.modelcontextprotocol.server.McpSyncServerExchange;
import io.modelcontextprotocol.spec.McpSchema;
import io.modelcontextprotocol.spec.McpSchema.CallToolRequest;
import io.modelcontextprotocol.spec.McpSchema.CallToolResult;
import io.modelcontextprotocol.spec.McpSchema.JsonSchema;
import io.modelcontextprotocol.spec.McpSchema.Tool;
import io.modelcontextprotocol.spec.McpSchema.ToolAnnotations;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.*;
import java.util.function.BiFunction;

final class InfrastructureTools {

    private static final Logger log = LoggerFactory.getLogger(InfrastructureTools.class);

    private final CloudflareRestClient cloudflare;
    private final NamecheapClient namecheap;
    private final FleetClient fleet;

    InfrastructureTools(ServerConfig config) {
        var cfLimiter = new com.cloudflare.mcp.RateLimiter(240);

        com.cloudflare.mcp.CloudflareAuth cfAuth;
        if (config.isApiTokenAuth()) {
            cfAuth = com.cloudflare.mcp.CloudflareAuth.apiToken(config.cloudflareApiToken());
        } else {
            cfAuth = com.cloudflare.mcp.CloudflareAuth.globalApiKey(
                    config.cloudflareApiKey(), config.cloudflareEmail());
        }
        this.cloudflare = new CloudflareRestClient(cfAuth, config.cloudflareAccountId(), cfLimiter);

        var ncLimiter = new com.namecheap.mcp.RateLimiter(20, 700);
        this.namecheap = new NamecheapClient(
                config.namecheapApiUser(), config.namecheapApiKey(),
                config.namecheapClientIp(), ncLimiter);

        this.fleet = new FleetClient(config.fleetRegistryPath(), config.fleetBinary());
    }

    // Visible for testing
    InfrastructureTools(CloudflareRestClient cloudflare, NamecheapClient namecheap, FleetClient fleet) {
        this.cloudflare = cloudflare;
        this.namecheap = namecheap;
        this.fleet = fleet;
    }

    List<SyncToolSpecification> toolSpecs() {
        return List.of(
                spec("fleet_list_apps",
                        "List all applications registered in Fleet",
                        noParams(), readOnly(), this::handleFleetListApps),

                spec("fleet_run_command",
                        "Execute a Fleet CLI command",
                        schema(Map.of("command", stringProp("Fleet command string")),
                                List.of("command")),
                        destructive(), this::handleFleetRunCommand),

                spec("fleet_list_domains",
                        "List all domains across Fleet-registered applications",
                        noParams(), readOnly(), this::handleFleetListDomains),

                spec("namecheap_list_domains",
                        "List domains registered at Namecheap",
                        schema(Map.of(
                                "page", intProp("Page number (default 1)"),
                                "pageSize", intProp("Results per page (default 100, max 100)")),
                                List.of()),
                        readOnly(), this::handleNamecheapListDomains),

                spec("namecheap_get_dns",
                        "Get DNS host records for a Namecheap domain",
                        domainSchema(), readOnly(), this::handleNamecheapGetDns),

                spec("namecheap_get_nameservers",
                        "Get nameserver configuration for a Namecheap domain",
                        domainSchema(), readOnly(), this::handleNamecheapGetNameservers),

                spec("cloudflare_list_zones",
                        "List all Cloudflare zones in the account",
                        noParams(), readOnly(), this::handleCloudflareListZones),

                spec("cloudflare_get_dns",
                        "Get DNS records for a Cloudflare zone",
                        domainSchema(), readOnly(), this::handleCloudflareGetDns),

                spec("cloudflare_get_protection_status",
                        "Get security and performance settings status for a Cloudflare zone",
                        domainSchema(), readOnly(), this::handleCloudflareGetProtectionStatus),

                spec("onboard_domain",
                        "Onboard a domain: create CF zone, migrate DNS from Namecheap, update nameservers, apply protection",
                        schema(Map.of(
                                "domain", stringProp("Domain to onboard"),
                                "migrateRecords", boolProp("Migrate DNS records from Namecheap (default true)"),
                                "applyProtection", boolProp("Apply Cloudflare protection settings (default true)")),
                                List.of("domain")),
                        destructive(), this::handleOnboardDomain),

                spec("migrate_dns",
                        "Migrate DNS records from Namecheap to an existing Cloudflare zone",
                        domainSchema(), destructive(), this::handleMigrateDns),

                spec("apply_protection",
                        "Apply Cloudflare security and performance settings to a zone",
                        domainSchema(), destructive(), this::handleApplyProtection)
        );
    }

    // --- Tool handlers ---

    CallToolResult handleFleetListApps(Map<String, Object> args) {
        return ResultHelper.jsonResult(fleet.listApps());
    }

    CallToolResult handleFleetRunCommand(Map<String, Object> args) {
        String command = ResultHelper.getString(args, "command");
        try {
            String output = fleet.runCommand(command.split("\\s+"));
            return CallToolResult.builder().addTextContent(output).build();
        } catch (Exception e) {
            return ResultHelper.errorResult("Fleet command failed: " + e.getMessage());
        }
    }

    CallToolResult handleFleetListDomains(Map<String, Object> args) {
        return ResultHelper.jsonResult(Map.of(
                "domains", fleet.getAllDomains(),
                "rootDomains", fleet.getRootDomains()));
    }

    CallToolResult handleNamecheapListDomains(Map<String, Object> args) {
        int page = ResultHelper.getInt(args, "page", 1);
        int pageSize = ResultHelper.getInt(args, "pageSize", 100);
        return ResultHelper.sanitizedResult(namecheap.listDomains(page, pageSize));
    }

    CallToolResult handleNamecheapGetDns(Map<String, Object> args) {
        String domain = ResultHelper.getString(args, "domain");
        return ResultHelper.sanitizedResult(namecheap.getDnsHostsByDomain(domain));
    }

    CallToolResult handleNamecheapGetNameservers(Map<String, Object> args) {
        String domain = ResultHelper.getString(args, "domain");
        return ResultHelper.jsonResult(namecheap.getNameserversByDomain(domain));
    }

    CallToolResult handleCloudflareListZones(Map<String, Object> args) {
        return ResultHelper.sanitizedResult(cloudflare.listZones());
    }

    CallToolResult handleCloudflareGetDns(Map<String, Object> args) {
        String domain = ResultHelper.getString(args, "domain");
        var zone = cloudflare.getZoneByName(domain);
        if (zone == null) return ResultHelper.errorResult("Zone not found: " + domain);
        String zoneId = (String) zone.get("id");
        return ResultHelper.sanitizedResult(cloudflare.listDnsRecords(zoneId));
    }

    CallToolResult handleCloudflareGetProtectionStatus(Map<String, Object> args) {
        String domain = ResultHelper.getString(args, "domain");
        var zone = cloudflare.getZoneByName(domain);
        if (zone == null) return ResultHelper.errorResult("Zone not found: " + domain);
        String zoneId = (String) zone.get("id");

        var results = new ArrayList<Map<String, Object>>();
        for (var action : ProtectionSettings.checkableActions()) {
            if (action.isCustomEndpoint()) continue;
            var entry = new LinkedHashMap<String, Object>();
            entry.put("setting", action.settingId());
            entry.put("category", action.category());
            entry.put("desiredValue", action.value());
            try {
                var current = cloudflare.getSetting(zoneId, action.settingId());
                entry.put("currentValue", current.get("value"));
                entry.put("status", "ok");
            } catch (Exception e) {
                entry.put("currentValue", null);
                entry.put("status", "error");
                entry.put("error", e.getMessage());
            }
            results.add(entry);
        }
        return ResultHelper.jsonResult(results);
    }

    CallToolResult handleOnboardDomain(Map<String, Object> args) {
        String domain = ResultHelper.getString(args, "domain");
        boolean migrateRecords = ResultHelper.getBool(args, "migrateRecords", true);
        boolean applyProtection = ResultHelper.getBool(args, "applyProtection", true);

        var summary = new LinkedHashMap<String, Object>();
        summary.put("domain", domain);

        // 1. Check zone doesn't already exist
        var existing = cloudflare.getZoneByName(domain);
        if (existing != null) {
            return ResultHelper.errorResult("Zone already exists in Cloudflare: " + domain
                    + " (id: " + existing.get("id") + ", status: " + existing.get("status") + ")");
        }

        // 2. Get DNS from Namecheap
        List<Map<String, Object>> ncRecords;
        try {
            ncRecords = namecheap.getDnsHostsByDomain(domain);
            summary.put("namecheapRecordsFound", ncRecords.size());
        } catch (Exception e) {
            return ResultHelper.errorResult("Failed to fetch Namecheap DNS for " + domain + ": " + e.getMessage());
        }

        // 3. Create zone in Cloudflare
        Map<String, Object> zone;
        try {
            zone = cloudflare.createZone(domain);
            summary.put("zoneId", zone.get("id"));
            summary.put("status", zone.get("status"));
            summary.put("nameservers", zone.get("nameServers"));
        } catch (Exception e) {
            return ResultHelper.errorResult("Failed to create Cloudflare zone: " + e.getMessage());
        }

        String zoneId = (String) zone.get("id");

        // 4. Migrate DNS records
        if (migrateRecords) {
            var conversion = DnsRecordMapper.convertAll(ncRecords, domain);
            int created = 0;
            var errors = new ArrayList<String>();
            for (var cfRecord : conversion.mapped()) {
                try {
                    cloudflare.createDnsRecord(zoneId,
                            (String) cfRecord.get("type"),
                            (String) cfRecord.get("name"),
                            (String) cfRecord.get("content"),
                            (Boolean) cfRecord.get("proxied"),
                            ((Number) cfRecord.get("ttl")).intValue(),
                            cfRecord.containsKey("priority") ? ((Number) cfRecord.get("priority")).intValue() : null);
                    created++;
                } catch (Exception e) {
                    errors.add(cfRecord.get("type") + " " + cfRecord.get("name") + ": " + e.getMessage());
                }
            }
            summary.put("recordsMigrated", created);
            summary.put("recordsSkipped", conversion.skipped().size());
            if (!errors.isEmpty()) summary.put("migrationErrors", errors);
        }

        // 5. Update nameservers at Namecheap
        @SuppressWarnings("unchecked")
        var cfNameservers = (List<String>) zone.get("nameServers");
        if (cfNameservers != null && !cfNameservers.isEmpty()) {
            try {
                namecheap.setNameserversByDomain(domain, cfNameservers);
                summary.put("nameserversUpdated", true);
            } catch (Exception e) {
                summary.put("nameserversUpdated", false);
                summary.put("nameserverError", e.getMessage());
            }
        }

        // 6. Apply protection
        if (applyProtection) {
            var protectionResult = applyProtectionSettings(zoneId);
            summary.put("protectionApplied", protectionResult.get("applied"));
            summary.put("protectionFailed", protectionResult.get("failed"));
            if (protectionResult.containsKey("errors")) {
                summary.put("protectionErrors", protectionResult.get("errors"));
            }
        }

        return ResultHelper.jsonResult(summary);
    }

    CallToolResult handleMigrateDns(Map<String, Object> args) {
        String domain = ResultHelper.getString(args, "domain");

        var zone = cloudflare.getZoneByName(domain);
        if (zone == null) return ResultHelper.errorResult("Zone not found in Cloudflare: " + domain);
        String zoneId = (String) zone.get("id");

        List<Map<String, Object>> ncRecords;
        try {
            ncRecords = namecheap.getDnsHostsByDomain(domain);
        } catch (Exception e) {
            return ResultHelper.errorResult("Failed to fetch Namecheap DNS: " + e.getMessage());
        }

        var conversion = DnsRecordMapper.convertAll(ncRecords, domain);
        int created = 0;
        var errors = new ArrayList<String>();
        for (var cfRecord : conversion.mapped()) {
            try {
                cloudflare.createDnsRecord(zoneId,
                        (String) cfRecord.get("type"),
                        (String) cfRecord.get("name"),
                        (String) cfRecord.get("content"),
                        (Boolean) cfRecord.get("proxied"),
                        ((Number) cfRecord.get("ttl")).intValue(),
                        cfRecord.containsKey("priority") ? ((Number) cfRecord.get("priority")).intValue() : null);
                created++;
            } catch (Exception e) {
                errors.add(cfRecord.get("type") + " " + cfRecord.get("name") + ": " + e.getMessage());
            }
        }

        var result = new LinkedHashMap<String, Object>();
        result.put("domain", domain);
        result.put("recordsMigrated", created);
        result.put("recordsSkipped", conversion.skipped().size());
        if (!errors.isEmpty()) result.put("errors", errors);
        return ResultHelper.jsonResult(result);
    }

    CallToolResult handleApplyProtection(Map<String, Object> args) {
        String domain = ResultHelper.getString(args, "domain");

        var zone = cloudflare.getZoneByName(domain);
        if (zone == null) return ResultHelper.errorResult("Zone not found in Cloudflare: " + domain);
        String zoneId = (String) zone.get("id");

        var result = applyProtectionSettings(zoneId);
        result.put("domain", domain);
        return ResultHelper.jsonResult(result);
    }

    // --- Internal helpers ---

    private Map<String, Object> applyProtectionSettings(String zoneId) {
        int applied = 0;
        int failed = 0;
        var errors = new ArrayList<String>();

        for (var action : ProtectionSettings.allActions()) {
            try {
                if (action.isCustomEndpoint()) {
                    switch (action.name()) {
                        case "dnssec" -> cloudflare.enableDnssec(zoneId);
                        case "bot_fight_mode", "ddos_managed_rulesets" -> {
                            // Auto-enabled on free tier, no API action needed
                            applied++;
                            continue;
                        }
                        default -> {
                            log.warn("Unknown custom endpoint: {}", action.name());
                            continue;
                        }
                    }
                } else {
                    cloudflare.updateSetting(zoneId, action.settingId(), action.value());
                }
                applied++;
            } catch (Exception e) {
                failed++;
                errors.add(action.name() + ": " + e.getMessage());
            }
        }

        var result = new LinkedHashMap<String, Object>();
        result.put("applied", applied);
        result.put("failed", failed);
        if (!errors.isEmpty()) result.put("errors", errors);
        return result;
    }

    // --- Schema helpers ---

    private static SyncToolSpecification spec(String name, String description,
                                               JsonSchema inputSchema, ToolAnnotations annotations,
                                               java.util.function.Function<Map<String, Object>, CallToolResult> handler) {
        var tool = Tool.builder()
                .name(name)
                .description(description)
                .inputSchema(inputSchema)
                .annotations(annotations)
                .build();
        return SyncToolSpecification.builder()
                .tool(tool)
                .callHandler((exchange, request) -> handler.apply(
                        request.arguments() != null ? request.arguments() : Map.of()))
                .build();
    }

    private static JsonSchema noParams() {
        return new JsonSchema("object", Map.of(), List.of(), false, null, null);
    }

    private static JsonSchema domainSchema() {
        return schema(Map.of("domain", stringProp("Domain name (e.g. example.com)")),
                List.of("domain"));
    }

    private static JsonSchema schema(Map<String, Object> properties, List<String> required) {
        return new JsonSchema("object", properties, required, false, null, null);
    }

    private static Map<String, Object> stringProp(String description) {
        return Map.of("type", "string", "description", description);
    }

    private static Map<String, Object> intProp(String description) {
        return Map.of("type", "integer", "description", description);
    }

    private static Map<String, Object> boolProp(String description) {
        return Map.of("type", "boolean", "description", description);
    }

    private static ToolAnnotations readOnly() {
        return new ToolAnnotations(null, true, false, null, null, null);
    }

    private static ToolAnnotations destructive() {
        return new ToolAnnotations(null, false, true, null, null, null);
    }
}
