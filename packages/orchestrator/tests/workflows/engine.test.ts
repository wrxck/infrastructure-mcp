import { describe, it, expect, vi } from "vitest";
import { WorkflowEngine, WorkflowDefinition } from "../../src/workflows/engine.js";
import { CapabilityResolver } from "../../src/capability-resolver.js";
import { ProviderProxy } from "../../src/proxy.js";

function makeResolver(): CapabilityResolver {
  const resolver = new CapabilityResolver();
  resolver.registerProvider("cf", ["dns_host", "cdn", "security"], [
    { name: "create_zone", inputSchema: { type: "object" } },
    { name: "apply_protection", inputSchema: { type: "object" } },
  ]);
  resolver.registerProvider("nc", ["dns_registrar"], [
    { name: "get_dns_hosts", inputSchema: { type: "object" } },
    { name: "set_nameservers", inputSchema: { type: "object" } },
  ]);
  return resolver;
}

function makeProxy(): ProviderProxy {
  return {
    callTool: vi.fn().mockResolvedValue({ content: '{"ok":true}', isError: false }),
    getAllTools: vi.fn().mockReturnValue([]),
    startAll: vi.fn(),
    shutdownAll: vi.fn(),
    getStatuses: vi.fn().mockReturnValue([]),
    getProviderForRole: vi.fn(),
    getCapabilityResolver: vi.fn(),
  } as unknown as ProviderProxy;
}

describe("WorkflowEngine", () => {
  it("registers a workflow and lists it as a tool", () => {
    const engine = new WorkflowEngine(makeResolver(), makeProxy());
    const workflow: WorkflowDefinition = {
      name: "test_workflow",
      description: "A test workflow",
      parameters: { domain: { type: "string", description: "Domain" } },
      requiredParams: ["domain"],
      requirements: [{ role: "dns_host", pattern: "*create_zone*" }],
      execute: vi.fn(),
    };

    engine.register(workflow);
    const tools = engine.getTools();
    expect(tools).toHaveLength(1);
    expect(tools[0].name).toBe("test_workflow");
  });

  it("skips workflows with unmet requirements", () => {
    const resolver = new CapabilityResolver();
    const engine = new WorkflowEngine(resolver, makeProxy());

    engine.register({
      name: "test_workflow",
      description: "A test",
      parameters: {},
      requiredParams: [],
      requirements: [{ role: "dns_host", pattern: "*create_zone*" }],
      execute: vi.fn(),
    });

    expect(engine.getTools()).toHaveLength(0);
  });

  it("executes a workflow by calling its execute function", async () => {
    const resolver = makeResolver();
    const proxy = makeProxy();
    const executeFn = vi.fn().mockResolvedValue({ domain: "test.com", success: true });

    const engine = new WorkflowEngine(resolver, proxy);
    engine.register({
      name: "test_workflow",
      description: "Test",
      parameters: { domain: { type: "string", description: "Domain" } },
      requiredParams: ["domain"],
      requirements: [{ role: "dns_host", pattern: "*create_zone*" }],
      execute: executeFn,
    });

    const result = await engine.execute("test_workflow", { domain: "test.com" });
    expect(result.isError).toBe(false);
    expect(executeFn).toHaveBeenCalledWith(
      { domain: "test.com" },
      expect.objectContaining({ proxy, resolver })
    );
  });

  it("returns error for unknown workflow", async () => {
    const engine = new WorkflowEngine(makeResolver(), makeProxy());
    const result = await engine.execute("nonexistent", {});
    expect(result.isError).toBe(true);
    expect(result.content).toContain("nonexistent");
  });

  it("returns error when execute throws", async () => {
    const engine = new WorkflowEngine(makeResolver(), makeProxy());
    engine.register({
      name: "failing",
      description: "Fails",
      parameters: {},
      requiredParams: [],
      requirements: [],
      execute: vi.fn().mockRejectedValue(new Error("boom")),
    });

    const result = await engine.execute("failing", {});
    expect(result.isError).toBe(true);
    expect(result.content).toContain("boom");
  });
});
