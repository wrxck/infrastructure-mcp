# Changelog

## v1.2.0 (2026-03-29)

### Added
- **Interactive TUI** built with Ink (React for CLIs) — full infrastructure management without an AI agent
  - Dashboard-first interface showing all Cloudflare zones and Fleet apps
  - Domain onboarding wizard with confirmation before destructive actions
  - Zone detail view with DNS records and protection audit
  - Bulk protection audit across all zones
  - Fleet apps viewer
  - Settings screen with masked credential display
- **Setup wizard** with three experience levels (learner/comfortable/professional)
  - Learner mode encourages source code review before entering API keys
  - Adaptive credential input with contextual help
- **MCP-over-stdio client** — TUI communicates with Java MCP server via JSON-RPC, zero API duplication
- **Config system** — own config file (`~/.infrastructure-mcp.json`) with fallback to Claude Code's `~/.claude.json`
- **Table component** with Unicode box-drawing, dynamic column widths, and proper alignment

## v1.1.2 (2026-03-29)

### Added
- **DNS record retry logic** — retries up to 3 times with backoff on transient 403 errors during zone onboarding
- **Free WAF Managed Ruleset** — automatically discovers and deploys Cloudflare's free managed WAF rules
- **Bot Fight Mode** — proper API call via `PUT /zones/{zone_id}/bot_management` with JS detection and AI bot blocking
- **Managed Transforms** — enables `remove_x-powered-by_header`, `add_visitor_location_headers`, and `add_security_headers`
- **URL Normalization** — Cloudflare-type normalization on incoming requests
- **New zone settings:** `privacy_pass`, `browser_cache_ttl` (4 hours), `ip_geolocation`
- **HSTS improvements:** max_age increased to 1 year (31,536,000s), `preload: true` added
- **onboard_domain fix** — skips Namecheap steps when `migrateRecords: false` (supports non-Namecheap domains)
- MkDocs documentation site at infrastructure-mcp.hesketh.pro

### Removed
- `http2` setting (always on for proxied zones, not editable via API)
- `crawler_hints` setting (deprecated by Cloudflare, API returns unrecognized)
- `minify` setting (deprecated by Cloudflare, API accepts but no longer applies)

### Fixed
- DNS migration no longer silently fails on newly created zones (transient 403 retry)
- `onboard_domain` no longer errors when domain is not registered at Namecheap

## v1.1.1 (2026-03-29)

### Added
- **Global API Key authentication** — supports `CLOUDFLARE_API_KEY` + `CLOUDFLARE_EMAIL` as an alternative to scoped API tokens
- Interactive setup TUI (`--setup` flag)

## v1.1.0 (2026-03-28)

### Added
- `onboard_domain` tool — full domain onboarding pipeline
- `migrate_dns` tool — standalone DNS migration
- `apply_protection` tool — apply security/performance settings
- `cloudflare_get_protection_status` tool — audit protection settings
- Content sanitization for DNS record output (prevents prompt injection)

## v1.0.0 (2026-03-28)

Initial release.

- 12 MCP tools across Cloudflare, Namecheap, and Fleet
- Zone management, DNS queries, Fleet integration
- Rate limiting for all API calls
