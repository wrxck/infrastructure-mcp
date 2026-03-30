import * as fs from "fs";
import * as os from "os";
import * as path from "path";

export interface TuiConfig {
  jarPath: string;
  env: Record<string, string>;
  experienceLevel: "learner" | "comfortable" | "professional";
}

const OWN_CONFIG_FILENAME = ".infrastructure-mcp.json";
const CLAUDE_CONFIG_FILENAME = ".claude.json";

function ownConfigPath(configPath?: string): string {
  return configPath ?? path.join(os.homedir(), OWN_CONFIG_FILENAME);
}

function claudeConfigPath(): string {
  return path.join(os.homedir(), CLAUDE_CONFIG_FILENAME);
}

export function loadConfig(configPath?: string): TuiConfig | null {
  // Try own config file first (no TOCTOU — just try to read)
  try {
    const ownPath = ownConfigPath(configPath);
    const raw = fs.readFileSync(ownPath, "utf-8");
    return JSON.parse(raw) as TuiConfig;
  } catch {
    // fall through to claude.json fallback
  }

  // Try Claude Code config
  try {
    const claudePath = claudeConfigPath();
    const raw = fs.readFileSync(claudePath, "utf-8");
    const claude = JSON.parse(raw);
    const server = claude?.mcpServers?.["infrastructure-mcp"];
    if (!server) return null;

    const args: string[] = server.args ?? [];
    const jarIndex = args.indexOf("-jar");
    const jarPath = jarIndex !== -1 ? args[jarIndex + 1] : "";

    const env: Record<string, string> = server.env ?? {};

    return {
      jarPath,
      env,
      experienceLevel: "professional",
    };
  } catch {
    // fall through
  }

  return null;
}

export function saveConfig(config: TuiConfig, configPath?: string): void {
  const targetPath = ownConfigPath(configPath);
  fs.writeFileSync(targetPath, JSON.stringify(config, null, 2), {
    encoding: "utf-8",
    mode: 0o600,
  });
  // Ensure permissions are correct even if file already existed
  fs.chmodSync(targetPath, 0o600);
}

export function maskSecret(value: string): string {
  if (value.length === 0) return "";
  if (value.length < 8) return "•".repeat(value.length);
  const visible = value.slice(-4);
  const masked = "•".repeat(value.length - 4);
  return masked + visible;
}

export function findJar(explicit?: string): string | null {
  if (explicit !== undefined) {
    if (fs.existsSync(explicit)) return explicit;
    return null;
  }

  const searchDirs = [
    path.join(process.cwd(), "target"),
    path.join(process.cwd(), "..", "infrastructure-mcp", "target"),
  ];

  for (const dir of searchDirs) {
    if (!fs.existsSync(dir)) continue;
    try {
      const entries = fs.readdirSync(dir) as string[];
      for (const entry of entries) {
        if (
          entry.startsWith("infrastructure-mcp-") &&
          entry.endsWith(".jar") &&
          !entry.includes("sources")
        ) {
          return path.join(dir, entry);
        }
      }
    } catch {
      // skip unreadable directories
    }
  }

  return null;
}
