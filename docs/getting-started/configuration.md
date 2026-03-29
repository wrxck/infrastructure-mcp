# Configuration

All configuration is via environment variables passed through the MCP server config.

## Required variables

| Variable | Description |
|----------|-------------|
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare account ID (found in dashboard URL or API) |
| `NAMECHEAP_API_USER` | Namecheap API username |
| `NAMECHEAP_API_KEY` | Namecheap API key (enable at Profile > Tools > API Access) |
| `NAMECHEAP_CLIENT_IP` | IP address whitelisted for Namecheap API access |

Plus one of the Cloudflare auth options below.

## Optional variables

| Variable | Default | Description |
|----------|---------|-------------|
| `FLEET_REGISTRY_PATH` | `/home/matt/fleet/data/registry.json` | Path to Fleet's app registry |
| `FLEET_BINARY` | `fleet` | Path to the Fleet CLI binary |

## Cloudflare authentication

Two auth modes are supported. Global API Key is preferred for full API access.

### Global API Key (recommended)

| Variable | Description |
|----------|-------------|
| `CLOUDFLARE_API_KEY` | Global API Key from Cloudflare dashboard > My Profile > API Tokens |
| `CLOUDFLARE_EMAIL` | Email address associated with your Cloudflare account |

### Scoped API Token

| Variable | Description |
|----------|-------------|
| `CLOUDFLARE_API_TOKEN` | Scoped API token created at Cloudflare dashboard > My Profile > API Tokens |

!!! warning "Token permissions"
    If using a scoped API token, ensure it has permissions for: Zone Settings, DNS, WAF, Bot Management, and Zone Rulesets.

If both `CLOUDFLARE_API_KEY` and `CLOUDFLARE_API_TOKEN` are set, the Global API Key takes priority.
