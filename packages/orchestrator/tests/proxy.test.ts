// packages/orchestrator/tests/proxy.test.ts

import { describe, it, expect, vi } from "vitest";
import { ProviderProxy } from "../src/proxy.js";
import { ProviderClient } from "../src/mcp-client.js";
import { InfraConfig, McpToolDefinition } from "@infrastructure-mcp/shared";

const defaultSchema: Record<string, unknown> = { type: "object", properties: {} };

function mockClient(name: string, tools: McpToolDefinition[]): ProviderClient {
  return {
    name,
    connect: vi.fn().mockResolvedValue(undefined),
    listTools: vi.fn().mockResolvedValue(tools),
    callTool: vi.fn().mockResolvedValue({ content: "ok", isError: false }),
    isConnected: vi.fn().mockReturnValue(true),
    disconnect: vi.fn().mockResolvedValue(undefined),
  };
}

function toolDef(name: string, description: string): McpToolDefinition {
  return { name, description, inputSchema: defaultSchema };
}

describe("ProviderProxy", () => {
  it("starts all providers and registers tools", async () => {
    const cfClient = mockClient("cloudflare", [
      toolDef("list_zones", "List zones"),
    ]);
    const ncClient = mockClient("namecheap", [
      toolDef("list_domains", "List domains"),
    ]);

    const clientFactory = vi.fn()
      .mockReturnValueOnce(cfClient)
      .mockReturnValueOnce(ncClient);

    const config: InfraConfig = {
      providers: [
        { name: "cloudflare", command: "cmd", roles: ["dns_host", "cdn", "security"] },
        { name: "namecheap", command: "cmd", roles: ["dns_registrar"] },
      ],
      workflows: {},
      tui: { experienceLevel: "professional" },
    };

    const proxy = new ProviderProxy(config, clientFactory);
    await proxy.startAll();

    expect(cfClient.connect).toHaveBeenCalled();
    expect(ncClient.connect).toHaveBeenCalled();
    expect(cfClient.listTools).toHaveBeenCalled();
    expect(ncClient.listTools).toHaveBeenCalled();

    const tools = proxy.getAllTools();
    const names = tools.map((t) => t.name);
    expect(names).toContain("cloudflare.list_zones");
    expect(names).toContain("namecheap.list_domains");
  });

  it("proxies full tool schemas including inputSchema", async () => {
    const schema = { type: "object", properties: { page: { type: "number" } }, required: ["page"] };
    const cfClient = mockClient("cloudflare", [
      { name: "list_zones", description: "List zones", inputSchema: schema },
    ]);

    const clientFactory = vi.fn().mockReturnValue(cfClient);

    const config: InfraConfig = {
      providers: [
        { name: "cloudflare", command: "cmd", roles: ["dns_host", "cdn", "security"] },
      ],
      workflows: {},
      tui: { experienceLevel: "professional" },
    };

    const proxy = new ProviderProxy(config, clientFactory);
    await proxy.startAll();

    const tools = proxy.getAllTools();
    const cfTool = tools.find((t) => t.name === "cloudflare.list_zones");
    expect(cfTool).toBeDefined();
    expect(cfTool!.inputSchema).toEqual(schema);
  });

  it("routes tool calls to correct provider", async () => {
    const cfClient = mockClient("cloudflare", [
      toolDef("list_zones", "List zones"),
    ]);

    const clientFactory = vi.fn().mockReturnValue(cfClient);

    const config: InfraConfig = {
      providers: [
        { name: "cloudflare", command: "cmd", roles: ["dns_host", "cdn", "security"] },
      ],
      workflows: {},
      tui: { experienceLevel: "professional" },
    };

    const proxy = new ProviderProxy(config, clientFactory);
    await proxy.startAll();
    await proxy.callTool("cloudflare.list_zones", { page: 1 });

    expect(cfClient.callTool).toHaveBeenCalledWith("list_zones", { page: 1 });
  });

  it("routes role-aliased tool calls to correct provider", async () => {
    const cfClient = mockClient("cloudflare", [
      toolDef("list_zones", "List zones"),
    ]);

    const clientFactory = vi.fn().mockReturnValue(cfClient);

    const config: InfraConfig = {
      providers: [
        { name: "cloudflare", command: "cmd", roles: ["dns_host", "cdn", "security"] },
      ],
      workflows: {},
      tui: { experienceLevel: "professional" },
    };

    const proxy = new ProviderProxy(config, clientFactory);
    await proxy.startAll();
    await proxy.callTool("dns_host.list_zones", {});

    expect(cfClient.callTool).toHaveBeenCalledWith("list_zones", {});
  });

  it("returns error for unknown tool", async () => {
    const clientFactory = vi.fn().mockReturnValue(
      mockClient("cf", [toolDef("list_zones", "List")])
    );

    const config: InfraConfig = {
      providers: [{ name: "cf", command: "cmd", roles: ["dns_host", "cdn", "security"] }],
      workflows: {},
      tui: { experienceLevel: "professional" },
    };

    const proxy = new ProviderProxy(config, clientFactory);
    await proxy.startAll();

    const result = await proxy.callTool("unknown.tool", {});
    expect(result.isError).toBe(true);
    expect(result.content).toContain("unknown.tool");
  });

  it("skips optional providers that fail to connect", async () => {
    const failingClient: ProviderClient = {
      name: "fleet",
      connect: vi.fn().mockRejectedValue(new Error("spawn failed")),
      listTools: vi.fn(),
      callTool: vi.fn(),
      isConnected: vi.fn().mockReturnValue(false),
      disconnect: vi.fn(),
    };

    const goodClient = mockClient("cloudflare", [
      toolDef("list_zones", "List zones"),
    ]);

    const clientFactory = vi.fn()
      .mockReturnValueOnce(goodClient)
      .mockReturnValueOnce(failingClient);

    const config: InfraConfig = {
      providers: [
        { name: "cloudflare", command: "cmd", roles: ["dns_host", "cdn", "security"] },
        { name: "fleet", command: "cmd", roles: ["app_platform"], optional: true },
      ],
      workflows: {},
      tui: { experienceLevel: "professional" },
    };

    const proxy = new ProviderProxy(config, clientFactory);
    await proxy.startAll();

    const tools = proxy.getAllTools();
    const names = tools.map((t) => t.name);
    expect(names).toContain("cloudflare.list_zones");
    expect(names).not.toContain("fleet.");
  });

  it("throws when required provider fails to connect", async () => {
    const failingClient: ProviderClient = {
      name: "cloudflare",
      connect: vi.fn().mockRejectedValue(new Error("spawn failed")),
      listTools: vi.fn(),
      callTool: vi.fn(),
      isConnected: vi.fn().mockReturnValue(false),
      disconnect: vi.fn(),
    };

    const clientFactory = vi.fn().mockReturnValue(failingClient);

    const config: InfraConfig = {
      providers: [
        { name: "cloudflare", command: "cmd", roles: ["dns_host", "cdn", "security"] },
      ],
      workflows: {},
      tui: { experienceLevel: "professional" },
    };

    const proxy = new ProviderProxy(config, clientFactory);
    await expect(proxy.startAll()).rejects.toThrow("cloudflare");
  });

  it("returns provider statuses", async () => {
    const cfClient = mockClient("cloudflare", [
      toolDef("list_zones", "List zones"),
    ]);

    const clientFactory = vi.fn().mockReturnValue(cfClient);

    const config: InfraConfig = {
      providers: [
        { name: "cloudflare", command: "cmd", roles: ["dns_host", "cdn", "security"] },
      ],
      workflows: {},
      tui: { experienceLevel: "professional" },
    };

    const proxy = new ProviderProxy(config, clientFactory);
    await proxy.startAll();

    const statuses = proxy.getStatuses();
    expect(statuses).toHaveLength(1);
    expect(statuses[0].name).toBe("cloudflare");
    expect(statuses[0].connected).toBe(true);
    expect(statuses[0].toolCount).toBe(1);
    expect(statuses[0].roles).toEqual(["dns_host", "cdn", "security"]);
  });

  it("disconnects all providers on shutdown", async () => {
    const cfClient = mockClient("cloudflare", []);
    const ncClient = mockClient("namecheap", []);

    const clientFactory = vi.fn()
      .mockReturnValueOnce(cfClient)
      .mockReturnValueOnce(ncClient);

    const config: InfraConfig = {
      providers: [
        { name: "cloudflare", command: "cmd", roles: ["dns_host", "cdn", "security"] },
        { name: "namecheap", command: "cmd", roles: ["dns_registrar"] },
      ],
      workflows: {},
      tui: { experienceLevel: "professional" },
    };

    const proxy = new ProviderProxy(config, clientFactory);
    await proxy.startAll();
    await proxy.shutdownAll();

    expect(cfClient.disconnect).toHaveBeenCalled();
    expect(ncClient.disconnect).toHaveBeenCalled();
  });
});
