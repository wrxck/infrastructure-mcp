// packages/orchestrator/tests/router.test.ts

import { describe, it, expect } from "vitest";
import { ToolRouter } from "../src/router.js";

describe("ToolRouter", () => {
  function makeRouter() {
    const router = new ToolRouter();

    router.registerProvider("cloudflare", ["dns_host", "cdn", "security"], [
      { name: "list_zones", description: "List zones" },
      { name: "create_zone", description: "Create zone" },
      { name: "get_protection_status", description: "Get protection status" },
    ]);

    router.registerProvider("namecheap", ["dns_registrar"], [
      { name: "list_domains", description: "List domains" },
      { name: "get_nameservers", description: "Get nameservers" },
    ]);

    return router;
  }

  describe("getAllTools", () => {
    it("returns provider-namespaced tools", () => {
      const router = makeRouter();
      const tools = router.getAllTools();
      const names = tools.map((t) => t.name);

      expect(names).toContain("cloudflare.list_zones");
      expect(names).toContain("cloudflare.create_zone");
      expect(names).toContain("namecheap.list_domains");
    });

    it("returns role-aliased tools", () => {
      const router = makeRouter();
      const tools = router.getAllTools();
      const names = tools.map((t) => t.name);

      expect(names).toContain("dns_host.list_zones");
      expect(names).toContain("dns_host.create_zone");
      expect(names).toContain("dns_registrar.list_domains");
    });

    it("does not duplicate when provider name equals role name", () => {
      const router = new ToolRouter();
      router.registerProvider("dns_host", ["dns_host"], [
        { name: "list_zones", description: "List zones" },
      ]);

      const tools = router.getAllTools();
      const names = tools.map((t) => t.name);
      const occurrences = names.filter((n) => n === "dns_host.list_zones");

      expect(occurrences).toHaveLength(1);
    });
  });

  describe("resolve", () => {
    it("resolves provider-namespaced tool to provider and original name", () => {
      const router = makeRouter();
      const result = router.resolve("cloudflare.list_zones");
      expect(result).toEqual({ provider: "cloudflare", toolName: "list_zones" });
    });

    it("resolves role-aliased tool to provider and original name", () => {
      const router = makeRouter();
      const result = router.resolve("dns_host.list_zones");
      expect(result).toEqual({ provider: "cloudflare", toolName: "list_zones" });
    });

    it("returns null for unknown tool", () => {
      const router = makeRouter();
      const result = router.resolve("unknown.tool");
      expect(result).toBeNull();
    });

    it("returns null for tool without namespace", () => {
      const router = makeRouter();
      const result = router.resolve("list_zones");
      expect(result).toBeNull();
    });
  });

  describe("getProviderForRole", () => {
    it("returns provider name for a filled role", () => {
      const router = makeRouter();
      expect(router.getProviderForRole("dns_host")).toBe("cloudflare");
      expect(router.getProviderForRole("dns_registrar")).toBe("namecheap");
    });

    it("returns null for unfilled role", () => {
      const router = makeRouter();
      expect(router.getProviderForRole("app_platform")).toBeNull();
    });
  });
});
