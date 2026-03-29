import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render } from "ink-testing-library";
import { McpContext } from "../../src/hooks/use-mcp.js";
import Fleet from "../../src/screens/fleet.js";

function makeMockMcp(callTool: (...args: any[]) => any) {
  return {
    client: {} as any,
    callTool,
    loading: false,
    error: null,
  };
}

describe("Fleet", () => {
  it("renders Fleet header", async () => {
    const callTool = vi.fn().mockResolvedValue({ content: "[]", isError: false });

    const { lastFrame } = render(
      <McpContext.Provider value={makeMockMcp(callTool)}>
        <Fleet onBack={vi.fn()} />
      </McpContext.Provider>
    );

    await new Promise(r => setTimeout(r, 50));
    expect(lastFrame()).toContain("Fleet");
  });

  it("calls fleet_list_apps on mount", async () => {
    const callTool = vi.fn().mockResolvedValue({ content: "[]", isError: false });

    render(
      <McpContext.Provider value={makeMockMcp(callTool)}>
        <Fleet onBack={vi.fn()} />
      </McpContext.Provider>
    );

    await new Promise(r => setTimeout(r, 50));
    expect(callTool).toHaveBeenCalledWith("fleet_list_apps");
  });

  it("renders app names from mock data", async () => {
    const apps = [
      { name: "my-app", domain: "app.example.com", status: "running" },
      { name: "api-server", domain: "api.example.com", status: "running" },
    ];
    const callTool = vi.fn().mockResolvedValue({
      content: JSON.stringify(apps),
      isError: false,
    });

    const { lastFrame } = render(
      <McpContext.Provider value={makeMockMcp(callTool)}>
        <Fleet onBack={vi.fn()} />
      </McpContext.Provider>
    );

    await new Promise(r => setTimeout(r, 50));
    expect(lastFrame()).toContain("my-app");
  });

  it("renders without crashing with empty data", async () => {
    const callTool = vi.fn().mockResolvedValue({ content: "[]", isError: false });

    const { lastFrame } = render(
      <McpContext.Provider value={makeMockMcp(callTool)}>
        <Fleet onBack={vi.fn()} />
      </McpContext.Provider>
    );

    await new Promise(r => setTimeout(r, 50));
    expect(lastFrame()).toBeTruthy();
  });
});
