// packages/orchestrator/tests/mcp-client.test.ts

import { describe, it, expect, vi, beforeEach } from "vitest";

const mockConnect = vi.fn();
const mockClose = vi.fn();
const mockListTools = vi.fn();
const mockCallTool = vi.fn();

vi.mock("@modelcontextprotocol/sdk/client/index.js", () => ({
  Client: vi.fn().mockImplementation(() => ({
    connect: mockConnect,
    close: mockClose,
    listTools: mockListTools,
    callTool: mockCallTool,
  })),
}));

vi.mock("@modelcontextprotocol/sdk/client/stdio.js", () => {
  const StdioClientTransport = vi.fn().mockImplementation(() => ({
    onclose: null,
    onerror: null,
  }));
  return { StdioClientTransport };
});

import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { createProviderClient } from "../src/mcp-client.js";

beforeEach(() => {
  vi.clearAllMocks();
  mockConnect.mockResolvedValue(undefined);
  mockClose.mockResolvedValue(undefined);
});

describe("createProviderClient", () => {
  it("creates transport with correct command, args, and env", async () => {
    const client = createProviderClient({
      name: "test-provider",
      command: "my-server",
      args: ["--flag"],
      env: { API_KEY: "secret" },
      roles: ["dns_host"],
    });

    await client.connect();

    expect(StdioClientTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        command: "my-server",
        args: ["--flag"],
        env: expect.objectContaining({ API_KEY: "secret" }),
        stderr: "pipe",
      })
    );
  });

  it("connects the SDK client to the transport", async () => {
    const client = createProviderClient({
      name: "test",
      command: "cmd",
      roles: ["dns_host"],
    });

    await client.connect();

    expect(mockConnect).toHaveBeenCalled();
    expect(client.isConnected()).toBe(true);
  });

  it("listTools returns full tool definitions from provider", async () => {
    mockListTools.mockResolvedValue({
      tools: [
        {
          name: "list_zones",
          description: "List zones",
          inputSchema: { type: "object", properties: {} },
          annotations: { readOnlyHint: true },
        },
        {
          name: "create_zone",
          description: "Create zone",
          inputSchema: { type: "object", properties: { name: { type: "string" } }, required: ["name"] },
        },
      ],
    });

    const client = createProviderClient({
      name: "cf",
      command: "cmd",
      roles: ["dns_host"],
    });

    await client.connect();
    const tools = await client.listTools();

    expect(tools).toHaveLength(2);
    expect(tools[0].name).toBe("list_zones");
    expect(tools[0].inputSchema).toEqual({ type: "object", properties: {} });
    expect(tools[0].annotations).toEqual({ readOnlyHint: true });
    expect(tools[1].name).toBe("create_zone");
    expect(tools[1].inputSchema).toEqual({
      type: "object",
      properties: { name: { type: "string" } },
      required: ["name"],
    });
  });

  it("callTool sends request and returns result", async () => {
    mockCallTool.mockResolvedValue({
      content: [{ type: "text", text: "zone data" }],
      isError: false,
    });

    const client = createProviderClient({
      name: "cf",
      command: "cmd",
      roles: ["dns_host"],
    });

    await client.connect();
    const result = await client.callTool("list_zones", { page: 1 });

    expect(mockCallTool).toHaveBeenCalledWith({ name: "list_zones", arguments: { page: 1 } });
    expect(result.content).toBe("zone data");
    expect(result.isError).toBe(false);
  });

  it("callTool handles error results", async () => {
    mockCallTool.mockResolvedValue({
      content: [{ type: "text", text: "something went wrong" }],
      isError: true,
    });

    const client = createProviderClient({
      name: "cf",
      command: "cmd",
      roles: ["dns_host"],
    });

    await client.connect();
    const result = await client.callTool("bad_tool", {});

    expect(result.content).toBe("something went wrong");
    expect(result.isError).toBe(true);
  });

  it("disconnect closes the client", async () => {
    const client = createProviderClient({
      name: "cf",
      command: "cmd",
      roles: ["dns_host"],
    });

    await client.connect();
    expect(client.isConnected()).toBe(true);

    await client.disconnect();
    expect(mockClose).toHaveBeenCalled();
    expect(client.isConnected()).toBe(false);
  });

  it("exposes provider name", () => {
    const client = createProviderClient({
      name: "my-provider",
      command: "cmd",
      roles: ["dns_host"],
    });

    expect(client.name).toBe("my-provider");
  });

  it("throws when calling listTools before connect", async () => {
    const client = createProviderClient({
      name: "cf",
      command: "cmd",
      roles: ["dns_host"],
    });

    await expect(client.listTools()).rejects.toThrow("Not connected");
  });

  it("throws when calling callTool before connect", async () => {
    const client = createProviderClient({
      name: "cf",
      command: "cmd",
      roles: ["dns_host"],
    });

    await expect(client.callTool("test", {})).rejects.toThrow("Not connected");
  });
});
