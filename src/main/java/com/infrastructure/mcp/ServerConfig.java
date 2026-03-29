package com.infrastructure.mcp;

/**
 * Holds all server configuration, sourced from environment variables.
 * Supports two Cloudflare auth modes: API Token (Bearer) or Global API Key (X-Auth-Key + X-Auth-Email).
 */
public record ServerConfig(
        String cloudflareApiToken,
        String cloudflareApiKey,
        String cloudflareEmail,
        String cloudflareAccountId,
        String namecheapApiUser,
        String namecheapApiKey,
        String namecheapClientIp,
        String fleetRegistryPath,
        String fleetBinary
) {

    private static final String DEFAULT_FLEET_REGISTRY_PATH = "/home/matt/fleet/data/registry.json";
    private static final String DEFAULT_FLEET_BINARY = "fleet";

    /** True if using scoped API Token auth, false if using Global API Key. */
    public boolean isApiTokenAuth() {
        return cloudflareApiToken != null && !cloudflareApiToken.isBlank();
    }

    /**
     * Factory method for explicit values — primarily for testing.
     */
    public static ServerConfig fromEnv(
            String cloudflareApiToken,
            String cloudflareApiKey,
            String cloudflareEmail,
            String cloudflareAccountId,
            String namecheapApiUser,
            String namecheapApiKey,
            String namecheapClientIp,
            String fleetRegistryPath,
            String fleetBinary
    ) {
        boolean hasToken = cloudflareApiToken != null && !cloudflareApiToken.isBlank();
        boolean hasKey = cloudflareApiKey != null && !cloudflareApiKey.isBlank();

        if (!hasToken && !hasKey) {
            throw new IllegalStateException(
                    "Either CLOUDFLARE_API_TOKEN or CLOUDFLARE_API_KEY + CLOUDFLARE_EMAIL must be set");
        }
        if (hasKey && (cloudflareEmail == null || cloudflareEmail.isBlank())) {
            throw new IllegalStateException(
                    "CLOUDFLARE_EMAIL is required when using CLOUDFLARE_API_KEY (Global API Key auth)");
        }

        requirePresent(cloudflareAccountId, "CLOUDFLARE_ACCOUNT_ID");
        requirePresent(namecheapApiUser, "NAMECHEAP_API_USER");
        requirePresent(namecheapApiKey, "NAMECHEAP_API_KEY");
        requirePresent(namecheapClientIp, "NAMECHEAP_CLIENT_IP");

        return new ServerConfig(
                hasToken ? cloudflareApiToken : null,
                hasKey ? cloudflareApiKey : null,
                hasKey ? cloudflareEmail : null,
                cloudflareAccountId,
                namecheapApiUser,
                namecheapApiKey,
                namecheapClientIp,
                fleetRegistryPath != null ? fleetRegistryPath : DEFAULT_FLEET_REGISTRY_PATH,
                fleetBinary != null ? fleetBinary : DEFAULT_FLEET_BINARY
        );
    }

    /**
     * Factory method that reads configuration from {@link System#getenv()}.
     */
    public static ServerConfig fromSystem() {
        return fromEnv(
                System.getenv("CLOUDFLARE_API_TOKEN"),
                System.getenv("CLOUDFLARE_API_KEY"),
                System.getenv("CLOUDFLARE_EMAIL"),
                System.getenv("CLOUDFLARE_ACCOUNT_ID"),
                System.getenv("NAMECHEAP_API_USER"),
                System.getenv("NAMECHEAP_API_KEY"),
                System.getenv("NAMECHEAP_CLIENT_IP"),
                System.getenv("FLEET_REGISTRY_PATH"),
                System.getenv("FLEET_BINARY")
        );
    }

    private static void requirePresent(String value, String envVarName) {
        if (value == null || value.isBlank()) {
            throw new IllegalStateException(
                    "Required environment variable " + envVarName + " is missing or blank");
        }
    }
}
