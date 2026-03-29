# Tools Overview

Infrastructure MCP exposes 12 tools organized by provider.

## Tool annotations

Each tool includes MCP annotations indicating its behavior:

- **Read-only** tools (`readOnlyHint: true`) — safe to call, no side effects
- **Destructive** tools (`destructiveHint: true`) — modify external state, require confirmation

## Cloudflare tools

| Tool | Type | Description |
|------|------|-------------|
| [`cloudflare_list_zones`](cloudflare.md#cloudflare_list_zones) | Read | List all zones in the account |
| [`cloudflare_get_dns`](cloudflare.md#cloudflare_get_dns) | Read | Get DNS records for a zone |
| [`cloudflare_get_protection_status`](cloudflare.md#cloudflare_get_protection_status) | Read | Audit security/performance settings |
| [`onboard_domain`](cloudflare.md#onboard_domain) | Write | Full domain onboarding pipeline |
| [`migrate_dns`](cloudflare.md#migrate_dns) | Write | Migrate DNS from Namecheap to Cloudflare |
| [`apply_protection`](cloudflare.md#apply_protection) | Write | Apply protection settings to a zone |

## Namecheap tools

| Tool | Type | Description |
|------|------|-------------|
| [`namecheap_list_domains`](namecheap.md#namecheap_list_domains) | Read | List registered domains |
| [`namecheap_get_dns`](namecheap.md#namecheap_get_dns) | Read | Get DNS host records |
| [`namecheap_get_nameservers`](namecheap.md#namecheap_get_nameservers) | Read | Get nameserver configuration |

## Fleet tools

| Tool | Type | Description |
|------|------|-------------|
| [`fleet_list_apps`](fleet.md#fleet_list_apps) | Read | List registered applications |
| [`fleet_list_domains`](fleet.md#fleet_list_domains) | Read | List all domains across apps |
| [`fleet_run_command`](fleet.md#fleet_run_command) | Write | Execute a Fleet CLI command |
