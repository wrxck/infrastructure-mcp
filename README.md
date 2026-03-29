# Infrastructure MCP Server

[![CI](https://github.com/wrxck/infrastructure-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/wrxck/infrastructure-mcp/actions/workflows/ci.yml)
[![Java 21](https://img.shields.io/badge/Java-21-blue)](https://openjdk.org/projects/jdk/21/)
[![MCP SDK](https://img.shields.io/badge/MCP_SDK-1.1.1-green)](https://modelcontextprotocol.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![GitHub release](https://img.shields.io/github/v/release/wrxck/infrastructure-mcp)](https://github.com/wrxck/infrastructure-mcp/releases)

An [MCP (Model Context Protocol)](https://modelcontextprotocol.io/) server that orchestrates **Cloudflare**, **Namecheap**, and **Fleet** from a single interface. Onboard domains, migrate DNS, and apply security hardening — all through natural language.

## How it works

```
┌─────────────────────────────────────────────────────────────────┐
│                     Claude Code / LLM Client                     │
│                          (MCP Client)                            │
└──────────────────────────────┬──────────────────────────────────┘
                               │ stdio
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Infrastructure MCP Server                      │
│                        12 MCP tools                              │
├──────────────────┬──────────────────┬───────────────────────────┤
│   Fleet Client   │ Namecheap Client │   Cloudflare REST Client  │
│  (registry.json  │   (XML API)      │      (API v4 JSON)        │
│   + CLI shell)   │                  │                           │
└────────┬─────────┴────────┬─────────┴─────────────┬─────────────┘
         ▼                  ▼                       ▼
   Fleet Registry    Namecheap API          Cloudflare API v4
   + fleet CLI       api.namecheap.com      api.cloudflare.com
```

## Why this exists

Managing infrastructure across multiple providers means context-switching between dashboards, remembering different APIs, and running through the same checklist every time you onboard a domain. I built this to collapse that workflow into a single conversation.

The key insight is that MCP gives you **implicit security through human-in-the-loop approval**. When Claude calls `onboard_domain`, it doesn't silently execute — it shows you exactly what it's about to do and waits for confirmation. Destructive tools (DNS migration, nameserver changes, protection settings) are annotated with `destructiveHint: true`, so the client knows to gate them behind explicit approval. Read-only tools (`list_zones`, `get_dns`) are marked `readOnlyHint: true` and can run freely for information gathering.

This means you get the speed of automation with the safety of manual review. The LLM handles the tedious orchestration (fetching records from Namecheap, converting formats, creating them in Cloudflare, updating nameservers) while you retain veto power over every mutating action. No YAML pipelines, no CI/CD complexity, no "I hope this script does what I think it does" — just a conversation where you can ask questions, adjust parameters, and confirm each step.

The other security layer is **content sanitization**. DNS records are attacker-controlled data — a TXT record could contain prompt injection attempts. Every piece of untrusted content returned by read tools is wrapped in cryptographic boundary markers with instructions to treat it as opaque data. This prevents a malicious DNS record from hijacking the conversation.

## Features

- **Domain onboarding** — single command to create a Cloudflare zone, migrate DNS records from Namecheap, update nameservers, and apply 25+ security/performance settings
- **DNS migration** — automatic Namecheap-to-Cloudflare record conversion with intelligent proxying (mail records unproxied, web records proxied)
- **Security hardening** — SSL strict mode, HSTS, TLS 1.3, DNSSEC, bot protection, DDoS rulesets, and more — all free-tier compatible
- **Fleet integration** — read app registry, list domains, run Fleet CLI commands
- **Library reuse** — depends on [cloudflare-mcp](https://github.com/wrxck/cloudflare-mcp) and [namecheap-mcp](https://github.com/wrxck/namecheap-mcp) as Maven libraries (no code duplication)
- **Content sanitization** — cryptographic boundary markers on untrusted DNS data to defend against prompt injection
- **Rate limiting** — Cloudflare (240 req/min) and Namecheap (20 req/min) rate limits enforced client-side

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
| `onboard_domain` | write | Full domain onboarding: CF zone + DNS migration + NS update + protection |
| `migrate_dns` | write | Migrate DNS records from Namecheap to an existing Cloudflare zone |
| `apply_protection` | write | Apply Cloudflare security and performance settings |

## Prerequisites

- **Java 21** or later
- **Cloudflare API token** — [create one here](https://dash.cloudflare.com/profile/api-tokens)
- **Namecheap API access** — [enable here](https://ap.www.namecheap.com/settings/tools/apiaccess)
- **Fleet** (optional) — only needed for Fleet tools

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

This produces `target/infrastructure-mcp-1.0.0.jar` — a self-contained executable JAR (18 MB).

### 2. Setup (interactive)

Run the built-in setup wizard — it walks you through entering credentials and registers with Claude Code automatically:

```bash
java -jar target/infrastructure-mcp-1.0.0.jar --setup
```

The wizard has 5 pages: Welcome, Cloudflare, Namecheap, Fleet, and Summary. Navigate with `enter` (next), `b` (back), and `q` (quit). Secrets are masked in the summary.

### 2b. Manual configuration (alternative)

If you prefer to configure manually, set the required environment variables:

```bash
export CLOUDFLARE_API_TOKEN='your-cloudflare-api-token'
export CLOUDFLARE_ACCOUNT_ID='your-cloudflare-account-id'
export NAMECHEAP_API_USER='your-namecheap-username'
export NAMECHEAP_API_KEY='your-namecheap-api-key'
export NAMECHEAP_CLIENT_IP='your-whitelisted-ip'
```

### 3. Register with Claude Code

```bash
claude mcp add --scope user --transport stdio infrastructure -- \
  java -jar /path/to/infrastructure-mcp-1.0.0.jar
```

Or add to `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "infrastructure": {
      "command": "java",
      "args": ["-jar", "/path/to/infrastructure-mcp-1.0.0.jar"],
      "env": {
        "CLOUDFLARE_API_TOKEN": "your-token",
        "CLOUDFLARE_ACCOUNT_ID": "your-account-id",
        "NAMECHEAP_API_USER": "your-username",
        "NAMECHEAP_API_KEY": "your-api-key",
        "NAMECHEAP_CLIENT_IP": "your-ip"
      }
    }
  }
}
```

### 4. Use

```
> List all my Fleet apps and their domains
> Show me the DNS records for example.co.uk on Namecheap
> Onboard example.co.uk to Cloudflare with full protection
> Check the protection status on all my Cloudflare zones
> Migrate DNS from Namecheap to Cloudflare for example.com
```

## Configuration

### Environment variables

| Variable | Description | Required | Default |
|----------|-------------|:--------:|---------|
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token (Bearer auth) | Yes | — |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account ID | Yes | — |
| `NAMECHEAP_API_USER` | Namecheap API username | Yes | — |
| `NAMECHEAP_API_KEY` | Namecheap API key | Yes | — |
| `NAMECHEAP_CLIENT_IP` | Whitelisted IP for Namecheap API | Yes | — |
| `FLEET_REGISTRY_PATH` | Path to Fleet's registry.json | No | `/home/matt/fleet/data/registry.json` |
| `FLEET_BINARY` | Path to fleet CLI binary | No | `fleet` |

## Protection settings

The `apply_protection` and `onboard_domain` tools apply the following Cloudflare settings (all free-tier compatible):

### SSL/TLS
| Setting | Value |
|---------|-------|
| SSL mode | Strict |
| Always Use HTTPS | On |
| Automatic HTTPS Rewrites | On |
| TLS 1.3 | On |
| Minimum TLS Version | 1.2 |
| HSTS | Enabled (max-age 180 days, includeSubDomains, nosniff) |

### Security
| Setting | Value |
|---------|-------|
| Security Level | Medium |
| Browser Integrity Check | On |
| Challenge TTL | 1800s |
| Email Obfuscation | On |
| Server Side Excludes | On |
| Hotlink Protection | On |
| Bot Fight Mode | Enabled |
| DDoS Managed Rulesets | Auto-enabled |
| DNSSEC | Enabled |

### Speed
| Setting | Value |
|---------|-------|
| Minify (JS, CSS, HTML) | All on |
| Brotli | On |
| Early Hints | On |
| HTTP/2 | On |
| HTTP/3 | On |

### Caching & Network
| Setting | Value |
|---------|-------|
| Cache Level | Aggressive |
| Always Online | On |
| Crawler Hints | On |
| IPv6 | On |
| WebSockets | On |
| Opportunistic Encryption | On |
| Onion Routing | On |
| 0-RTT | On |

## DNS migration

The `migrate_dns` tool automatically converts Namecheap DNS records to Cloudflare format:

- **A, AAAA, CNAME** records are proxied through Cloudflare (orange cloud) by default
- **MX, TXT, SRV, NS, CAA** records are never proxied (DNS only)
- **Mail-related hostnames** (mail, smtp, imap, pop, autodiscover, etc.) are never proxied
- **URL redirect and frame** records are skipped (not supported by Cloudflare API)
- **Multi-part TLDs** (co.uk, com.au, co.nz, etc.) are handled correctly

## Security

- **Content sanitization** — DNS record data (domain names, addresses, TXT values) is wrapped in cryptographic boundary markers to prevent prompt injection via malicious DNS records
- **Rate limiting** — sliding window rate limiters enforce Cloudflare (240/min) and Namecheap (20/min) API limits
- **Input validation** — required parameters are validated before API calls
- **No credentials in output** — API tokens are never included in tool responses

## Project structure

```
src/main/java/com/infrastructure/mcp/
├── InfrastructureMcpServer.java  # Entry point, stdio transport, tool registration
├── InfrastructureTools.java      # 12 MCP tool definitions and handlers
├── ServerConfig.java             # Environment variable configuration
├── FleetClient.java              # Fleet registry reader and CLI wrapper
├── DnsRecordMapper.java          # Namecheap → Cloudflare DNS record conversion
├── ProtectionSettings.java       # Cloudflare security/performance settings
├── ResultHelper.java             # Tool result builders and parameter extraction
├── ContentSanitizer.java         # Prompt injection defense
├── RateLimiter.java              # Sliding window rate limiter
└── SetupTui.java                 # Interactive paginated setup wizard

Library dependencies (used as Maven artifacts):
├── cloudflare-mcp                # CloudflareRestClient — typed Cloudflare API v4 client
└── namecheap-mcp                 # NamecheapClient — Namecheap XML API client
```

## Building from source

```bash
mvn clean verify
```

This compiles, runs all 61 tests, and produces the shaded JAR.

## License

MIT
