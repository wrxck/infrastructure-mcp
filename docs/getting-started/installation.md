# Installation

## Prerequisites

- Java 21+
- Maven 3.9+ (build only)
- A Cloudflare account with API credentials
- A Namecheap account with API access enabled
- Fleet CLI installed (for Fleet tools)

## Build from source

```bash
git clone https://github.com/wrxck/infrastructure-mcp.git
cd infrastructure-mcp
mvn clean package
```

The shaded JAR is produced at `target/infrastructure-mcp-1.1.2.jar`.

## Install into Claude Code

### Interactive setup

```bash
java -jar target/infrastructure-mcp-1.1.2.jar --setup
```

This launches a guided TUI that walks you through entering credentials and writes the configuration to `~/.claude.json`.

### Manual configuration

Add to `~/.claude.json` under `mcpServers`:

```json
{
  "mcpServers": {
    "infrastructure-mcp": {
      "command": "java",
      "args": ["-jar", "/path/to/infrastructure-mcp-1.1.2.jar"],
      "env": {
        "CLOUDFLARE_API_KEY": "your-global-api-key",
        "CLOUDFLARE_EMAIL": "your-cloudflare-email",
        "CLOUDFLARE_ACCOUNT_ID": "your-account-id",
        "NAMECHEAP_API_USER": "your-username",
        "NAMECHEAP_API_KEY": "your-api-key",
        "NAMECHEAP_CLIENT_IP": "your-server-ip"
      }
    }
  }
}
```

See [Configuration](configuration.md) and [Authentication](authentication.md) for details on each setting.
