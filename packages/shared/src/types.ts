// packages/shared/src/types.ts

export type Role = "dns_registrar" | "dns_host" | "cdn" | "security" | "app_platform";

export interface ProviderConfig {
  name: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
  roles: Role[];
  optional?: boolean;
  timeout?: number;
}

export interface WorkflowConfig {
  enabled: boolean;
}

export interface TuiSettings {
  experienceLevel: "learner" | "comfortable" | "professional";
}

export interface InfraConfig {
  providers: ProviderConfig[];
  workflows: Record<string, WorkflowConfig>;
  tui: TuiSettings;
}

export interface LegacyConfig {
  jarPath: string;
  env: Record<string, string>;
  experienceLevel: "learner" | "comfortable" | "professional";
}

export interface ToolInfo {
  name: string;
  description: string;
}

export interface McpToolDefinition {
  name: string;
  description?: string;
  inputSchema: Record<string, unknown>;
  annotations?: {
    title?: string;
    readOnlyHint?: boolean;
    destructiveHint?: boolean;
    idempotentHint?: boolean;
    openWorldHint?: boolean;
  };
}

export interface ToolResult {
  content: string;
  isError: boolean;
}

export interface ProviderStatus {
  name: string;
  roles: Role[];
  connected: boolean;
  toolCount: number;
  error?: string;
}
