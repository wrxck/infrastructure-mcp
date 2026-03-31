// packages/shared/src/constants.ts

export const CONFIG_FILENAME = ".infrastructure-mcp.json";
export const DEFAULT_HANDSHAKE_TIMEOUT_MS = 30_000;
export const ORCHESTRATOR_NAME = "infrastructure-mcp";
export const ORCHESTRATOR_VERSION = "1.3.0";

export const REQUIRED_ROLES: readonly string[] = [
  "dns_registrar",
  "dns_host",
  "cdn",
  "security",
] as const;

export const OPTIONAL_ROLES: readonly string[] = [
  "app_platform",
] as const;
