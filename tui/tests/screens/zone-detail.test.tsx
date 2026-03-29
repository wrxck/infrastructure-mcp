import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render } from "ink-testing-library";
import { McpContext } from "../../src/hooks/use-mcp.js";
import ZoneDetail from "../../src/screens/zone-detail.js";

const dnsRecords = [
  { type: "A", name: "example.com", content: "1.2.3.4", proxied: true },
  { type: "CNAME", name: "www.example.com", content: "example.com", proxied: false },
];

const protectionData = [
  { setting: "HTTPS Redirect", category: "SSL", expected: "on", actual: "on", pass: true },
  { setting: "HSTS", category: "SSL", expected: "on", actual: "off", pass: false },
];

const zone = { id: "z1", name: "example.com", status: "active" };

function makeMockMcp(callTool: (...args: any[]) => any) {
  return {
    client: {} as any,
    callTool,
    loading: false,
    error: null,
  };
}

describe("ZoneDetail", () => {
  it("renders zone name", async () => {
    const callTool = vi.fn().mockImplementation((name: string) => {
      if (name === "cloudflare_get_dns") {
        return Promise.resolve({ content: JSON.stringify(dnsRecords), isError: false });
      }
      if (name === "cloudflare_get_protection_status") {
        return Promise.resolve({ content: JSON.stringify(protectionData), isError: false });
      }
      return Promise.resolve({ content: "[]", isError: false });
    });

    const { lastFrame } = render(
      <McpContext.Provider value={makeMockMcp(callTool)}>
        <ZoneDetail zone={zone} onBack={vi.fn()} />
      </McpContext.Provider>
    );

    await new Promise(r => setTimeout(r, 50));
    expect(lastFrame()).toContain("example.com");
  });

  it("calls cloudflare_get_dns on mount", async () => {
    const callTool = vi.fn().mockResolvedValue({ content: "[]", isError: false });

    render(
      <McpContext.Provider value={makeMockMcp(callTool)}>
        <ZoneDetail zone={zone} onBack={vi.fn()} />
      </McpContext.Provider>
    );

    await new Promise(r => setTimeout(r, 50));
    expect(callTool).toHaveBeenCalledWith("cloudflare_get_dns", { domain: "example.com" });
  });

  it("calls cloudflare_get_protection_status on mount", async () => {
    const callTool = vi.fn().mockResolvedValue({ content: "[]", isError: false });

    render(
      <McpContext.Provider value={makeMockMcp(callTool)}>
        <ZoneDetail zone={zone} onBack={vi.fn()} />
      </McpContext.Provider>
    );

    await new Promise(r => setTimeout(r, 50));
    expect(callTool).toHaveBeenCalledWith("cloudflare_get_protection_status", { domain: "example.com" });
  });

  it("renders DNS Records section", async () => {
    const callTool = vi.fn().mockImplementation((name: string) => {
      if (name === "cloudflare_get_dns") {
        return Promise.resolve({ content: JSON.stringify(dnsRecords), isError: false });
      }
      return Promise.resolve({ content: "[]", isError: false });
    });

    const { lastFrame } = render(
      <McpContext.Provider value={makeMockMcp(callTool)}>
        <ZoneDetail zone={zone} onBack={vi.fn()} />
      </McpContext.Provider>
    );

    await new Promise(r => setTimeout(r, 50));
    expect(lastFrame()).toContain("DNS Records");
  });

  it("renders Protection Audit section", async () => {
    const callTool = vi.fn().mockImplementation((name: string) => {
      if (name === "cloudflare_get_protection_status") {
        return Promise.resolve({ content: JSON.stringify(protectionData), isError: false });
      }
      return Promise.resolve({ content: "[]", isError: false });
    });

    const { lastFrame } = render(
      <McpContext.Provider value={makeMockMcp(callTool)}>
        <ZoneDetail zone={zone} onBack={vi.fn()} />
      </McpContext.Provider>
    );

    await new Promise(r => setTimeout(r, 50));
    expect(lastFrame()).toContain("Protection Audit");
  });
});
