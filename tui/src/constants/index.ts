// patterns
export const SANITIZATION_PATTERN = /----UNTRUSTED_CONTENT_[a-f0-9]+\n?/g;
export const DOMAIN_RE = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*$/;

// filenames
export const OWN_CONFIG_FILENAME = ".infrastructure-mcp.json";
export const CLAUDE_CONFIG_FILENAME = ".claude.json";