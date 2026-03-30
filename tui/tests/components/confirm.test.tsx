import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render } from "ink-testing-library";
import Confirm from "../../src/components/confirm.js";

const flush = () => new Promise<void>((resolve) => setImmediate(resolve));

describe("Confirm", () => {
  it("renders message and hint", () => {
    const { lastFrame } = render(
      <Confirm message="Delete zone?" onConfirm={vi.fn()} onCancel={vi.fn()} />
    );
    expect(lastFrame()).toContain("Delete zone?");
    expect(lastFrame()).toContain("y to confirm");
  });

  it("calls onConfirm when y is pressed", async () => {
    const onConfirm = vi.fn();
    const { stdin } = render(
      <Confirm message="OK?" onConfirm={onConfirm} onCancel={vi.fn()} />
    );
    await flush();
    stdin.write("y");
    await flush();
    expect(onConfirm).toHaveBeenCalled();
  });

  it("calls onCancel when n is pressed", async () => {
    const onCancel = vi.fn();
    const { stdin } = render(
      <Confirm message="OK?" onConfirm={vi.fn()} onCancel={onCancel} />
    );
    await flush();
    stdin.write("n");
    await flush();
    expect(onCancel).toHaveBeenCalled();
  });
});
