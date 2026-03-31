// packages/orchestrator/src/cli.ts

import { loadInfraConfig, saveInfraConfig } from "./config.js";
import { startServer } from "./server.js";
import { validateConfig } from "@infrastructure-mcp/shared";

export async function main(args: string[]): Promise<void> {
  const configPath = getFlagValue(args, "--config");

  if (args.includes("--validate")) {
    const { config, migrated } = loadInfraConfig(configPath);

    if (!config) {
      console.error("No config file found");
      process.exit(1);
    }

    if (migrated) {
      console.log("Detected v1.2 config format — would be migrated on startup");
    }

    const errors = validateConfig(config);
    if (errors.length > 0) {
      console.error("Validation errors:");
      for (const err of errors) {
        console.error(`  - ${err}`);
      }
      process.exit(1);
    }

    console.log("Config is valid");
    return;
  }

  const { config, migrated } = loadInfraConfig(configPath);

  if (!config) {
    console.error("No config file found. Run with --setup or create ~/.infrastructure-mcp.json");
    process.exit(1);
  }

  if (migrated) {
    console.error("Migrated v1.2 config to v1.3 format");
    saveInfraConfig(config, configPath);
  }

  await startServer(config);
}

function getFlagValue(args: string[], flag: string): string | undefined {
  const idx = args.indexOf(flag);
  if (idx === -1 || idx + 1 >= args.length) return undefined;
  return args[idx + 1];
}
