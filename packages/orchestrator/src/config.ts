// packages/orchestrator/src/config.ts

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  InfraConfig,
  CONFIG_FILENAME,
  isLegacyConfig,
  migrateLegacyConfig,
} from "@infrastructure-mcp/shared";

interface LoadResult {
  config: InfraConfig | null;
  migrated: boolean;
}

function defaultConfigPath(): string {
  return path.join(os.homedir(), CONFIG_FILENAME);
}

export function loadInfraConfig(configPath?: string): LoadResult {
  const filePath = configPath ?? defaultConfigPath();

  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(raw);

    if (isLegacyConfig(parsed)) {
      const migrated = migrateLegacyConfig(parsed);
      return { config: migrated, migrated: true };
    }

    return { config: parsed as InfraConfig, migrated: false };
  } catch {
    return { config: null, migrated: false };
  }
}

export function saveInfraConfig(config: InfraConfig, configPath?: string): void {
  const filePath = configPath ?? defaultConfigPath();

  fs.writeFileSync(filePath, JSON.stringify(config, null, 2), {
    encoding: "utf-8",
    mode: 0o600,
  });
  fs.chmodSync(filePath, 0o600);
}
