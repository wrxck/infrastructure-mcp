# Environment Variables

## Cloudflare (one auth method required)

### Global API Key auth (recommended)

| Variable | Required | Description |
|----------|----------|-------------|
| `CLOUDFLARE_API_KEY` | Yes* | Global API Key |
| `CLOUDFLARE_EMAIL` | Yes* | Account email |

### API Token auth

| Variable | Required | Description |
|----------|----------|-------------|
| `CLOUDFLARE_API_TOKEN` | Yes* | Scoped API Token |

*One of Global API Key or API Token is required. If both are set, Global API Key takes priority.

### Account

| Variable | Required | Description |
|----------|----------|-------------|
| `CLOUDFLARE_ACCOUNT_ID` | Yes | Cloudflare account identifier |

## Namecheap

| Variable | Required | Description |
|----------|----------|-------------|
| `NAMECHEAP_API_USER` | Yes | API username |
| `NAMECHEAP_API_KEY` | Yes | API key |
| `NAMECHEAP_CLIENT_IP` | Yes | Whitelisted IP for API access |

## Fleet

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `FLEET_REGISTRY_PATH` | No | `/home/matt/fleet/data/registry.json` | Fleet app registry path |
| `FLEET_BINARY` | No | `fleet` | Fleet CLI binary path |
