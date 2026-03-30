import { describe, it, expect, vi, beforeEach } from "vitest";
import { EventEmitter } from "events";

// Mock child_process and fs before importing the module under test
vi.mock("child_process", () => ({
  spawn: vi.fn(),
}));

vi.mock("fs", async () => {
  const actual = await vi.importActual("fs");
  return {
    ...actual,
    existsSync: vi.fn(() => true),
  };
});

import { spawn } from "child_process";
import { createMcpClient } from "../src/mcp-client.js";

function makeFakeProcess() {
  const stdin = { write: vi.fn() };
  const stdout = new EventEmitter() as any;
  const proc = new EventEmitter() as any;
  proc.stdin = stdin;
  proc.stdout = stdout;
  proc.stderr = new EventEmitter();
  proc.kill = vi.fn();
  return proc;
}

function sendResponse(proc: any, response: object) {
  const json = JSON.stringify(response);
  const msg = `Content-Length: ${Buffer.byteLength(json)}\r\n\r\n${json}`;
  proc.stdout.emit("data", Buffer.from(msg));
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("McpClient", () => {
  it("spawns java process with correct args", async () => {
    const fakeProc = makeFakeProcess();
    vi.mocked(spawn).mockReturnValue(fakeProc as any);

    const client = createMcpClient("/path/to/server.jar", {
      MY_ENV: "value",
    });

    // Start connect but don't await — we'll resolve the initialize handshake manually
    const connectPromise = client.connect();

    // Resolve the initialize response
    const initReq = JSON.parse(
      (fakeProc.stdin.write as any).mock.calls[0][0].split("\r\n\r\n")[1]
    );
    sendResponse(fakeProc, {
      jsonrpc: "2.0",
      id: initReq.id,
      result: { protocolVersion: "2024-11-05", capabilities: {} },
    });

    await connectPromise;

    expect(spawn).toHaveBeenCalledWith(
      "java",
      ["-jar", "/path/to/server.jar"],
      expect.objectContaining({
        env: expect.objectContaining({ MY_ENV: "value" }),
      })
    );
  });

  it("sends initialize on connect", async () => {
    const fakeProc = makeFakeProcess();
    vi.mocked(spawn).mockReturnValue(fakeProc as any);

    const client = createMcpClient("/path/to/server.jar", {});
    const connectPromise = client.connect();

    // Capture the written message before sending response
    expect(fakeProc.stdin.write).toHaveBeenCalled();
    const rawMsg = (fakeProc.stdin.write as any).mock.calls[0][0] as string;
    const body = rawMsg.split("\r\n\r\n")[1];
    const msg = JSON.parse(body);

    expect(msg.method).toBe("initialize");
    expect(msg.jsonrpc).toBe("2.0");
    expect(msg.params.protocolVersion).toBe("2024-11-05");
    expect(msg.params.clientInfo.name).toBe("infrastructure-tui");

    sendResponse(fakeProc, {
      jsonrpc: "2.0",
      id: msg.id,
      result: { protocolVersion: "2024-11-05", capabilities: {} },
    });

    await connectPromise;
  });

  it("callTool sends tools/call and returns result", async () => {
    const fakeProc = makeFakeProcess();
    vi.mocked(spawn).mockReturnValue(fakeProc as any);

    const client = createMcpClient("/path/to/server.jar", {});
    const connectPromise = client.connect();

    // Resolve initialize
    const initRaw = (fakeProc.stdin.write as any).mock.calls[0][0] as string;
    const initMsg = JSON.parse(initRaw.split("\r\n\r\n")[1]);
    sendResponse(fakeProc, {
      jsonrpc: "2.0",
      id: initMsg.id,
      result: { protocolVersion: "2024-11-05", capabilities: {} },
    });
    await connectPromise;

    // Call a tool
    const toolPromise = client.callTool("myTool", { foo: "bar" });

    // Find the tool call write
    const toolRaw = (fakeProc.stdin.write as any).mock.calls[1][0] as string;
    const toolMsg = JSON.parse(toolRaw.split("\r\n\r\n")[1]);

    expect(toolMsg.method).toBe("tools/call");
    expect(toolMsg.params.name).toBe("myTool");
    expect(toolMsg.params.arguments).toEqual({ foo: "bar" });

    sendResponse(fakeProc, {
      jsonrpc: "2.0",
      id: toolMsg.id,
      result: {
        content: [{ type: "text", text: "hello world" }],
        isError: false,
      },
    });

    const result = await toolPromise;
    expect(result.content).toBe("hello world");
    expect(result.isError).toBe(false);
  });

  it("callTool returns error when isError is true", async () => {
    const fakeProc = makeFakeProcess();
    vi.mocked(spawn).mockReturnValue(fakeProc as any);

    const client = createMcpClient("/path/to/server.jar", {});
    const connectPromise = client.connect();

    const initRaw = (fakeProc.stdin.write as any).mock.calls[0][0] as string;
    const initMsg = JSON.parse(initRaw.split("\r\n\r\n")[1]);
    sendResponse(fakeProc, {
      jsonrpc: "2.0",
      id: initMsg.id,
      result: { protocolVersion: "2024-11-05", capabilities: {} },
    });
    await connectPromise;

    const toolPromise = client.callTool("failingTool", {});

    const toolRaw = (fakeProc.stdin.write as any).mock.calls[1][0] as string;
    const toolMsg = JSON.parse(toolRaw.split("\r\n\r\n")[1]);

    sendResponse(fakeProc, {
      jsonrpc: "2.0",
      id: toolMsg.id,
      result: {
        content: [{ type: "text", text: "something went wrong" }],
        isError: true,
      },
    });

    const result = await toolPromise;
    expect(result.content).toBe("something went wrong");
    expect(result.isError).toBe(true);
  });

  it("strips content sanitization markers from responses", async () => {
    const fakeProc = makeFakeProcess();
    vi.mocked(spawn).mockReturnValue(fakeProc as any);

    const client = createMcpClient("/path/to/server.jar", {});
    const connectPromise = client.connect();

    const initRaw = (fakeProc.stdin.write as any).mock.calls[0][0] as string;
    const initMsg = JSON.parse(initRaw.split("\r\n\r\n")[1]);
    sendResponse(fakeProc, {
      jsonrpc: "2.0",
      id: initMsg.id,
      result: { protocolVersion: "2024-11-05", capabilities: {} },
    });
    await connectPromise;

    const toolPromise = client.callTool("sanitizeTest", {});

    const toolRaw = (fakeProc.stdin.write as any).mock.calls[1][0] as string;
    const toolMsg = JSON.parse(toolRaw.split("\r\n\r\n")[1]);

    const rawText =
      "----UNTRUSTED_CONTENT_a1b2c3d4\nsome content\n----UNTRUSTED_CONTENT_deadbeef\nmore content";
    sendResponse(fakeProc, {
      jsonrpc: "2.0",
      id: toolMsg.id,
      result: {
        content: [{ type: "text", text: rawText }],
        isError: false,
      },
    });

    const result = await toolPromise;
    expect(result.content).not.toMatch(/----UNTRUSTED_CONTENT_[a-f0-9]+/);
    expect(result.content).toContain("some content");
    expect(result.content).toContain("more content");
  });

  it("disconnect kills the process", async () => {
    const fakeProc = makeFakeProcess();
    vi.mocked(spawn).mockReturnValue(fakeProc as any);

    const client = createMcpClient("/path/to/server.jar", {});
    const connectPromise = client.connect();

    const initRaw = (fakeProc.stdin.write as any).mock.calls[0][0] as string;
    const initMsg = JSON.parse(initRaw.split("\r\n\r\n")[1]);
    sendResponse(fakeProc, {
      jsonrpc: "2.0",
      id: initMsg.id,
      result: { protocolVersion: "2024-11-05", capabilities: {} },
    });
    await connectPromise;

    expect(client.isConnected()).toBe(true);

    await client.disconnect();

    expect(fakeProc.kill).toHaveBeenCalled();
    expect(client.isConnected()).toBe(false);
  });
});
