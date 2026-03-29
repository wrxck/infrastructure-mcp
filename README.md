# Infrastructure MCP Server

[![CI](https://github.com/wrxck/infrastructure-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/wrxck/infrastructure-mcp/actions/workflows/ci.yml)
[![Java 21](https://img.shields.io/badge/Java-21-blue)](https://openjdk.org/projects/jdk/21/)
[![MCP SDK](https://img.shields.io/badge/MCP_SDK-1.0.0-green)](https://modelcontextprotocol.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Docs](https://img.shields.io/badge/docs-infrastructure--mcp.hesketh.pro-purple)](https://infrastructure-mcp.hesketh.pro)

An [MCP (Model Context Protocol)](https://modelcontextprotocol.io/) server that orchestrates **Cloudflare**, **Namecheap**, and **Fleet** from a single interface. One command to onboard a domain — zone creation, DNS migration, nameserver cutover, and **30+ security hardening settings** applied automatically. All free-tier compatible.

## What happens when you say "onboard example.com"

```
1. Creates Cloudflare zone                         ✓ Zone created
2. Fetches all DNS records from Namecheap           ✓ 16 records found
3. Migrates records to Cloudflare (with retry)      ✓ 16/16 migrated
4. Updates nameservers at Namecheap                 ✓ NS switched
5. Applies 30+ protection settings:
   ├── SSL strict + HSTS preload (1 year)           ✓ SSL/TLS hardened
   ├── TLS 1.3 + 0-RTT + min TLS 1.2               ✓ Transport secured
   ├── Bot Fight Mode + JS detection + AI blocking  ✓ Bots blocked
   ├── Free WAF Managed Ruleset deployed            ✓ WAF active
   ├── DNSSEC enabled                               ✓ DNS authenticated
   ├── Managed transforms (strip X-Powered-By,      ✓ Headers hardened
   │   add security headers, visitor geolocation)
   ├── URL normalization                            ✓ Path canonicalized
   ├── Brotli + HTTP/3 + Early Hints                ✓ Speed optimized
   └── Aggressive caching + 4hr browser TTL         ✓ Cache configured
                                          Total: ~30 settings in <60 seconds
```

Every free-tier Cloudflare feature that improves security or performance — enabled, configured, and verified. No dashboard clicking, no missed settings, no "I'll do DNSSEC later."

## How it works

```mermaid
graph TD
    Client[Claude Code / LLM Client]
    Client -->|stdio| Server

    subgraph Server[Infrastructure MCP Server — 12 tools]
        Fleet[Fleet Client<br><i>registry.json + CLI</i>]
        Namecheap[Namecheap Client<br><i>XML API</i>]
        Cloudflare[Cloudflare REST Client<br><i>API v4 — zones, DNS, settings,<br>rulesets, bot mgmt, transforms</i>]
    end

    Fleet --> FleetAPI[Fleet Registry + CLI]
    Namecheap --> NCAPI[api.namecheap.com]
    Cloudflare --> CFAPI[api.cloudflare.com]
```

## Why this exists

Managing infrastructure across multiple providers means context-switching between dashboards, remembering different APIs, and running through the same checklist every time you onboard a domain. This server collapses that workflow into a single conversation.

MCP gives you **implicit security through human-in-the-loop approval**. When the LLM calls `onboard_domain`, it shows you exactly what it's about to do and waits for confirmation. Destructive tools are annotated with `destructiveHint: true`, so the client gates them behind explicit approval. Read-only tools run freely for information gathering. You get the speed of automation with the safety of manual review.

The other security layer is **content sanitization**. DNS records are attacker-controlled data — a TXT record could contain prompt injection attempts. Every piece of untrusted content is wrapped in cryptographic boundary markers with instructions to treat it as opaque data.

## Full protection suite

Every setting below is applied automatically during onboarding. All are Cloudflare free-tier compatible.

### SSL/TLS
| Setting | Value | Why |
|---------|-------|-----|
| SSL mode | **Strict** | Validates origin certificate, prevents MITM |
| Always Use HTTPS | On | 301 redirects all HTTP to HTTPS |
| Automatic HTTPS Rewrites | On | Fixes mixed content in page source |
| TLS 1.3 + 0-RTT | On | Fastest, most secure TLS with zero round-trip resumption |
| Minimum TLS Version | 1.2 | Rejects legacy TLS 1.0/1.1 connections |
| HSTS | 1 year, preload, includeSubDomains, nosniff | Eligible for browser HSTS preload lists |

### Security & WAF
| Setting | Value | Why |
|---------|-------|-----|
| Security Level | Medium | Challenges suspicious visitors via Cloudflare threat score |
| Browser Integrity Check | On | Blocks requests with missing or suspicious UA headers |
| Challenge TTL | 30 minutes | Balance between security and user friction |
| Bot Fight Mode | On + JS detection | Challenges known bots with JS challenge |
| AI Bot Blocking | Block | Blocks AI scrapers (GPTBot, CCBot, etc.) |
| Free WAF Managed Ruleset | Deployed | Cloudflare's curated WAF rules for common vulnerabilities |
| DDoS Protection | Always-on | Automatic L3/L4/L7 DDoS mitigation |
| DNSSEC | Enabled | Cryptographically signs DNS responses |
| Privacy Pass | On | Reduces challenge frequency for Privacy Pass token holders |

### Scrape Shield
| Setting | Value | Why |
|---------|-------|-----|
| Email Obfuscation | On | Hides email addresses from scrapers |
| Server Side Excludes | On | Hides `<!--sse-->` wrapped content from bots |
| Hotlink Protection | On | Blocks image hotlinking from other domains |

### Managed Transforms
| Transform | Direction | Effect |
|-----------|-----------|--------|
| Remove X-Powered-By | Response | Strips server technology fingerprint |
| Add Security Headers | Response | Adds CSP, X-Frame-Options, X-XSS-Protection |
| Add Visitor Location | Request | Adds CF-IPCountry, lat/lon to origin requests |

### Speed & Optimization
| Setting | Value | Why |
|---------|-------|-----|
| Brotli Compression | On | Smaller responses, faster page loads |
| HTTP/3 (QUIC) | On | Faster connections, especially on mobile |
| Early Hints (103) | On | Preload assets before main response |
| IP Geolocation | On | CF-IPCountry header for geo-aware apps |
| URL Normalization | Cloudflare, incoming | Canonicalizes URL paths to prevent cache poisoning |

### Caching & Network
| Setting | Value | Why |
|---------|-------|-----|
| Cache Level | Aggressive | Caches static content, ignores query strings |
| Browser Cache TTL | 4 hours | Reduces origin load without stale content risk |
| Always Online | On | Serves cached version if origin is down |
| IPv6 | On | Full IPv6 support on proxied records |
| WebSockets | On | WebSocket proxying for real-time apps |
| Opportunistic Encryption | On | Advertises HTTPS via Alt-Svc header |
| Onion Routing | On | Cloudflare .onion service for Tor users |
| 0-RTT | On | TLS session resumption without round trip |

## Tools

### Fleet
| Tool | Type | Description |
|------|:----:|-------------|
| `fleet_list_apps` | read | List all applications in the Fleet registry |
| `fleet_run_command` | write | Execute a Fleet CLI command |
| `fleet_list_domains` | read | List all domains across Fleet-registered apps |

### Namecheap
| Tool | Type | Description |
|------|:----:|-------------|
| `namecheap_list_domains` | read | List domains registered at Namecheap |
| `namecheap_get_dns` | read | Get DNS host records for a domain |
| `namecheap_get_nameservers` | read | Get nameserver configuration for a domain |

### Cloudflare
| Tool | Type | Description |
|------|:----:|-------------|
| `cloudflare_list_zones` | read | List all Cloudflare zones in the account |
| `cloudflare_get_dns` | read | Get DNS records for a Cloudflare zone |
| `cloudflare_get_protection_status` | read | Audit security and performance settings |

### Orchestration
| Tool | Type | Description |
|------|:----:|-------------|
| `onboard_domain` | write | Full domain onboarding: CF zone + DNS migration + NS update + 30+ protection settings |
| `migrate_dns` | write | Migrate DNS records from Namecheap to an existing Cloudflare zone |
| `apply_protection` | write | Apply Cloudflare security and performance settings |

## Quick start

### 1. Build

```bash
git clone https://github.com/wrxck/infrastructure-mcp.git
cd infrastructure-mcp

# Install library dependencies (required until published to Maven Central)
git clone https://github.com/wrxck/namecheap-mcp.git /tmp/namecheap-mcp
cd /tmp/namecheap-mcp && mvn install -DskipTests -q && cd -

git clone https://github.com/wrxck/cloudflare-mcp.git /tmp/cloudflare-mcp
cd /tmp/cloudflare-mcp && mvn install -DskipTests -q && cd -

# Build
mvn clean package
```

### 2. Setup

**Interactive** (recommended):

```bash
java -jar target/infrastructure-mcp-*.jar --setup
```

Walks you through entering credentials across 5 pages: Welcome, Cloudflare, Namecheap, Fleet, Summary.

**Manual** — add to `~/.claude.json`:

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
        "NAMECHEAP_CLIENT_IP": "your-ip"
      }
    }
  }
}
```

### 3. Use

```
> Onboard example.com to Cloudflare with full protection
> List all my Cloudflare zones and check their protection status
> Migrate DNS from Namecheap to Cloudflare for example.co.uk
> Show me all Fleet apps and their domains
```

## DNS migration

The `migrate_dns` tool automatically converts Namecheap DNS records to Cloudflare format:

- **A, AAAA, CNAME** records are proxied through Cloudflare (orange cloud) by default
- **MX, TXT, SRV, NS, CAA** records are never proxied (DNS only)
- **Mail-related hostnames** (mail, smtp, imap, pop, autodiscover, etc.) are never proxied
- **URL redirect and frame** records are skipped (not supported by Cloudflare API)
- **Multi-part TLDs** (co.uk, com.au, co.nz, etc.) are handled correctly
- **Automatic retry** — up to 3 attempts with backoff on transient 403 errors (new zone propagation)

## Configuration

### Cloudflare authentication

| Method | Variables | Header |
|--------|-----------|--------|
| **Global API Key** (recommended) | `CLOUDFLARE_API_KEY` + `CLOUDFLARE_EMAIL` | `X-Auth-Key` + `X-Auth-Email` |
| **Scoped API Token** | `CLOUDFLARE_API_TOKEN` | `Authorization: Bearer` |

If both are set, Global API Key takes priority.

### All environment variables

| Variable | Required | Default | Description |
|----------|:--------:|---------|-------------|
| `CLOUDFLARE_API_KEY` | \* | — | Cloudflare Global API Key |
| `CLOUDFLARE_EMAIL` | \* | — | Cloudflare account email |
| `CLOUDFLARE_API_TOKEN` | \* | — | Cloudflare scoped API token |
| `CLOUDFLARE_ACCOUNT_ID` | Yes | — | Cloudflare account ID |
| `NAMECHEAP_API_USER` | Yes | — | Namecheap API username |
| `NAMECHEAP_API_KEY` | Yes | — | Namecheap API key |
| `NAMECHEAP_CLIENT_IP` | Yes | — | Whitelisted IP for Namecheap API |
| `FLEET_REGISTRY_PATH` | No | `/home/matt/fleet/data/registry.json` | Fleet app registry path |
| `FLEET_BINARY` | No | `fleet` | Fleet CLI binary path |

\* Provide either `CLOUDFLARE_API_KEY` + `CLOUDFLARE_EMAIL` **or** `CLOUDFLARE_API_TOKEN`.

## Security

- **Content sanitization** — DNS record data is wrapped in cryptographic boundary markers to prevent prompt injection via malicious DNS records
- **Rate limiting** — sliding window rate limiters enforce Cloudflare (240/min) and Namecheap (20/min) API limits
- **Human-in-the-loop** — destructive tools annotated with `destructiveHint: true` for client-side approval gates
- **No credentials in output** — API tokens are never included in tool responses

## Documentation

Full documentation: [infrastructure-mcp.hesketh.pro](https://infrastructure-mcp.hesketh.pro)

## Building from source

```bash
mvn clean verify
```

Compiles, runs all 73 tests, and produces the shaded JAR.

## License

MIT
