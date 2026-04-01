// packages/shared/tests/roles.test.ts

import { describe, it, expect } from "vitest";
import { matchesPattern, suggestRoles, validateCapabilities } from "../src/roles.js";

describe("matchesPattern", () => {
  it("matches wildcard at both ends", () => {
    expect(matchesPattern("cloudflare_list_zones", "*list_zones*")).toBe(true);
  });

  it("matches wildcard at start only", () => {
    expect(matchesPattern("my_list_zones", "*list_zones")).toBe(true);
  });

  it("matches wildcard at end only", () => {
    expect(matchesPattern("list_zones_all", "list_zones*")).toBe(true);
  });

  it("rejects non-matching name", () => {
    expect(matchesPattern("create_record", "*list_zones*")).toBe(false);
  });

  it("matches exact name with wildcards", () => {
    expect(matchesPattern("list_zones", "*list_zones*")).toBe(true);
  });
});

describe("suggestRoles", () => {
  it("suggests dns_host for zone-related tools", () => {
    const tools = ["list_zones", "create_zone", "get_dns", "create_dns"];
    const roles = suggestRoles(tools);
    expect(roles).toContain("dns_host");
  });

  it("suggests dns_registrar for domain-related tools", () => {
    const tools = ["list_domains", "get_nameservers", "set_nameservers"];
    const roles = suggestRoles(tools);
    expect(roles).toContain("dns_registrar");
  });

  it("suggests multiple roles when tools span categories", () => {
    const tools = [
      "list_zones", "create_zone", "get_dns", "create_dns",
      "get_waf_rules", "update_ssl",
      "cache_purge",
    ];
    const roles = suggestRoles(tools);
    expect(roles).toContain("dns_host");
    expect(roles).toContain("security");
    expect(roles).toContain("cdn");
  });

  it("returns empty array for unrecognized tools", () => {
    const roles = suggestRoles(["do_something", "other_thing"]);
    expect(roles).toEqual([]);
  });

  it("suggests app_platform for deploy tools", () => {
    const roles = suggestRoles(["list_apps", "deploy_app"]);
    expect(roles).toContain("app_platform");
  });
});

describe("validateCapabilities", () => {
  it("returns no warnings when all patterns match", () => {
    const tools = ["list_zones", "create_zone", "get_dns", "create_dns"];
    const warnings = validateCapabilities(tools, ["dns_host"]);
    expect(warnings).toEqual([]);
  });

  it("warns when no patterns match for a declared role", () => {
    const tools = ["unrelated_tool"];
    const warnings = validateCapabilities(tools, ["dns_host"]);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("dns_host");
    expect(warnings[0]).toContain("no tools match");
  });

  it("does not warn when at least one pattern matches", () => {
    const tools = ["list_zones"];
    const warnings = validateCapabilities(tools, ["dns_host"]);
    expect(warnings).toEqual([]);
  });

  it("warns about unknown roles", () => {
    const warnings = validateCapabilities([], ["not_a_role" as any]);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("Unknown role");
  });
});
