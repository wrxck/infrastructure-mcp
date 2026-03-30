import { describe, it, expect } from "vitest";
import React from "react";
import { render } from "ink-testing-library";
import Table from "../../src/components/table.js";

describe("Table", () => {
  const columns = [
    { key: "name", header: "Name" },
    { key: "status", header: "Status" },
  ];
  const rows = [
    { name: "example.com", status: "active" },
    { name: "test.co.uk", status: "pending" },
  ];

  it("renders header row", () => {
    const { lastFrame } = render(<Table columns={columns} rows={rows} />);
    expect(lastFrame()).toContain("Name");
    expect(lastFrame()).toContain("Status");
  });

  it("renders all data rows", () => {
    const { lastFrame } = render(<Table columns={columns} rows={rows} />);
    const frame = lastFrame()!;
    expect(frame).toContain("example.com");
    expect(frame).toContain("test.co.uk");
    expect(frame).toContain("active");
    expect(frame).toContain("pending");
  });

  it("uses box-drawing characters", () => {
    const { lastFrame } = render(<Table columns={columns} rows={rows} />);
    const frame = lastFrame()!;
    expect(frame).toContain("┌");
    expect(frame).toContain("┐");
    expect(frame).toContain("└");
    expect(frame).toContain("┘");
    expect(frame).toContain("│");
    expect(frame).toContain("─");
    expect(frame).toContain("├");
    expect(frame).toContain("┤");
  });

  it("highlights selected row", () => {
    const { lastFrame } = render(<Table columns={columns} rows={rows} selectedIndex={0} />);
    expect(lastFrame()).toContain("example.com");
  });

  it("renders empty state", () => {
    const { lastFrame } = render(<Table columns={columns} rows={[]} />);
    expect(lastFrame()).toContain("No data");
  });

  it("aligns columns consistently across rows", () => {
    const wideRows = [
      { name: "a", status: "ok" },
      { name: "a-very-long-domain-name.co.uk", status: "active" },
    ];
    const { lastFrame } = render(<Table columns={columns} rows={wideRows} />);
    const lines = lastFrame()!.split("\n").filter((l) => l.includes("│"));
    const counts = lines.map((l) => (l.match(/│/g) ?? []).length);
    const uniqueCounts = [...new Set(counts)];
    expect(uniqueCounts.length).toBe(1);
  });
});
