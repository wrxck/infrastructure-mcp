# Changelog

## v1.1.2 (2026-03-29)

### Added
- **DNS record retry logic** — retries up to 3 times with backoff on transient 403 errors during zone onboarding
- **Free WAF Managed Ruleset** — automatically discovers and deploys Cloudflare's free managed WAF rules
- **Bot Fight Mode** — proper API call via `PUT /zones/{zone_id}/bot_management`
- **Managed Transforms** — enables `remove_x-powered-by_header`, `add_visitor_location_headers`, and `add_security_headers`
- **URL Normalization** — Cloudflare-type normalization on incoming requests
- **New zone settings:** `privacy_pass`, `browser_cache_ttl` (4 hours), `ip_geolocation`
- **HSTS improvements:** max_age increased to 1 year (31,536,000s), `preload: true` added
- MkDocs documentation site

### Removed
- `http2` setting (always on for proxied zones, not editable via API)
- `crawler_hints` setting (deprecated by Cloudflare)

### Fixed
- DNS migration no longer silently fails on newly created zones

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
