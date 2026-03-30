// packages/shared/tests/config-schema.test.ts

import { describe, it, expect } from "vitest";
import {
  isLegacyConfig,
  migrateLegacyConfig,
  validateConfig,
} from "../src/config-schema.js";
import { InfraConfig, LegacyConfig } from "../src/types.js";

describe("isLegacyConfig", () => {
  it("detects v1.2 format with jarPath and flat env", () => {
    const legacy = {
      jarPath: "/path/to/server.jar",
      env: { CLOUDFLARE_API_KEY: "key" },
      experienceLevel: "professional",
    };
    expect(isLegacyConfig(legacy)).toBe(true);
  });

  it("rejects v1.3 format with providers array", () => {
    const modern: InfraConfig = {
      providers: [],
      workflows: {},
      tui: { experienceLevel: "professional" },
    };
    expect(isLegacyConfig(modern)).toBe(false);
  });

  it("rejects null and non-objects", () => {
    expect(isLegacyConfig(null)).toBe(false);
    expect(isLegacyConfig("string")).toBe(false);
    expect(isLegacyConfig(42)).toBe(false);
  });
});

describe("migrateLegacyConfig", () => {
  it("creates cloudflare provider from CF env vars (global key)", () => {
    const legacy: LegacyConfig = {
      jarPath: "/path/to/jar",
      env: {
        CLOUDFLARE_API_KEY: "cfkey",
        CLOUDFLARE_EMAIL: "cf@test.com",
        CLOUDFLARE_ACCOUNT_ID: "acc123",
        NAMECHEAP_API_USER: "ncuser",
        NAMECHEAP_API_KEY: "nckey",
        NAMECHEAP_CLIENT_IP: "1.2.3.4",
      },
      experienceLevel: "professional",
    };

    const result = migrateLegacyConfig(legacy);
    expect(result.providers).toHaveLength(2);

    const cf = result.providers.find((p) => p.name === "cloudflare");
    expect(cf).toBeDefined();
    expect(cf!.roles).toEqual(["dns_host", "cdn", "security"]);
    expect(cf!.env).toEqual({
      CLOUDFLARE_API_KEY: "cfkey",
      CLOUDFLARE_EMAIL: "cf@test.com",
      CLOUDFLARE_ACCOUNT_ID: "acc123",
    });

    const nc = result.providers.find((p) => p.name === "namecheap");
    expect(nc).toBeDefined();
    expect(nc!.roles).toEqual(["dns_registrar"]);
    expect(nc!.env).toEqual({
      NAMECHEAP_API_USER: "ncuser",
      NAMECHEAP_API_KEY: "nckey",
      NAMECHEAP_CLIENT_IP: "1.2.3.4",
    });
  });

  it("creates cloudflare provider from CF env vars (api token)", () => {
    const legacy: LegacyConfig = {
      jarPath: "/path/to/jar",
      env: {
        CLOUDFLARE_API_TOKEN: "token123",
        CLOUDFLARE_ACCOUNT_ID: "acc123",
      },
      experienceLevel: "comfortable",
    };

    const result = migrateLegacyConfig(legacy);
    const cf = result.providers.find((p) => p.name === "cloudflare");
    expect(cf!.env).toEqual({
      CLOUDFLARE_API_TOKEN: "token123",
      CLOUDFLARE_ACCOUNT_ID: "acc123",
    });
  });

  it("creates optional fleet provider from FLEET env vars", () => {
    const legacy: LegacyConfig = {
      jarPath: "/path/to/jar",
      env: {
        FLEET_REGISTRY_PATH: "/fleet/registry.json",
        FLEET_BINARY: "/usr/bin/fleet",
      },
      experienceLevel: "professional",
    };

    const result = migrateLegacyConfig(legacy);
    const fleet = result.providers.find((p) => p.name === "fleet");
    expect(fleet).toBeDefined();
    expect(fleet!.roles).toEqual(["app_platform"]);
    expect(fleet!.optional).toBe(true);
  });

  it("preserves experience level in tui settings", () => {
    const legacy: LegacyConfig = {
      jarPath: "",
      env: {},
      experienceLevel: "learner",
    };
    const result = migrateLegacyConfig(legacy);
    expect(result.tui.experienceLevel).toBe("learner");
  });

  it("sets default workflows as enabled", () => {
    const legacy: LegacyConfig = {
      jarPath: "",
      env: {},
      experienceLevel: "professional",
    };
    const result = migrateLegacyConfig(legacy);
    expect(result.workflows.onboard_domain).toEqual({ enabled: true });
    expect(result.workflows.migrate_dns).toEqual({ enabled: true });
    expect(result.workflows.apply_protection).toEqual({ enabled: true });
  });
});

describe("validateConfig", () => {
  function validConfig(): InfraConfig {
    return {
      providers: [
        {
          name: "cloudflare",
          command: "java",
          args: ["-jar", "/path/to/cf.jar"],
          roles: ["dns_host", "cdn", "security"],
        },
        {
          name: "namecheap",
          command: "java",
          args: ["-jar", "/path/to/nc.jar"],
          roles: ["dns_registrar"],
        },
      ],
      workflows: { onboard_domain: { enabled: true } },
      tui: { experienceLevel: "professional" },
    };
  }

  it("accepts valid config with all required roles filled", () => {
    const errors = validateConfig(validConfig());
    expect(errors).toEqual([]);
  });

  it("rejects config with missing required role", () => {
    const config = validConfig();
    config.providers = config.providers.filter((p) => p.name !== "namecheap");
    const errors = validateConfig(config);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.includes("dns_registrar"))).toBe(true);
  });

  it("rejects config with duplicate role across providers", () => {
    const config = validConfig();
    config.providers.push({
      name: "other-dns",
      command: "other",
      roles: ["dns_host"],
    });
    const errors = validateConfig(config);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.includes("dns_host"))).toBe(true);
  });

  it("rejects config with duplicate provider names", () => {
    const config = validConfig();
    config.providers.push({
      name: "cloudflare",
      command: "other",
      roles: ["app_platform"],
    });
    const errors = validateConfig(config);
    expect(errors.some((e) => e.includes("duplicate"))).toBe(true);
  });

  it("allows missing app_platform (optional role)", () => {
    const config = validConfig();
    const errors = validateConfig(config);
    expect(errors).toEqual([]);
  });

  it("rejects config with empty providers array", () => {
    const config = validConfig();
    config.providers = [];
    const errors = validateConfig(config);
    expect(errors.length).toBeGreaterThan(0);
  });

  it("rejects provider with no command", () => {
    const config = validConfig();
    config.providers[0].command = "";
    const errors = validateConfig(config);
    expect(errors.some((e) => e.includes("command"))).toBe(true);
  });

  it("rejects provider with no roles", () => {
    const config = validConfig();
    config.providers[0].roles = [];
    const errors = validateConfig(config);
    expect(errors.some((e) => e.includes("roles"))).toBe(true);
  });
});
