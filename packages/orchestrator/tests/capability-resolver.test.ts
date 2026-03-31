import { describe, it, expect } from "vitest";
import { CapabilityResolver } from "../src/capability-resolver.js";
import { McpToolDefinition } from "@infrastructure-mcp/shared";

function tool(name: string): McpToolDefinition {
  return { name, description: name, inputSchema: { type: "object" } };
}

describe("CapabilityResolver", () => {
  it("resolves a capability to matching tool name", () => {
    const resolver = new CapabilityResolver();
    resolver.registerProvider("cloudflare", ["dns_host"], [
      tool("cloudflare_list_zones"),
      tool("cloudflare_create_zone"),
    ]);

    expect(resolver.resolve("dns_host", "*create_zone*")).toBe("cloudflare.cloudflare_create_zone");
    expect(resolver.resolve("dns_host", "*list_zones*")).toBe("cloudflare.cloudflare_list_zones");
  });

  it("returns null when no tool matches the capability", () => {
    const resolver = new CapabilityResolver();
    resolver.registerProvider("cf", ["dns_host"], [tool("list_zones")]);
    expect(resolver.resolve("dns_host", "*create_zone*")).toBeNull();
  });

  it("returns null for unfilled role", () => {
    const resolver = new CapabilityResolver();
    expect(resolver.resolve("dns_host", "*list_zones*")).toBeNull();
  });

  it("resolves across multiple providers", () => {
    const resolver = new CapabilityResolver();
    resolver.registerProvider("cloudflare", ["dns_host"], [tool("create_zone")]);
    resolver.registerProvider("namecheap", ["dns_registrar"], [tool("set_nameservers")]);

    expect(resolver.resolve("dns_host", "*create_zone*")).toBe("cloudflare.create_zone");
    expect(resolver.resolve("dns_registrar", "*set_nameservers*")).toBe("namecheap.set_nameservers");
  });

  it("checks if all required capabilities are available", () => {
    const resolver = new CapabilityResolver();
    resolver.registerProvider("cf", ["dns_host"], [tool("list_zones"), tool("create_zone")]);

    expect(resolver.hasAll([
      { role: "dns_host", pattern: "*create_zone*" },
      { role: "dns_host", pattern: "*list_zones*" },
    ])).toBe(true);
  });

  it("returns false when a required capability is missing", () => {
    const resolver = new CapabilityResolver();
    resolver.registerProvider("cf", ["dns_host"], [tool("list_zones")]);

    expect(resolver.hasAll([
      { role: "dns_host", pattern: "*create_zone*" },
      { role: "dns_host", pattern: "*list_zones*" },
    ])).toBe(false);
  });

  it("returns missing capabilities list", () => {
    const resolver = new CapabilityResolver();
    resolver.registerProvider("cf", ["dns_host"], [tool("list_zones")]);

    const missing = resolver.getMissing([
      { role: "dns_host", pattern: "*create_zone*" },
      { role: "dns_host", pattern: "*list_zones*" },
      { role: "dns_registrar", pattern: "*get_dns*" },
    ]);

    expect(missing).toHaveLength(2);
    expect(missing).toContainEqual({ role: "dns_host", pattern: "*create_zone*" });
    expect(missing).toContainEqual({ role: "dns_registrar", pattern: "*get_dns*" });
  });
});
