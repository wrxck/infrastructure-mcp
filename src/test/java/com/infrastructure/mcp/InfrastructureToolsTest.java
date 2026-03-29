package com.infrastructure.mcp;

import io.modelcontextprotocol.server.McpServerFeatures.SyncToolSpecification;
import org.junit.jupiter.api.Test;

import java.util.HashSet;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class InfrastructureToolsTest {

    private static ServerConfig testConfig() {
        return ServerConfig.fromEnv(
                "test-cf-token", null, null,
                "test-cf-account",
                "test-nc-user", "test-nc-key", "127.0.0.1",
                "/tmp/nonexistent-registry.json", "/usr/bin/false");
    }

    @Test
    void toolSpecsReturnsExpectedCount() {
        var tools = new InfrastructureTools(testConfig());
        List<SyncToolSpecification> specs = tools.toolSpecs();
        assertEquals(12, specs.size());
    }

    @Test
    void toolNamesAreUnique() {
        var tools = new InfrastructureTools(testConfig());
        var names = new HashSet<String>();
        for (var spec : tools.toolSpecs()) {
            assertTrue(names.add(spec.tool().name()),
                    "Duplicate tool name: " + spec.tool().name());
        }
    }

    @Test
    void allToolsHaveDescriptions() {
        var tools = new InfrastructureTools(testConfig());
        for (var spec : tools.toolSpecs()) {
            assertNotNull(spec.tool().description(),
                    "Tool missing description: " + spec.tool().name());
            assertFalse(spec.tool().description().isBlank(),
                    "Tool has blank description: " + spec.tool().name());
        }
    }

    @Test
    void allToolsHaveAnnotations() {
        var tools = new InfrastructureTools(testConfig());
        for (var spec : tools.toolSpecs()) {
            assertNotNull(spec.tool().annotations(),
                    "Tool missing annotations: " + spec.tool().name());
        }
    }

    @Test
    void fleetListAppsReturnsEmptyForMissingRegistry() {
        var tools = new InfrastructureTools(testConfig());
        var result = tools.handleFleetListApps(java.util.Map.of());
        assertNotNull(result);
        assertFalse(result.isError() != null && result.isError());
    }

    @Test
    void fleetListDomainsReturnsEmptyForMissingRegistry() {
        var tools = new InfrastructureTools(testConfig());
        var result = tools.handleFleetListDomains(java.util.Map.of());
        assertNotNull(result);
        assertFalse(result.isError() != null && result.isError());
    }

    @Test
    void readOnlyToolsAreMarkedCorrectly() {
        var tools = new InfrastructureTools(testConfig());
        var readOnlyTools = List.of("fleet_list_apps", "fleet_list_domains",
                "namecheap_list_domains", "namecheap_get_dns", "namecheap_get_nameservers",
                "cloudflare_list_zones", "cloudflare_get_dns", "cloudflare_get_protection_status");

        for (var spec : tools.toolSpecs()) {
            if (readOnlyTools.contains(spec.tool().name())) {
                assertTrue(spec.tool().annotations().readOnlyHint(),
                        spec.tool().name() + " should be read-only");
            }
        }
    }

    @Test
    void destructiveToolsAreMarkedCorrectly() {
        var tools = new InfrastructureTools(testConfig());
        var destructiveTools = List.of("fleet_run_command", "onboard_domain",
                "migrate_dns", "apply_protection");

        for (var spec : tools.toolSpecs()) {
            if (destructiveTools.contains(spec.tool().name())) {
                assertTrue(spec.tool().annotations().destructiveHint(),
                        spec.tool().name() + " should be destructive");
            }
        }
    }
}
