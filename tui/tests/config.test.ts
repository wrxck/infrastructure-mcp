import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("fs", () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  chmodSync: vi.fn(),
  mkdirSync: vi.fn(),
  readdirSync: vi.fn(),
}));

vi.mock("os", () => ({
  homedir: vi.fn(() => "/home/testuser"),
}));

import * as fs from "fs";
import * as os from "os";
import { loadConfig, saveConfig, maskSecret, findJar } from "../src/config.js";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(os.homedir).mockReturnValue("/home/testuser");
});

describe("loadConfig", () => {
  it("loads from own config file when it exists", () => {
    const config = {
      jarPath: "/opt/infra/infrastructure-mcp.jar",
      env: { API_KEY: "secret123" },
      experienceLevel: "professional",
    };

    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(config));

    const result = loadConfig();

    expect(result).toEqual(config);
  });

  it("falls back to claude.json when own config missing", () => {
    const claudeConfig = {
      mcpServers: {
        "infrastructure-mcp": {
          command: "java",
          args: ["-jar", "/opt/infra/infrastructure-mcp-1.0.0.jar"],
          env: {
            NAMECHEAP_API_KEY: "nckey",
            CLOUDFLARE_API_TOKEN: "cftoken",
          },
        },
      },
    };

    vi.mocked(fs.readFileSync).mockImplementation((p) => {
      if (String(p).includes(".infrastructure-mcp.json")) {
        throw new Error("ENOENT");
      }
      if (String(p).includes(".claude.json")) {
        return JSON.stringify(claudeConfig);
      }
      throw new Error(`Unexpected read: ${p}`);
    });

    const result = loadConfig();

    expect(result).not.toBeNull();
    expect(result!.jarPath).toBe("/opt/infra/infrastructure-mcp-1.0.0.jar");
    expect(result!.env).toEqual({
      NAMECHEAP_API_KEY: "nckey",
      CLOUDFLARE_API_TOKEN: "cftoken",
    });
    expect(result!.experienceLevel).toBe("professional");
  });

  it("returns null when no config found", () => {
    vi.mocked(fs.readFileSync).mockImplementation(() => {
      throw new Error("ENOENT");
    });

    const result = loadConfig();

    expect(result).toBeNull();
  });
});

describe("saveConfig", () => {
  it("writes config with restrictive permissions (0600)", () => {
    vi.mocked(fs.writeFileSync).mockImplementation(() => undefined);
    vi.mocked(fs.chmodSync).mockImplementation(() => undefined);

    const config = {
      jarPath: "/opt/infra/infrastructure-mcp.jar",
      env: { API_KEY: "secret" },
      experienceLevel: "comfortable" as const,
    };

    saveConfig(config);

    expect(fs.writeFileSync).toHaveBeenCalledWith(
      "/home/testuser/.infrastructure-mcp.json",
      JSON.stringify(config, null, 2),
      { encoding: "utf-8", mode: 0o600 }
    );
    expect(fs.chmodSync).toHaveBeenCalledWith(
      "/home/testuser/.infrastructure-mcp.json",
      0o600
    );
  });
});

describe("maskSecret", () => {
  it("masks long secrets showing last 4 chars", () => {
    expect(maskSecret("abcdefghijklmnop")).toBe("••••••••••••mnop");
  });

  it("fully masks secrets shorter than 8 chars", () => {
    expect(maskSecret("abc")).toBe("•••");
    expect(maskSecret("abcde")).toBe("•••••");
    expect(maskSecret("abcdefg")).toBe("•••••••");
  });

  it("shows last 4 for secrets 8+ chars", () => {
    expect(maskSecret("12345678")).toBe("••••5678");
  });

  it("returns empty for empty string", () => {
    expect(maskSecret("")).toBe("");
  });
});

describe("findJar", () => {
  it("findJar returns explicit path when file exists", () => {
    vi.mocked(fs.existsSync).mockImplementation((p) => {
      return p === "/explicit/path/infrastructure-mcp-1.0.0.jar";
    });

    const result = findJar("/explicit/path/infrastructure-mcp-1.0.0.jar");
    expect(result).toBe("/explicit/path/infrastructure-mcp-1.0.0.jar");
  });

  it("findJar returns null when no jar found", () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);

    const result = findJar();
    expect(result).toBeNull();
  });
});
