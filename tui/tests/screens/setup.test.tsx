import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render } from "ink-testing-library";
import Setup from "../../src/screens/setup.js";

describe("Setup", () => {
  it("renders welcome step initially", () => {
    const { lastFrame } = render(<Setup onComplete={vi.fn()} />);
    expect(lastFrame()).toContain("Infrastructure MCP");
  });

  it("advances to experience level on Enter", async () => {
    const { lastFrame, stdin } = render(<Setup onComplete={vi.fn()} />);
    await new Promise(r => setTimeout(r, 50));
    stdin.write("\r");
    await new Promise(r => setTimeout(r, 50));
    expect(lastFrame()).toContain("What best describes you");
  });

  it("shows source code review for learner", async () => {
    const { lastFrame, stdin } = render(<Setup onComplete={vi.fn()} />);
    await new Promise(r => setTimeout(r, 50));
    stdin.write("\r"); // past welcome
    await new Promise(r => setTimeout(r, 50));
    stdin.write("\r"); // select first (learner)
    await new Promise(r => setTimeout(r, 50));
    expect(lastFrame()).toContain("review the source code");
  });
});
