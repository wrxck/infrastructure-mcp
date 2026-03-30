// packages/orchestrator/tests/mcp-client.test.ts

import { describe, it, expect, vi, beforeEach } from "vitest";
import { EventEmitter } from "events";

vi.mock("child_process", () => ({
  spawn: vi.fn(),
}));

import { spawn } from "child_process";
import { createProviderClient } from "../src/mcp-client.js";

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

function getLastRequest(proc: any): any {
  const calls = (proc.stdin.write as any).mock.calls;
  const raw = calls[calls.length - 1][0] as string;
  return JSON.parse(raw.split("\r\n\r\n")[1]);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createProviderClient", () => {
  it("spawns the given command with args and env", async () => {
    const fakeProc = makeFakeProcess();
    vi.mocked(spawn).mockReturnValue(fakeProc as any);

    const client = createProviderClient({
      name: "test-provider",
      command: "my-server",
      args: ["--flag"],
      env: { API_KEY: "secret" },
      roles: ["dns_host"],
    });

    const connectPromise = client.connect();
    const initReq = getLastRequest(fakeProc);
    sendResponse(fakeProc, {
      jsonrpc: "2.0",
      id: initReq.id,
      result: { protocolVersion: "2024-11-05", capabilities: {} },
    });
    await connectPromise;

    expect(spawn).toHaveBeenCalledWith(
      "my-server",
      ["--flag"],
      expect.objectContaining({
        env: expect.objectContaining({ API_KEY: "secret" }),
      })
    );
  });

  it("sends initialize on connect with orchestrator client info", async () => {
    const fakeProc = makeFakeProcess();
    vi.mocked(spawn).mockReturnValue(fakeProc as any);

    const client = createProviderClient({
      name: "test",
      command: "cmd",
      roles: ["dns_host"],
    });

    const connectPromise = client.connect();
    const msg = getLastRequest(fakeProc);
    expect(msg.method).toBe("initialize");
    expect(msg.params.clientInfo.name).toBe("infrastructure-mcp");

    sendResponse(fakeProc, {
      jsonrpc: "2.0",
      id: msg.id,
      result: { protocolVersion: "2024-11-05", capabilities: {} },
    });
    await connectPromise;
  });

  it("listTools returns tool names from provider", async () => {
    const fakeProc = makeFakeProcess();
    vi.mocked(spawn).mockReturnValue(fakeProc as any);

    const client = createProviderClient({
      name: "cf",
      command: "cmd",
      roles: ["dns_host"],
    });

    const connectPromise = client.connect();
    sendResponse(fakeProc, {
      jsonrpc: "2.0",
      id: getLastRequest(fakeProc).id,
      result: { protocolVersion: "2024-11-05", capabilities: {} },
    });
    await connectPromise;

    const toolsPromise = client.listTools();
    sendResponse(fakeProc, {
      jsonrpc: "2.0",
      id: getLastRequest(fakeProc).id,
      result: {
        tools: [
          { name: "list_zones", description: "List zones" },
          { name: "create_zone", description: "Create zone" },
        ],
      },
    });

    const tools = await toolsPromise;
    expect(tools).toHaveLength(2);
    expect(tools[0].name).toBe("list_zones");
    expect(tools[1].name).toBe("create_zone");
  });

  it("callTool sends request and returns result", async () => {
    const fakeProc = makeFakeProcess();
    vi.mocked(spawn).mockReturnValue(fakeProc as any);

    const client = createProviderClient({
      name: "cf",
      command: "cmd",
      roles: ["dns_host"],
    });

    const connectPromise = client.connect();
    sendResponse(fakeProc, {
      jsonrpc: "2.0",
      id: getLastRequest(fakeProc).id,
      result: { protocolVersion: "2024-11-05", capabilities: {} },
    });
    await connectPromise;

    const toolPromise = client.callTool("list_zones", { page: 1 });
    const toolReq = getLastRequest(fakeProc);

    expect(toolReq.method).toBe("tools/call");
    expect(toolReq.params.name).toBe("list_zones");
    expect(toolReq.params.arguments).toEqual({ page: 1 });

    sendResponse(fakeProc, {
      jsonrpc: "2.0",
      id: toolReq.id,
      result: {
        content: [{ type: "text", text: "zone data" }],
        isError: false,
      },
    });

    const result = await toolPromise;
    expect(result.content).toBe("zone data");
    expect(result.isError).toBe(false);
  });

  it("disconnect kills the process", async () => {
    const fakeProc = makeFakeProcess();
    vi.mocked(spawn).mockReturnValue(fakeProc as any);

    const client = createProviderClient({
      name: "cf",
      command: "cmd",
      roles: ["dns_host"],
    });

    const connectPromise = client.connect();
    sendResponse(fakeProc, {
      jsonrpc: "2.0",
      id: getLastRequest(fakeProc).id,
      result: { protocolVersion: "2024-11-05", capabilities: {} },
    });
    await connectPromise;

    expect(client.isConnected()).toBe(true);
    await client.disconnect();
    expect(fakeProc.kill).toHaveBeenCalled();
    expect(client.isConnected()).toBe(false);
  });

  it("exposes provider name", () => {
    const fakeProc = makeFakeProcess();
    vi.mocked(spawn).mockReturnValue(fakeProc as any);

    const client = createProviderClient({
      name: "my-provider",
      command: "cmd",
      roles: ["dns_host"],
    });

    expect(client.name).toBe("my-provider");
  });
});
