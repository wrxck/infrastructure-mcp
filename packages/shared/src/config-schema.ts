// packages/shared/src/config-schema.ts

import { InfraConfig, LegacyConfig, ProviderConfig } from "./types.js";
import { REQUIRED_ROLES } from "./constants.js";

export function isLegacyConfig(obj: unknown): obj is LegacyConfig {
  if (obj === null || typeof obj !== "object") {
    return false;
  }
  const record = obj as Record<string, unknown>;
  return "jarPath" in record && "env" in record && !("providers" in record);
}

export function migrateLegacyConfig(legacy: LegacyConfig): InfraConfig {
  const providers: ProviderConfig[] = [];
  const env = legacy.env;

  // Cloudflare provider
  const cfEnv: Record<string, string> = {};
  const cfKeys = [
    "CLOUDFLARE_API_KEY",
    "CLOUDFLARE_EMAIL",
    "CLOUDFLARE_API_TOKEN",
    "CLOUDFLARE_ACCOUNT_ID",
  ];
  for (const key of cfKeys) {
    if (env[key]) {
      cfEnv[key] = env[key];
    }
  }
  if (Object.keys(cfEnv).length > 0) {
    providers.push({
      name: "cloudflare",
      command: "java",
      args: ["-jar", legacy.jarPath],
      env: cfEnv,
      roles: ["dns_host", "cdn", "security"],
    });
  }

  // Namecheap provider
  const ncEnv: Record<string, string> = {};
  const ncKeys = ["NAMECHEAP_API_USER", "NAMECHEAP_API_KEY", "NAMECHEAP_CLIENT_IP"];
  for (const key of ncKeys) {
    if (env[key]) {
      ncEnv[key] = env[key];
    }
  }
  if (Object.keys(ncEnv).length > 0) {
    providers.push({
      name: "namecheap",
      command: "java",
      args: ["-jar", legacy.jarPath],
      env: ncEnv,
      roles: ["dns_registrar"],
    });
  }

  // Fleet provider (optional)
  const fleetEnv: Record<string, string> = {};
  const fleetKeys = ["FLEET_REGISTRY_PATH", "FLEET_BINARY"];
  for (const key of fleetKeys) {
    if (env[key]) {
      fleetEnv[key] = env[key];
    }
  }
  if (Object.keys(fleetEnv).length > 0) {
    providers.push({
      name: "fleet",
      command: "fleet-mcp",
      env: fleetEnv,
      roles: ["app_platform"],
      optional: true,
    });
  }

  return {
    providers,
    workflows: {
      onboard_domain: { enabled: true },
      migrate_dns: { enabled: true },
      apply_protection: { enabled: true },
    },
    tui: {
      experienceLevel: legacy.experienceLevel,
    },
  };
}

export function validateConfig(config: InfraConfig): string[] {
  const errors: string[] = [];

  if (!config.providers || config.providers.length === 0) {
    errors.push("No providers configured");
    return errors;
  }

  // Check for duplicate provider names
  const names = new Set<string>();
  for (const provider of config.providers) {
    if (names.has(provider.name)) {
      errors.push(`duplicate provider name: '${provider.name}'`);
    }
    names.add(provider.name);
  }

  // Check each provider has command and roles
  for (const provider of config.providers) {
    if (!provider.command) {
      errors.push(`Provider '${provider.name}' has no command`);
    }
    if (!provider.roles || provider.roles.length === 0) {
      errors.push(`Provider '${provider.name}' has no roles`);
    }
  }

  // Check required roles are filled
  const filledRoles = new Map<string, string>();
  for (const provider of config.providers) {
    for (const role of provider.roles) {
      if (filledRoles.has(role)) {
        errors.push(
          `Role '${role}' is filled by both '${filledRoles.get(role)}' and '${provider.name}'`
        );
      } else {
        filledRoles.set(role, provider.name);
      }
    }
  }

  for (const role of REQUIRED_ROLES) {
    if (!filledRoles.has(role)) {
      errors.push(`Required role '${role}' is not filled by any provider`);
    }
  }

  return errors;
}
