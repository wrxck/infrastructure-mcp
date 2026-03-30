import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render } from "ink-testing-library";
import Settings from "../../src/screens/settings.js";
import type { TuiConfig } from "../../src/config.js";

const mockConfig: TuiConfig = {
  jarPath: "/path/to/infrastructure-mcp.jar",
  env: {
    CLOUDFLARE_API_TOKEN: "abc123def456",
    NAMECHEAP_API_KEY: "secret-key",
    CLOUDFLARE_ACCOUNT_ID: "acc123",
  },
  experienceLevel: "professional",
};

describe("Settings", () => {
  it("renders Settings header", () => {
    const { lastFrame } = render(
      <Settings config={mockConfig} onRunSetup={vi.fn()} onBack={vi.fn()} />
    );

    expect(lastFrame()).toContain("Settings");
  });

  it("renders config values", () => {
    const { lastFrame } = render(
      <Settings config={mockConfig} onRunSetup={vi.fn()} onBack={vi.fn()} />
    );

    expect(lastFrame()).toContain("acc123");
  });

  it("masks secret values", () => {
    const { lastFrame } = render(
      <Settings config={mockConfig} onRunSetup={vi.fn()} onBack={vi.fn()} />
    );

    const frame = lastFrame() ?? "";
    expect(frame).not.toContain("abc123def456");
  });

  it("renders without config (null)", () => {
    const { lastFrame } = render(
      <Settings config={null} onRunSetup={vi.fn()} onBack={vi.fn()} />
    );

    expect(lastFrame()).toBeTruthy();
    expect(lastFrame()).toContain("Settings");
  });

  it("renders setup wizard option", () => {
    const { lastFrame } = render(
      <Settings config={mockConfig} onRunSetup={vi.fn()} onBack={vi.fn()} />
    );

    expect(lastFrame()).toContain("setup");
  });
});
