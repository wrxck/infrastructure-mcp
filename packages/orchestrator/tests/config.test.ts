// packages/orchestrator/tests/config.test.ts

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("fs", () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  chmodSync: vi.fn(),
}));

vi.mock("os", () => ({
  homedir: vi.fn(() => "/home/testuser"),
}));

import * as fs from "fs";
import { loadInfraConfig, saveInfraConfig } from "../src/config.js";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("loadInfraConfig", () => {
  it("loads v1.3 config directly", () => {
    const config = {
      providers: [
        { name: "cf", command: "cmd", roles: ["dns_host", "cdn", "security"] },
        { name: "nc", command: "cmd", roles: ["dns_registrar"] },
      ],
      workflows: {},
      tui: { experienceLevel: "professional" },
    };

    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(config));

    const result = loadInfraConfig();

    expect(result.config).toEqual(config);
    expect(result.migrated).toBe(false);
  });

  it("migrates v1.2 config and returns migrated flag", () => {
    const legacy = {
      jarPath: "/path/to/jar",
      env: {
        CLOUDFLARE_API_KEY: "key",
        CLOUDFLARE_EMAIL: "e@test.com",
        CLOUDFLARE_ACCOUNT_ID: "acc",
        NAMECHEAP_API_USER: "user",
        NAMECHEAP_API_KEY: "key",
        NAMECHEAP_CLIENT_IP: "1.2.3.4",
      },
      experienceLevel: "professional",
    };

    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(legacy));

    const result = loadInfraConfig();

    expect(result.migrated).toBe(true);
    expect(result.config).not.toBeNull();
    expect(result.config!.providers.length).toBeGreaterThan(0);
    expect(result.config!.providers.some((p) => p.name === "cloudflare")).toBe(true);
  });

  it("returns null config when file not found", () => {
    vi.mocked(fs.readFileSync).mockImplementation(() => {
      throw new Error("ENOENT");
    });

    const result = loadInfraConfig();

    expect(result.config).toBeNull();
  });

  it("accepts explicit config path", () => {
    const config = {
      providers: [{ name: "cf", command: "cmd", roles: ["dns_host", "cdn", "security"] }],
      workflows: {},
      tui: { experienceLevel: "professional" },
    };

    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(config));

    loadInfraConfig("/custom/path.json");

    expect(fs.readFileSync).toHaveBeenCalledWith("/custom/path.json", "utf-8");
  });
});

describe("saveInfraConfig", () => {
  it("writes config with 0600 permissions", () => {
    const config = {
      providers: [],
      workflows: {},
      tui: { experienceLevel: "professional" as const },
    };

    saveInfraConfig(config);

    expect(fs.writeFileSync).toHaveBeenCalledWith(
      "/home/testuser/.infrastructure-mcp.json",
      JSON.stringify(config, null, 2),
      { encoding: "utf-8", mode: 0o600 },
    );
    expect(fs.chmodSync).toHaveBeenCalledWith(
      "/home/testuser/.infrastructure-mcp.json",
      0o600,
    );
  });
});
