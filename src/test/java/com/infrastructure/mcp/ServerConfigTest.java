package com.infrastructure.mcp;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class ServerConfigTest {

    @Test
    void parsesApiTokenAuth() {
        ServerConfig config = ServerConfig.fromEnv(
                "cf-token-123", null, null,
                "cf-account-456",
                "nc-user", "nc-key-789", "1.2.3.4",
                "/custom/registry.json", "/usr/local/bin/fleet"
        );

        assertEquals("cf-token-123", config.cloudflareApiToken());
        assertNull(config.cloudflareApiKey());
        assertNull(config.cloudflareEmail());
        assertEquals("cf-account-456", config.cloudflareAccountId());
        assertTrue(config.isApiTokenAuth());
    }

    @Test
    void parsesGlobalApiKeyAuth() {
        ServerConfig config = ServerConfig.fromEnv(
                null, "cf-global-key", "matt@example.com",
                "cf-account-456",
                "nc-user", "nc-key-789", "1.2.3.4",
                null, null
        );

        assertNull(config.cloudflareApiToken());
        assertEquals("cf-global-key", config.cloudflareApiKey());
        assertEquals("matt@example.com", config.cloudflareEmail());
        assertFalse(config.isApiTokenAuth());
    }

    @Test
    void defaultsForOptionalValues() {
        ServerConfig config = ServerConfig.fromEnv(
                "cf-token", null, null,
                "cf-account",
                "nc-user", "nc-key", "10.0.0.1",
                null, null
        );

        assertEquals("/home/matt/fleet/data/registry.json", config.fleetRegistryPath());
        assertEquals("fleet", config.fleetBinary());
    }

    @Test
    void throwsWhenNoCloudflareAuth() {
        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                ServerConfig.fromEnv(null, null, null,
                        "cf-account", "nc-user", "nc-key", "1.2.3.4", null, null)
        );
        assertTrue(ex.getMessage().contains("CLOUDFLARE_API_TOKEN or CLOUDFLARE_API_KEY"));
    }

    @Test
    void throwsWhenGlobalKeyWithoutEmail() {
        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                ServerConfig.fromEnv(null, "cf-key", null,
                        "cf-account", "nc-user", "nc-key", "1.2.3.4", null, null)
        );
        assertTrue(ex.getMessage().contains("CLOUDFLARE_EMAIL"));
    }

    @Test
    void throwsOnMissingAccountId() {
        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                ServerConfig.fromEnv("cf-token", null, null,
                        null, "nc-user", "nc-key", "1.2.3.4", null, null)
        );
        assertTrue(ex.getMessage().contains("CLOUDFLARE_ACCOUNT_ID"));
    }

    @Test
    void throwsOnMissingNamecheapApiKey() {
        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                ServerConfig.fromEnv("cf-token", null, null,
                        "cf-account", "nc-user", null, "1.2.3.4", null, null)
        );
        assertTrue(ex.getMessage().contains("NAMECHEAP_API_KEY"));
    }

    @Test
    void apiTokenTakesPrecedenceOverGlobalKey() {
        ServerConfig config = ServerConfig.fromEnv(
                "cf-token", "cf-key", "email@example.com",
                "cf-account",
                "nc-user", "nc-key", "1.2.3.4",
                null, null
        );

        assertTrue(config.isApiTokenAuth());
    }
}
