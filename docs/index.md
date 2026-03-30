# Infrastructure MCP Server

A unified [Model Context Protocol](https://modelcontextprotocol.io) server and interactive terminal UI that orchestrates **Cloudflare**, **Namecheap**, and **Fleet** from a single interface. Built in Java 21 + TypeScript/Ink.

## Two ways to use it

- **With AI** — 12 MCP tools for Claude Code or any MCP-compatible client
- **Without AI** — interactive terminal UI with dashboard, wizards, and auditing

## What it does

- **Onboard domains** to Cloudflare with one command — creates zone, migrates DNS from Namecheap, updates nameservers, and applies 30+ security/performance settings
- **Query DNS** across both Cloudflare and Namecheap
- **Manage Fleet apps** — list apps, domains, and run Fleet CLI commands
- **Audit protection** — verify Cloudflare settings match recommended baselines

## Quick start

```bash
# Build MCP server
mvn clean package

# Option A: Use with Claude Code
java -jar target/infrastructure-mcp-*.jar --setup

# Option B: Use the interactive TUI
cd tui && npm install && npm start -- --setup
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
Claude Code / AI Assistant ──┐
                              ├──stdio──> Infrastructure MCP Server (Java 21)
Terminal UI (Ink/React) ──────┘                    │
                                    ├── Cloudflare API v4
                                    ├── Namecheap API
                                    └── Fleet CLI
```

Both the AI client and TUI communicate with the same Java MCP server over stdio. All business logic lives in one place — the TUI is a thin presentation layer with zero API duplication.

## Version

Current release: **v1.2.0** — [Changelog](reference/changelog.md)

126 tests (73 Java + 53 TypeScript)
