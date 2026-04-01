// packages/shared/src/roles.ts

import { Role } from "./types.js";

export interface RoleDefinition {
  role: Role;
  description: string;
  required: boolean;
  capabilityPatterns: string[];
}

export const ROLE_DEFINITIONS: readonly RoleDefinition[] = [
  {
    role: "dns_registrar",
    description: "Domain registration and nameserver management",
    required: true,
    capabilityPatterns: ["*list_domains*", "*get_nameservers*", "*set_nameservers*"],
  },
  {
    role: "dns_host",
    description: "DNS zones and records",
    required: true,
    capabilityPatterns: ["*list_zones*", "*create_zone*", "*get_dns*", "*create_dns*"],
  },
  {
    role: "cdn",
    description: "Caching, performance, and edge configuration",
    required: true,
    capabilityPatterns: ["*cache*", "*performance*", "*speed*"],
  },
  {
    role: "security",
    description: "WAF, SSL/TLS, bot management, and hardening",
    required: true,
    capabilityPatterns: ["*waf*", "*ssl*", "*protection*", "*firewall*"],
  },
  {
    role: "app_platform",
    description: "Application deployment and services",
    required: false,
    capabilityPatterns: ["*list_apps*", "*deploy*", "*list_domains*"],
  },
] as const;

/**
 * Match a tool name against a glob-like pattern.
 * Patterns use * as a wildcard that matches any substring.
 * Examples: "*list_zones*" matches "cloudflare_list_zones"
 */
export function matchesPattern(toolName: string, pattern: string): boolean {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp("^" + escaped.replace(/\*/g, ".*") + "$");

  return regex.test(toolName);
}

/**
 * Suggest roles for a provider based on its tool names.
 * Returns roles where at least one tool matches at least one capability pattern.
 */
export function suggestRoles(toolNames: string[]): Role[] {
  const suggested: Role[] = [];

  for (const def of ROLE_DEFINITIONS) {
    const hasMatch = def.capabilityPatterns.some((pattern) =>
      toolNames.some((name) => matchesPattern(name, pattern))
    );

    if (hasMatch) {
      suggested.push(def.role);
    }
  }

  return suggested;
}

/**
 * Validate that a provider's tools cover the expected capabilities for its declared roles.
 * Returns warnings for any role whose capability patterns have zero matches.
 */
export function validateCapabilities(
  toolNames: string[],
  declaredRoles: Role[],
): string[] {
  const warnings: string[] = [];

  for (const role of declaredRoles) {
    const def = ROLE_DEFINITIONS.find((d) => d.role === role);

    if (!def) {
      warnings.push(`Unknown role: ${role}`);
      continue;
    }

    const unmatchedPatterns = def.capabilityPatterns.filter(
      (pattern) => !toolNames.some((name) => matchesPattern(name, pattern))
    );

    if (unmatchedPatterns.length === def.capabilityPatterns.length) {
      warnings.push(
        `Provider declares role '${role}' but no tools match any capability pattern (${def.capabilityPatterns.join(", ")})`
      );
    }
  }

  return warnings;
}
