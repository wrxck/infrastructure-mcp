import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render } from "ink-testing-library";
import { McpContext } from "../../src/hooks/use-mcp.js";
import Audit from "../../src/screens/audit.js";

function makeMockMcp(callTool: (...args: any[]) => any) {
  return {
    client: {} as any,
    callTool,
    loading: false,
    error: null,
  };
}

describe("Audit", () => {
  it("renders Audit header", async () => {
    const callTool = vi.fn().mockResolvedValue({ content: "[]", isError: false });

    const { lastFrame } = render(
      <McpContext.Provider value={makeMockMcp(callTool)}>
        <Audit onBack={vi.fn()} />
      </McpContext.Provider>
    );

    await new Promise(r => setTimeout(r, 50));
    expect(lastFrame()).toContain("Audit");
  });

  it("calls cloudflare_list_zones on mount", async () => {
    const callTool = vi.fn().mockResolvedValue({ content: "[]", isError: false });

    render(
      <McpContext.Provider value={makeMockMcp(callTool)}>
        <Audit onBack={vi.fn()} />
      </McpContext.Provider>
    );

    await new Promise(r => setTimeout(r, 50));
    expect(callTool).toHaveBeenCalledWith("cloudflare_list_zones");
  });

  it("renders without crashing with mock data", async () => {
    const zones = [
      { id: "z1", name: "example.com", status: "active" },
    ];
    const protection = [
      { setting: "HTTPS", category: "SSL", expected: "on", actual: "on", pass: true },
    ];

    const callTool = vi.fn().mockImplementation((name: string) => {
      if (name === "cloudflare_list_zones") {
        return Promise.resolve({ content: JSON.stringify(zones), isError: false });
      }
      if (name === "cloudflare_get_protection_status") {
        return Promise.resolve({ content: JSON.stringify(protection), isError: false });
      }
      return Promise.resolve({ content: "[]", isError: false });
    });

    const { lastFrame } = render(
      <McpContext.Provider value={makeMockMcp(callTool)}>
        <Audit onBack={vi.fn()} />
      </McpContext.Provider>
    );

    await new Promise(r => setTimeout(r, 100));
    expect(lastFrame()).toBeTruthy();
  });
});
