import { describe, it, expect, vi, beforeEach } from "vitest";

const mockConnect = vi.fn();
const mockCallTool = vi.fn();
const mockListTools = vi.fn();
const mockClose = vi.fn();

vi.mock("@modelcontextprotocol/sdk/client/index.js", () => ({
  Client: vi.fn(() => ({
    connect: mockConnect,
    callTool: mockCallTool,
    listTools: mockListTools,
    close: mockClose,
  })),
}));

vi.mock("@modelcontextprotocol/sdk/client/stdio.js", () => ({
  StdioClientTransport: vi.fn(() => ({
    close: vi.fn(),
  })),
}));

vi.mock("fs", async () => {
  const actual = await vi.importActual("fs");
  return {
    ...actual,
    existsSync: vi.fn(() => true),
  };
});

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
const { Client } = await import("@modelcontextprotocol/sdk/client/index.js");
const { StdioClientTransport } = await import("@modelcontextprotocol/sdk/client/stdio.js");
import { createMcpClient } from "../src/mcp-client.js";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("McpClient", () => {
  it("creates transport with java command for .jar files", async () => {
    const client = createMcpClient("/path/to/server.jar", { MY_ENV: "value" });
    await client.connect();

    expect(StdioClientTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        command: "java",
        args: ["-jar", "/path/to/server.jar"],
        env: expect.objectContaining({ MY_ENV: "value" }),
      })
    );
  });

  it("creates transport with node command for .js files", async () => {
    const client = createMcpClient("/path/to/server.js", {}, ["--config", "test.json"]);
    await client.connect();

    expect(StdioClientTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        command: "node",
        args: expect.arrayContaining(["--config", "test.json"]),
      })
    );
  });

  it("creates Client with correct info", async () => {
    const client = createMcpClient("/path/to/server.jar", {});
    await client.connect();

    expect(Client).toHaveBeenCalledWith(
      { name: "infrastructure-tui", version: "1.2.0" },
      { capabilities: {} }
    );
  });

  it("calls SDK connect on connect", async () => {
    const client = createMcpClient("/path/to/server.jar", {});
    await client.connect();

    expect(mockConnect).toHaveBeenCalled();
    expect(client.isConnected()).toBe(true);
  });

  it("callTool delegates to SDK and extracts text content", async () => {
    mockCallTool.mockResolvedValue({
      content: [{ type: "text", text: "hello world" }],
      isError: false,
    });

    const client = createMcpClient("/path/to/server.jar", {});
    await client.connect();

    const result = await client.callTool("myTool", { foo: "bar" });

    expect(mockCallTool).toHaveBeenCalledWith({ name: "myTool", arguments: { foo: "bar" } });
    expect(result.content).toBe("hello world");
    expect(result.isError).toBe(false);
  });

  it("callTool returns error when isError is true", async () => {
    mockCallTool.mockResolvedValue({
      content: [{ type: "text", text: "something went wrong" }],
      isError: true,
    });

    const client = createMcpClient("/path/to/server.jar", {});
    await client.connect();

    const result = await client.callTool("failingTool", {});
    expect(result.content).toBe("something went wrong");
    expect(result.isError).toBe(true);
  });

  it("strips content sanitization markers from responses", async () => {
    const rawText = "----UNTRUSTED_CONTENT_a1b2c3d4\nsome content\n----UNTRUSTED_CONTENT_deadbeef\nmore content";
    mockCallTool.mockResolvedValue({
      content: [{ type: "text", text: rawText }],
      isError: false,
    });

    const client = createMcpClient("/path/to/server.jar", {});
    await client.connect();

    const result = await client.callTool("sanitizeTest", {});
    expect(result.content).not.toMatch(/----UNTRUSTED_CONTENT_[a-f0-9]+/);
    expect(result.content).toContain("some content");
    expect(result.content).toContain("more content");
  });

  it("listTools delegates to SDK", async () => {
    mockListTools.mockResolvedValue({
      tools: [
        { name: "tool1", description: "First tool" },
        { name: "tool2", description: "Second tool" },
      ],
    });

    const client = createMcpClient("/path/to/server.jar", {});
    await client.connect();

    const tools = await client.listTools();
    expect(tools).toEqual([
      { name: "tool1", description: "First tool" },
      { name: "tool2", description: "Second tool" },
    ]);
  });

  it("callTool returns not connected when not connected", async () => {
    const client = createMcpClient("/path/to/server.jar", {});

    const result = await client.callTool("myTool", {});
    expect(result.content).toBe("Not connected");
    expect(result.isError).toBe(true);
  });

  it("disconnect sets connected to false", async () => {
    const client = createMcpClient("/path/to/server.jar", {});
    await client.connect();
    expect(client.isConnected()).toBe(true);

    await client.disconnect();
    expect(client.isConnected()).toBe(false);
  });
});
