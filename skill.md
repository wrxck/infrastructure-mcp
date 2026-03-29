---
name: infrastructure-setup
description: Guided setup for the Infrastructure MCP server — configures Cloudflare, Namecheap, and Fleet credentials
---

# Infrastructure MCP Server — Setup Guide

You are helping the user configure the Infrastructure MCP server. Walk them through each step below. Ask for confirmation before modifying any files.

## Prerequisites

- Java 21 installed (`java -version`)
- The JAR built at the expected path (usually `target/infrastructure-mcp-<version>.jar`)
- Cloudflare account
- Namecheap API access enabled

## Step 1: Cloudflare Authentication

Ask the user which auth method they prefer:

**Option A: Global API Key** (simpler, full account access)
- Find it at: https://dash.cloudflare.com/profile/api-tokens — scroll to "Global API Key" — View
- Needs: the key + the email address used to sign in to Cloudflare
- Env vars: `CLOUDFLARE_API_KEY` + `CLOUDFLARE_EMAIL`

**Option B: Scoped API Token** (recommended for shared/CI environments)
- Create at: https://dash.cloudflare.com/profile/api-tokens — Create Token
- Permissions needed: Zone:Read+Edit, DNS:Read+Edit, Zone Settings:Read+Edit
- Zone Resources: All zones (or specific zones)
- Env var: `CLOUDFLARE_API_TOKEN`

Both options also need: `CLOUDFLARE_ACCOUNT_ID`
- Find it at: https://dash.cloudflare.com — pick any domain — right sidebar under "API" section

## Step 2: Namecheap API

- Enable API at: https://ap.www.namecheap.com/settings/tools/apiaccess
- Whitelist the server's public IP address in the Namecheap dashboard
- Env vars needed: `NAMECHEAP_API_USER`, `NAMECHEAP_API_KEY`, `NAMECHEAP_CLIENT_IP`

## Step 3: Fleet (Optional)

Only needed if you use Fleet for app deployment.
- `FLEET_REGISTRY_PATH` — path to `registry.json` (default: `/home/matt/fleet/data/registry.json`)
- `FLEET_BINARY` — path to fleet CLI (default: `fleet`)

## Step 4: Register with Claude Code

Once you have the credentials, write the config to `~/.claude.json` under `mcpServers`:

For Global API Key auth:
```json
{
  "infrastructure-mcp": {
    "type": "stdio",
    "command": "java",
    "args": ["-jar", "/path/to/infrastructure-mcp-<version>.jar"],
    "env": {
      "CLOUDFLARE_API_KEY": "<your-global-api-key>",
      "CLOUDFLARE_EMAIL": "<your-cloudflare-email>",
      "CLOUDFLARE_ACCOUNT_ID": "<your-account-id>",
      "NAMECHEAP_API_USER": "<your-username>",
      "NAMECHEAP_API_KEY": "<your-api-key>",
      "NAMECHEAP_CLIENT_IP": "<your-whitelisted-ip>"
    }
  }
}
```

For API Token auth:
```json
{
  "infrastructure-mcp": {
    "type": "stdio",
    "command": "java",
    "args": ["-jar", "/path/to/infrastructure-mcp-<version>.jar"],
    "env": {
      "CLOUDFLARE_API_TOKEN": "<your-api-token>",
      "CLOUDFLARE_ACCOUNT_ID": "<your-account-id>",
      "NAMECHEAP_API_USER": "<your-username>",
      "NAMECHEAP_API_KEY": "<your-api-key>",
      "NAMECHEAP_CLIENT_IP": "<your-whitelisted-ip>"
    }
  }
}
```

## Step 5: Verify

After restarting Claude Code, test with:
- "List my Cloudflare zones" — should return zone data
- "List my Namecheap domains" — should return domain list
- "List Fleet apps" — should return app data (or empty if no Fleet)

If Cloudflare returns a 403/auth error, double-check the API key/email and account ID.
