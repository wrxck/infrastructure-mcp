package com.infrastructure.mcp;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class ServerConfigTest {

    @Test
    void parsesAllEnvVars() {
        ServerConfig config = ServerConfig.fromEnv(
                "cf-token-123",
                "cf-account-456",
                "nc-user",
                "nc-key-789",
                "1.2.3.4",
                "/custom/registry.json",
                "/usr/local/bin/fleet"
        );

        assertEquals("cf-token-123", config.cloudflareApiToken());
        assertEquals("cf-account-456", config.cloudflareAccountId());
        assertEquals("nc-user", config.namecheapApiUser());
        assertEquals("nc-key-789", config.namecheapApiKey());
        assertEquals("1.2.3.4", config.namecheapClientIp());
        assertEquals("/custom/registry.json", config.fleetRegistryPath());
        assertEquals("/usr/local/bin/fleet", config.fleetBinary());
    }

    @Test
    void defaultsForOptionalValues() {
        ServerConfig config = ServerConfig.fromEnv(
                "cf-token",
                "cf-account",
                "nc-user",
                "nc-key",
                "10.0.0.1",
                null,
                null
        );

        assertEquals("/home/matt/fleet/data/registry.json", config.fleetRegistryPath());
        assertEquals("fleet", config.fleetBinary());
    }

    @Test
    void throwsOnMissingCloudflareToken() {
        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                ServerConfig.fromEnv(null, "cf-account", "nc-user", "nc-key", "1.2.3.4", null, null)
        );
        assertTrue(ex.getMessage().contains("CLOUDFLARE_API_TOKEN"),
                "Exception message should mention CLOUDFLARE_API_TOKEN");
    }

    @Test
    void throwsOnMissingNamecheapApiKey() {
        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                ServerConfig.fromEnv("cf-token", "cf-account", "nc-user", null, "1.2.3.4", null, null)
        );
        assertTrue(ex.getMessage().contains("NAMECHEAP_API_KEY"),
                "Exception message should mention NAMECHEAP_API_KEY");
    }
}
