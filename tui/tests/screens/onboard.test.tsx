import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render } from "ink-testing-library";
import { McpContext } from "../../src/hooks/use-mcp.js";
import Onboard from "../../src/screens/onboard.js";

function makeMockMcp(callTool: (...args: any[]) => any) {
  return {
    client: {} as any,
    callTool,
    loading: false,
    error: null,
  };
}

describe("Onboard", () => {
  it("shows domain input initially", () => {
    const callTool = vi.fn().mockResolvedValue({ content: "{}", isError: false });

    const { lastFrame } = render(
      <McpContext.Provider value={makeMockMcp(callTool)}>
        <Onboard onComplete={vi.fn()} onBack={vi.fn()} />
      </McpContext.Provider>
    );

    expect(lastFrame()).toContain("domain");
  });

  it("shows confirmation after entering domain", async () => {
    const callTool = vi.fn().mockResolvedValue({ content: "{}", isError: false });

    const { lastFrame, stdin } = render(
      <McpContext.Provider value={makeMockMcp(callTool)}>
        <Onboard onComplete={vi.fn()} onBack={vi.fn()} />
      </McpContext.Provider>
    );

    await new Promise(r => setTimeout(r, 50));
    stdin.write("example.com");
    await new Promise(r => setTimeout(r, 50));
    stdin.write("\r");
    await new Promise(r => setTimeout(r, 50));
    expect(lastFrame()).toContain("example.com");
  });

  it("renders onboarding header", () => {
    const callTool = vi.fn().mockResolvedValue({ content: "{}", isError: false });

    const { lastFrame } = render(
      <McpContext.Provider value={makeMockMcp(callTool)}>
        <Onboard onComplete={vi.fn()} onBack={vi.fn()} />
      </McpContext.Provider>
    );

    expect(lastFrame()).toContain("Onboard");
  });
});
