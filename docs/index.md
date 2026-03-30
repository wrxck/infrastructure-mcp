# Infrastructure MCP Server

A unified [Model Context Protocol](https://modelcontextprotocol.io) server that orchestrates **Cloudflare**, **Namecheap**, and **Fleet** from a single interface. Built in Java 21 with the MCP SDK 1.0.0.

## What it does

Infrastructure MCP gives AI assistants (Claude Code, etc.) the tools to manage your entire domain infrastructure:

- **Onboard domains** to Cloudflare with one command — creates zone, migrates DNS from Namecheap, updates nameservers, and applies 30+ security/performance settings
- **Query DNS** across both Cloudflare and Namecheap
- **Manage Fleet apps** — list apps, domains, and run Fleet CLI commands
- **Audit protection** — verify Cloudflare settings match recommended baselines

## Quick start

```bash
# Build
mvn clean package

# Run (credentials via env vars)
java -jar target/infrastructure-mcp-1.1.2.jar

# Or install into Claude Code
java -jar target/infrastructure-mcp-1.1.2.jar --setup
```

See [Installation](getting-started/installation.md) for full setup instructions.

## Tools at a glance

| Tool | Description |
|------|-------------|
| `onboard_domain` | Full domain onboarding: CF zone + DNS migration + nameservers + protection |
| `cloudflare_list_zones` | List all Cloudflare zones |
| `cloudflare_get_dns` | Get DNS records for a zone |
| `cloudflare_get_protection_status` | Audit security/performance settings |
| `migrate_dns` | Migrate DNS records from Namecheap to Cloudflare |
| `apply_protection` | Apply Cloudflare protection settings to a zone |
| `namecheap_list_domains` | List Namecheap domains |
| `namecheap_get_dns` | Get Namecheap DNS records |
| `namecheap_get_nameservers` | Get Namecheap nameserver config |
| `fleet_list_apps` | List Fleet-registered applications |
| `fleet_list_domains` | List all domains across Fleet apps |
| `fleet_run_command` | Execute a Fleet CLI command |

## Architecture

```
Claude Code / AI Assistant
        │
        ▼
  Infrastructure MCP Server (Java 21, MCP SDK 1.0.0)
        │
        ├── Cloudflare API v4 (zones, DNS, settings, rulesets, transforms)
        ├── Namecheap API (domains, DNS, nameservers)
        └── Fleet CLI (apps, domains, nginx)
```

## Version

Current release: **v1.2.0** — [Changelog](reference/changelog.md)
