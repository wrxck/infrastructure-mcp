import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render } from "ink-testing-library";
import { McpContext } from "../../src/hooks/use-mcp.js";
import Providers from "../../src/screens/providers.js";

function makeMockMcp(callTool: (...args: any[]) => any) {
  return {
    client: {} as any,
    callTool,
    loading: false,
    error: null,
  };
}

describe("Providers", () => {
  it("renders Providers header", async () => {
    const callTool = vi.fn().mockResolvedValue({ content: "[]", isError: false });

    const { lastFrame } = render(
      <McpContext.Provider value={makeMockMcp(callTool)}>
        <Providers onBack={vi.fn()} />
      </McpContext.Provider>
    );

    await new Promise(r => setTimeout(r, 50));
    expect(lastFrame()).toContain("Providers");
  });

  it("calls provider_status on mount", async () => {
    const callTool = vi.fn().mockResolvedValue({ content: "[]", isError: false });

    render(
      <McpContext.Provider value={makeMockMcp(callTool)}>
        <Providers onBack={vi.fn()} />
      </McpContext.Provider>
    );

    await new Promise(r => setTimeout(r, 50));
    expect(callTool).toHaveBeenCalledWith("provider_status");
  });

  it("renders provider info from mock data", async () => {
    const providers = [
      { name: "cloudflare", roles: ["dns_host", "cdn", "security"], connected: true, toolCount: 42 },
      { name: "namecheap", roles: ["dns_registrar"], connected: true, toolCount: 5 },
    ];
    const callTool = vi.fn().mockResolvedValue({
      content: JSON.stringify(providers),
      isError: false,
    });

    const { lastFrame } = render(
      <McpContext.Provider value={makeMockMcp(callTool)}>
        <Providers onBack={vi.fn()} />
      </McpContext.Provider>
    );

    await new Promise(r => setTimeout(r, 50));
    const frame = lastFrame()!;
    expect(frame).toContain("cloudflare");
    expect(frame).toContain("namecheap");
    expect(frame).toContain("2/2 providers connected");
    expect(frame).toContain("47 tools available");
  });

  it("shows error message on failure", async () => {
    const callTool = vi.fn().mockResolvedValue({
      content: "Connection refused",
      isError: true,
    });

    const { lastFrame } = render(
      <McpContext.Provider value={makeMockMcp(callTool)}>
        <Providers onBack={vi.fn()} />
      </McpContext.Provider>
    );

    await new Promise(r => setTimeout(r, 50));
    expect(lastFrame()).toContain("Connection refused");
  });

  it("renders without crashing with empty data", async () => {
    const callTool = vi.fn().mockResolvedValue({ content: "[]", isError: false });

    const { lastFrame } = render(
      <McpContext.Provider value={makeMockMcp(callTool)}>
        <Providers onBack={vi.fn()} />
      </McpContext.Provider>
    );

    await new Promise(r => setTimeout(r, 50));
    expect(lastFrame()).toContain("No providers configured");
  });
});
