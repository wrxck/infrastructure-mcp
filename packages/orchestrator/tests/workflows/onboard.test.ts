import { describe, it, expect, vi } from "vitest";
import { onboardWorkflow } from "../../src/workflows/onboard.js";
import { CapabilityResolver } from "../../src/capability-resolver.js";
import { ProviderProxy } from "../../src/proxy.js";

function makeResolver(): CapabilityResolver {
  const resolver = new CapabilityResolver();
  resolver.registerProvider("cf", ["dns_host", "cdn", "security"], [
    { name: "create_zone", inputSchema: { type: "object" } },
    { name: "get_dns_records", inputSchema: { type: "object" } },
    { name: "create_dns_record", inputSchema: { type: "object" } },
    { name: "apply_protection", inputSchema: { type: "object" } },
    { name: "apply_cache_settings", inputSchema: { type: "object" } },
  ]);
  resolver.registerProvider("nc", ["dns_registrar"], [
    { name: "get_dns_hosts", inputSchema: { type: "object" } },
    { name: "set_nameservers", inputSchema: { type: "object" } },
    { name: "list_domains", inputSchema: { type: "object" } },
  ]);
  return resolver;
}

describe("onboardWorkflow", () => {
  it("has correct name and requirements", () => {
    expect(onboardWorkflow.name).toBe("onboard_domain");
    expect(onboardWorkflow.requirements.length).toBeGreaterThan(0);
    expect(onboardWorkflow.requiredParams).toContain("domain");
  });

  it("calls create_zone then get_dns then set_nameservers and protection", async () => {
    const resolver = makeResolver();
    const callTool = vi.fn()
      .mockResolvedValueOnce({ content: '{"id":"zone1","nameServers":["ns1.cf.com","ns2.cf.com"]}', isError: false })
      .mockResolvedValueOnce({ content: '[{"type":"A","name":"@","content":"1.2.3.4"}]', isError: false })
      .mockResolvedValueOnce({ content: '{"id":"rec1"}', isError: false })
      .mockResolvedValueOnce({ content: '{"success":true}', isError: false })
      .mockResolvedValueOnce({ content: '{"applied":5}', isError: false })
      .mockResolvedValueOnce({ content: '{"applied":3}', isError: false });

    const proxy = { callTool } as unknown as ProviderProxy;

    const result = await onboardWorkflow.execute(
      { domain: "example.com" },
      { proxy, resolver },
    );

    expect(result.domain).toBe("example.com");
    expect(result.zoneId).toBe("zone1");
    expect(callTool).toHaveBeenCalledWith("cf.create_zone", expect.objectContaining({ domain: "example.com" }));
  });

  it("stops and throws if create_zone fails", async () => {
    const resolver = makeResolver();
    const callTool = vi.fn()
      .mockResolvedValueOnce({ content: "Zone already exists", isError: true });

    const proxy = { callTool } as unknown as ProviderProxy;

    await expect(
      onboardWorkflow.execute({ domain: "example.com" }, { proxy, resolver })
    ).rejects.toThrow();
  });

  it("skips DNS migration when migrateRecords is false", async () => {
    const resolver = makeResolver();
    const callTool = vi.fn()
      .mockResolvedValueOnce({ content: '{"id":"zone1","nameServers":["ns1.cf.com"]}', isError: false })
      .mockResolvedValueOnce({ content: '{"applied":5}', isError: false })
      .mockResolvedValueOnce({ content: '{"applied":3}', isError: false });

    const proxy = { callTool } as unknown as ProviderProxy;

    const result = await onboardWorkflow.execute(
      { domain: "example.com", migrateRecords: false },
      { proxy, resolver },
    );

    expect(result.domain).toBe("example.com");
    // Should NOT have called get_dns or set_nameservers
    const calledTools = callTool.mock.calls.map((c: unknown[]) => c[0]);
    expect(calledTools).not.toContain("nc.get_dns_hosts");
    expect(calledTools).not.toContain("nc.set_nameservers");
  });
});
