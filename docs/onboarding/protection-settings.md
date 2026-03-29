# Protection Settings

The `apply_protection` step configures 30+ Cloudflare settings optimized for the free plan.

## SSL/TLS

| Setting | Value | Effect |
|---------|-------|--------|
| `ssl` | `strict` | Full (strict) SSL — validates origin certificate |
| `always_use_https` | `on` | 301 redirect all HTTP to HTTPS |
| `automatic_https_rewrites` | `on` | Rewrite `http://` links in page content to `https://` |
| `tls_1_3` | `on` | Enable TLS 1.3 |
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
| `security_level` | `medium` | Challenge suspicious visitors |
| `browser_check` | `on` | Block requests with missing/suspicious User-Agent |
| `challenge_ttl` | `1800` | Challenge solutions valid for 30 minutes |
| `email_obfuscation` | `on` | Hide email addresses from scrapers |
| `server_side_exclude` | `on` | Hide `<!--sse-->` content from bots |
| `hotlink_protection` | `on` | Block image hotlinking from other domains |
| `privacy_pass` | `on` | Reduce challenge frequency for Privacy Pass users |

## WAF & Bot Protection

| Feature | Method | Effect |
|---------|--------|--------|
| Bot Fight Mode | API: `PUT /bot_management` | Challenge known bot traffic |
| Free WAF Managed Ruleset | Ruleset deployment | Cloudflare's free managed WAF rules |
| DDoS Protection | Always-on | HTTP and network-layer DDoS mitigation |

The Free WAF Managed Ruleset is automatically discovered from account rulesets and deployed to the `http_request_firewall_managed` phase.

## Managed Transforms

| Transform | Direction | Effect |
|-----------|-----------|--------|
| `add_visitor_location_headers` | Request | Adds `CF-IPCountry`, latitude/longitude headers to origin |
| `remove_x-powered-by_header` | Response | Strips `X-Powered-By` header from responses |
| `add_security_headers` | Response | Adds security headers (CSP, X-Frame-Options, etc.) |

## Speed & Optimization

| Setting | Value | Effect |
|---------|-------|--------|
| `minify` | `js: on, css: on, html: on` | Minify JS, CSS, and HTML |
| `brotli` | `on` | Brotli compression |
| `early_hints` | `on` | HTTP 103 Early Hints for preloading |
| `http3` | `on` | HTTP/3 with QUIC |
| `ip_geolocation` | `on` | Add `CF-IPCountry` header |

!!! note
    `http2` is always enabled for proxied zones on all plans and cannot be toggled via API.

## Caching

| Setting | Value | Effect |
|---------|-------|--------|
| `cache_level` | `aggressive` | Cache static content ignoring query strings |
| `browser_cache_ttl` | `14400` | Browser cache: 4 hours |
| `always_online` | `on` | Serve stale cache if origin is down |

## Network

| Setting | Value | Effect |
|---------|-------|--------|
| `ipv6` | `on` | IPv6 on proxied records |
| `websockets` | `on` | WebSocket proxying |
| `opportunistic_encryption` | `on` | Advertise HTTPS over Alt-Svc |
| `opportunistic_onion` | `on` | Tor .onion routing |
| `0rtt` | `on` | TLS 1.3 0-RTT session resumption |
| URL Normalization | `cloudflare` type, `incoming` scope | Normalize URL paths |

## DNSSEC

DNSSEC is enabled via `PATCH /zones/{zone_id}/dnssec` with `{"status": "active"}`.

!!! info "DS record"
    After enabling DNSSEC, Cloudflare provides a DS record that should be added at the registrar. For Namecheap domains, this is handled automatically during nameserver migration.
