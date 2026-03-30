# Protection Settings

The `apply_protection` step configures ~30 Cloudflare settings optimized for the free plan. This includes zone settings, WAF rulesets, bot management, managed transforms, DNSSEC, and URL normalization.

## SSL/TLS

| Setting | Value | Effect |
|---------|-------|--------|
| `ssl` | `strict` | Full (strict) SSL — validates origin certificate |
| `always_use_https` | `on` | 301 redirect all HTTP to HTTPS |
| `automatic_https_rewrites` | `on` | Rewrite `http://` links in page content to `https://` |
| `tls_1_3` | `on` | Enable TLS 1.3 (Cloudflare may upgrade to `zrt` when 0-RTT is also enabled) |
| `min_tls_version` | `1.2` | Reject connections below TLS 1.2 |
| `security_header` (HSTS) | See below | HTTP Strict Transport Security |

### HSTS configuration

```json
{
  "strict_transport_security": {
    "enabled": true,
    "max_age": 31536000,
    "include_subdomains": true,
    "preload": true,
    "nosniff": true
  }
}
```

- **max_age:** 1 year (31,536,000 seconds)
- **preload:** Eligible for browser HSTS preload lists
- **nosniff:** Adds `X-Content-Type-Options: nosniff`

## Security

| Setting | Value | Effect |
|---------|-------|--------|
| `security_level` | `medium` | Challenge suspicious visitors via Cloudflare threat score |
| `browser_check` | `on` | Block requests with missing/suspicious User-Agent |
| `challenge_ttl` | `1800` | Challenge solutions valid for 30 minutes |
| `email_obfuscation` | `on` | Hide email addresses from scrapers |
| `server_side_exclude` | `on` | Hide `<!--sse-->` content from bots |
| `hotlink_protection` | `on` | Block image hotlinking from other domains |
| `privacy_pass` | `on` | Reduce challenge frequency for Privacy Pass users |

## WAF & Bot Protection

| Feature | API | Effect |
|---------|-----|--------|
| Bot Fight Mode | `PUT /zones/{id}/bot_management` | JS challenge for known bots, AI bot blocking enabled |
| Free WAF Managed Ruleset | Ruleset API (auto-discovered) | Cloudflare's curated WAF rules for common vulnerabilities |
| DDoS Protection | Always-on | Automatic L3/L4/L7 DDoS mitigation (no API call needed) |

**Bot Fight Mode** is configured with three features enabled:

- `fight_mode: true` — challenges known bot traffic with JS challenge
- `enable_js: true` — injects JS detection snippet (required for fight mode)
- `ai_bots_protection: block` — blocks AI scrapers (GPTBot, CCBot, etc.)

**Free WAF Managed Ruleset** is auto-discovered from account-level rulesets by matching `kind: managed` and `phase: http_request_firewall_managed`, then deployed to the zone. This avoids hardcoding the ruleset ID.

## DNSSEC

DNSSEC is enabled via `PATCH /zones/{zone_id}/dnssec` with `{"status": "active"}`.

!!! warning "DS record required"
    After enabling DNSSEC, you must add the DS record at your domain registrar. Cloudflare provides the DS record details in the dashboard under **DNS > Settings > DNSSEC**. This step cannot be automated via the Namecheap API — it must be done manually or will take effect once Cloudflare is the authoritative DNS.

## Managed Transforms

These are pre-built Cloudflare header transformations enabled via `PATCH /zones/{id}/managed_headers`.

| Transform | Direction | Effect |
|-----------|-----------|--------|
| `add_visitor_location_headers` | Request | Adds `CF-IPCountry`, latitude/longitude headers to origin |
| `remove_x-powered-by_header` | Response | Strips `X-Powered-By` header (hides server technology) |
| `add_security_headers` | Response | Adds security headers (X-Content-Type-Options, X-Frame-Options, etc.) |

## Speed & Optimization

| Setting | Value | Effect |
|---------|-------|--------|
| `brotli` | `on` | Brotli compression for smaller responses |
| `early_hints` | `on` | HTTP 103 Early Hints for preloading assets |
| `http3` | `on` | HTTP/3 with QUIC for faster connections |
| `ip_geolocation` | `on` | Adds `CF-IPCountry` header to all requests |

!!! note
    `http2` is always enabled for proxied zones on all plans and cannot be toggled via API. `minify` (Auto Minify) has been deprecated by Cloudflare — the API accepts the setting but it no longer takes effect.

## Caching

| Setting | Value | Effect |
|---------|-------|--------|
| `cache_level` | `aggressive` | Cache static content, ignore query strings |
| `browser_cache_ttl` | `14400` | Browser cache TTL: 4 hours |
| `always_online` | `on` | Serve cached version from Internet Archive if origin is down |

## Network

| Setting | Value | Effect |
|---------|-------|--------|
| `ipv6` | `on` | IPv6 support on proxied records |
| `websockets` | `on` | WebSocket proxying to origin |
| `opportunistic_encryption` | `on` | Advertise HTTPS via Alt-Svc header |
| `opportunistic_onion` | `on` | Cloudflare .onion service for Tor users |
| `0rtt` | `on` | TLS 1.3 0-RTT session resumption (reduces latency) |

## URL Normalization

Enabled via `PUT /zones/{id}/url_normalization` with `{"type": "cloudflare", "scope": "incoming"}`.

Normalizes incoming URL paths to a canonical form, preventing cache poisoning via URL encoding tricks (e.g., `/path/../other` or `/%2e%2e/other`).

## Summary

| Category | Count | Method |
|----------|-------|--------|
| SSL/TLS zone settings | 6 | `PATCH /settings/{id}` |
| Security zone settings | 7 | `PATCH /settings/{id}` |
| Speed zone settings | 4 | `PATCH /settings/{id}` |
| Caching zone settings | 3 | `PATCH /settings/{id}` |
| Network zone settings | 5 | `PATCH /settings/{id}` |
| Bot Fight Mode | 1 | `PUT /bot_management` |
| WAF Managed Ruleset | 1 | `PUT /rulesets/phases/.../entrypoint` |
| DDoS Protection | 1 | Always-on (no API call) |
| DNSSEC | 1 | `PATCH /dnssec` |
| Managed Transforms | 3 | `PATCH /managed_headers` |
| URL Normalization | 1 | `PUT /url_normalization` |
| **Total** | **~33** | |
