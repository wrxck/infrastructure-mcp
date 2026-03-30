# infrastructure-tui

[![npm](https://img.shields.io/npm/v/infrastructure-tui)](https://www.npmjs.com/package/infrastructure-tui)
[![Node 20](https://img.shields.io/badge/Node-20-339933)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/wrxck/infrastructure-mcp/blob/main/LICENSE)

Interactive terminal UI for managing **Cloudflare**, **Namecheap**, and **Fleet** infrastructure. Dashboard-first design with domain onboarding, DNS management, and security auditing — no AI agent required.

Built with [Ink](https://github.com/vadimdemedes/ink) (React for CLIs). Communicates with the [Infrastructure MCP Server](https://github.com/wrxck/infrastructure-mcp) over stdio.

## Install

```bash
npx infrastructure-tui
```

Or install globally:

```bash
npm install -g infrastructure-tui
infrastructure-tui
```

**Requires:** Java 21+ (for the MCP server subprocess) and the [infrastructure-mcp JAR](https://github.com/wrxck/infrastructure-mcp).

## First run

```bash
npx infrastructure-tui --setup
```

The setup wizard guides you through:

1. **Experience level** — adapts the interface to your knowledge
2. **Source code review** — encourages reviewing the code before entering credentials (learner mode)
3. **Credentials** — Cloudflare API key, Namecheap API key, Fleet config
4. **Connection test** — verifies the MCP server starts correctly

Config is saved to `~/.infrastructure-mcp.json` with `0600` permissions.

## Features

- **Dashboard** — see all Cloudflare zones and Fleet apps at a glance
- **Domain onboarding** — create zone, migrate DNS, apply 30+ security settings
- **Zone detail** — DNS records table + full protection audit
- **Bulk audit** — verify protection across all zones
- **Fleet viewer** — list apps and domains

## Keyboard shortcuts

| Key | Action |
|-----|--------|
| `up/dn` | Navigate |
| `Enter` | Drill into zone |
| `o` | Onboard domain |
| `a` | Audit all zones |
| `r` | Refresh |
| `s` | Settings |
| `q` | Quit |

## Options

```
--jar <path>     Path to infrastructure-mcp JAR (auto-discovered if omitted)
--config <path>  Config file path (default: ~/.infrastructure-mcp.json)
--setup          Force re-run setup wizard
--version        Show version
--help           Show help
```

## Documentation

Full docs: [infrastructure-mcp.hesketh.pro](https://infrastructure-mcp.hesketh.pro)

## License

MIT
