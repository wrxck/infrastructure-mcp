import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render } from "ink-testing-library";
import { McpContext } from "../../src/hooks/use-mcp.js";
import Dashboard from "../../src/screens/dashboard.js";

const zoneData = [
  { id: "z1", name: "example.com", status: "active", recordCount: 12, ssl: "Full" },
  { id: "z2", name: "test.org", status: "pending", recordCount: 5, ssl: "Flexible" },
];

const domainData = [
  { name: "app.example.com" },
  { name: "api.example.com" },
];

function makeMockMcp(callTool: (...args: any[]) => any) {
  return {
    client: {} as any,
    callTool,
    loading: false,
    error: null,
  };
}

describe("Dashboard", () => {
  it("renders zone names after loading", async () => {
    const callTool = vi.fn().mockImplementation((name: string) => {
      if (name === "cloudflare_list_zones") {
        return Promise.resolve({ content: JSON.stringify(zoneData), isError: false });
      }
      if (name === "fleet_list_domains") {
        return Promise.resolve({ content: JSON.stringify(domainData), isError: false });
      }
      return Promise.resolve({ content: "[]", isError: false });
    });

    const { lastFrame } = render(
      <McpContext.Provider value={makeMockMcp(callTool)}>
        <Dashboard onNavigate={vi.fn()} />
      </McpContext.Provider>
    );

    await new Promise(r => setTimeout(r, 50));
    expect(lastFrame()).toContain("example.com");
  });

  it("renders Cloudflare Zones header", async () => {
    const callTool = vi.fn().mockResolvedValue({ content: "[]", isError: false });

    const { lastFrame } = render(
      <McpContext.Provider value={makeMockMcp(callTool)}>
        <Dashboard onNavigate={vi.fn()} />
      </McpContext.Provider>
    );

    await new Promise(r => setTimeout(r, 50));
    expect(lastFrame()).toContain("Cloudflare Zones");
  });

  it("calls cloudflare_list_zones on mount", async () => {
    const callTool = vi.fn().mockResolvedValue({ content: "[]", isError: false });

    render(
      <McpContext.Provider value={makeMockMcp(callTool)}>
        <Dashboard onNavigate={vi.fn()} />
      </McpContext.Provider>
    );

    await new Promise(r => setTimeout(r, 50));
    expect(callTool).toHaveBeenCalledWith("cloudflare_list_zones");
  });

  it("calls fleet_list_domains on mount", async () => {
    const callTool = vi.fn().mockResolvedValue({ content: "[]", isError: false });

    render(
      <McpContext.Provider value={makeMockMcp(callTool)}>
        <Dashboard onNavigate={vi.fn()} />
      </McpContext.Provider>
    );

    await new Promise(r => setTimeout(r, 50));
    expect(callTool).toHaveBeenCalledWith("fleet_list_domains");
  });

  it("shows fleet apps section", async () => {
    const callTool = vi.fn().mockImplementation((name: string) => {
      if (name === "fleet_list_domains") {
        return Promise.resolve({ content: JSON.stringify(domainData), isError: false });
      }
      return Promise.resolve({ content: "[]", isError: false });
    });

    const { lastFrame } = render(
      <McpContext.Provider value={makeMockMcp(callTool)}>
        <Dashboard onNavigate={vi.fn()} />
      </McpContext.Provider>
    );

    await new Promise(r => setTimeout(r, 50));
    expect(lastFrame()).toContain("Fleet");
  });
});
