# Infrastructure TUI — Design Spec

**Version:** 1.2.0
**Date:** 2026-03-29
**Status:** Draft

## Overview

An interactive terminal UI built with Ink (React for CLIs) that provides dashboard-first infrastructure management. It communicates with the existing Java MCP server over stdio — no API logic duplication. Lives at `tui/` in the infrastructure-mcp repo.

Users get full manual control over domain onboarding, DNS migration, protection auditing, and Fleet management without needing an AI agent.

## Architecture

```
[Ink TUI (TypeScript)] --stdio/JSON-RPC--> [Java MCP Server] --HTTP--> [Cloudflare/Namecheap]
                                                              --CLI-->  [Fleet]
```

The TUI is a thin presentation layer. All business logic stays in the Java MCP server. The TUI spawns `java -jar infrastructure-mcp-*.jar` as a child process and speaks the MCP protocol (JSON-RPC over stdio) to invoke tools.

### Why This Architecture

- Zero API logic duplication — one source of truth for Cloudflare/Namecheap/Fleet operations
- Every MCP tool is automatically available to the TUI
- The Java server already handles rate limiting, retry logic, content sanitization, auth
- Testing the TUI is purely UI testing — mock the MCP client

## Directory Structure

```
tui/
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── bin/
│   └── cli.ts                 Entry point, arg parsing, JAR discovery
├── src/
│   ├── app.tsx                Main app — screen router, keyboard handler
│   ├── mcp-client.ts          Spawns Java JAR, JSON-RPC over stdio
│   ├── config.ts              Config loader (own file → claude.json fallback)
│   ├── screens/
│   │   ├── setup.tsx           First-run wizard (experience, credentials, review nudge)
│   │   ├── dashboard.tsx       Main dashboard — zones table, Fleet apps, actions
│   │   ├── onboard.tsx         Domain onboarding wizard (step-by-step with confirmation)
│   │   ├── zone-detail.tsx     Zone drill-down — DNS records, protection audit
│   │   ├── fleet.tsx           Fleet apps and domains view
│   │   ├── audit.tsx           Bulk protection audit across all zones
│   │   └── settings.tsx        Edit config, re-run setup
│   ├── components/
│   │   ├── table.tsx           Data table with proper alignment (see Table Rendering)
│   │   ├── status-badge.tsx    Colored status indicators (active/pending/error)
│   │   ├── spinner.tsx         Loading spinner for async operations
│   │   ├── confirm.tsx         Yes/No confirmation for destructive actions
│   │   ├── header.tsx          App header with breadcrumb navigation
│   │   ├── key-hint.tsx        Keyboard shortcut hints bar
│   │   └── text-input.tsx      Styled text input with masking for secrets
│   └── hooks/
│       ├── use-mcp.ts          Call MCP tools, manage loading/error/result state
│       └── use-config.ts       Read/write config, detect first run
└── tests/
    ├── mcp-client.test.ts      MCP protocol framing, tool call/response
    ├── config.test.ts           Config loading, fallback, write
    ├── screens/
    │   ├── setup.test.tsx       Setup wizard flow, experience levels
    │   ├── dashboard.test.tsx   Dashboard rendering, navigation
    │   ├── onboard.test.tsx     Onboard wizard steps, confirmation
    │   ├── zone-detail.test.tsx Zone detail rendering
    │   ├── fleet.test.tsx       Fleet screen rendering
    │   ├── audit.test.tsx       Bulk audit rendering
    │   └── settings.test.tsx    Settings screen
    └── components/
        ├── table.test.tsx       Column alignment, truncation, Unicode borders
        └── confirm.test.tsx     Confirm dialog interaction
```

## MCP Client (`mcp-client.ts`)

### Responsibilities

- Spawn `java -jar <path>` as a child process with env vars from config
- Implement MCP JSON-RPC protocol over stdio (initialize handshake, tool/call, notifications)
- Expose a typed async API: `callTool(name: string, args: Record<string, unknown>): Promise<ToolResult>`
- Handle connection lifecycle: start, health check, graceful shutdown
- Parse content sanitization markers from responses (strip boundary tokens for display)

### Interface

```typescript
interface McpClient {
  connect(): Promise<void>;             // Spawn process, MCP initialize handshake
  callTool(name: string, args?: Record<string, unknown>): Promise<ToolResult>;
  listTools(): Promise<ToolInfo[]>;     // tools/list
  isConnected(): boolean;
  disconnect(): Promise<void>;          // Graceful shutdown
}

interface ToolResult {
  content: string;                      // Parsed text content
  isError: boolean;
}
```

### Error Handling

- If the Java process fails to start: show clear error with JAR path and suggestion to check Java installation
- If a tool call fails: surface the error message in the UI, don't crash
- If the process dies mid-session: attempt reconnect once, then show error screen

## Config (`config.ts`)

### Load Order

1. `~/.infrastructure-mcp.json` (own config)
2. `~/.claude.json` → `mcpServers.infrastructure-mcp.env` (Claude Code config)
3. If neither found: launch setup wizard

### Config File Format (`~/.infrastructure-mcp.json`)

```json
{
  "jarPath": "/home/matt/mcp/infrastructure-mcp/target/infrastructure-mcp-1.2.0.jar",
  "env": {
    "CLOUDFLARE_API_KEY": "...",
    "CLOUDFLARE_EMAIL": "...",
    "CLOUDFLARE_ACCOUNT_ID": "...",
    "NAMECHEAP_API_USER": "...",
    "NAMECHEAP_API_KEY": "...",
    "NAMECHEAP_CLIENT_IP": "..."
  },
  "experienceLevel": "learner"
}
```

### JAR Discovery

When `jarPath` is not set or the file doesn't exist, search in order:

1. `--jar` CLI flag
2. `./target/infrastructure-mcp-*.jar` (repo checkout)
3. `../infrastructure-mcp/target/infrastructure-mcp-*.jar` (sibling dir)
4. Prompt user for path

## Screens

### Setup Wizard (`setup.tsx`)

Launched on first run (no config found) or via settings screen.

**Step 1 — Welcome**

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   Infrastructure MCP                                            │
│                                                                 │
│   Manage your Cloudflare zones, DNS records, and Fleet apps     │
│   from the terminal. This tool talks to the Cloudflare and      │
│   Namecheap APIs on your behalf to onboard domains, migrate     │
│   DNS, and apply security hardening.                            │
│                                                                 │
│   Source: https://github.com/wrxck/infrastructure-mcp           │
│                                                                 │
│                                              [Enter] Continue   │
└─────────────────────────────────────────────────────────────────┘
```

**Step 2 — Experience Level**

```
  What best describes you?

  › I'm learning about infrastructure and want guidance
    I'm comfortable managing DNS and cloud services
    I'm a DevOps professional — just give me the fields
```

This choice affects:
- **Learner:** Shows explanations for every credential field, links to where to find them, encourages source code review before entering keys
- **Comfortable:** Shows brief descriptions, no hand-holding
- **Professional:** Just labels and input fields, fastest path

**Step 3 — Source Code Review (learner only)**

```
  Before entering API keys, we'd encourage you to review the
  source code to understand exactly what this tool does with
  your credentials. This is good security practice, and you'll
  learn a lot about how infrastructure APIs work.

  Key files to review:
    src/main/java/.../InfrastructureTools.java  — what tools do
    src/main/java/.../CloudflareRestClient.java — API calls made
    src/main/java/.../ServerConfig.java         — how creds are used

  This tool never sends credentials anywhere except the official
  Cloudflare and Namecheap API endpoints. No telemetry, no
  analytics, no third-party services.

  › I've reviewed the source code
    I'll review it later
    Skip
```

**Step 4 — Credentials**

Paginated by provider: Cloudflare (auth type selector, then fields), Namecheap, Fleet (optional). Learner mode shows a one-liner per field explaining what it is and where to find it.

Secret fields (API keys) use masked input (shows `••••••••` with last 4 chars visible).

**Step 5 — JAR Location**

Auto-discovers. If not found, prompts for path. Validates the file exists and is a JAR.

**Step 6 — Test Connection**

Attempts to spawn the MCP server and call `cloudflare_list_zones`. Shows success/failure with actionable error messages.

**Step 7 — Save**

Shows masked summary of all values. Save to `~/.infrastructure-mcp.json`.

### Dashboard (`dashboard.tsx`)

The main screen. Loads data on mount by calling `cloudflare_list_zones` and `fleet_list_domains`.

**Layout:**

```
 Infrastructure MCP v1.2.0                          q quit  s settings  ? help
─────────────────────────────────────────────────────────────────────────────────

 Cloudflare Zones
 ┌───────────────────────────┬──────────┬──────────┬────────────┬────────────┐
 │ Domain                    │ Status   │ Records  │ Protection │ SSL        │
 ├───────────────────────────┼──────────┼──────────┼────────────┼────────────┤
 │ matthesketh.pro           │ ● active │ 16       │ ✓ all      │ strict     │
 │ abmanandvan.co.uk         │ ● active │ 3        │ ✓ all      │ strict     │
 │ hostclaw.app              │ ● active │ 4        │ ✓ all      │ strict     │
 │ hesketh.pro               │ ● active │ 7        │ ✓ all      │ strict     │
 │ heskethweb.design         │ ● active │ 6        │ ✓ all      │ strict     │
 │ saasisde.ad               │ ● active │ 1        │ ✓ all      │ strict     │
 │ trustedpets.co.uk         │ ● active │ 3        │ ✓ all      │ strict     │
 │ leelasladybirds.co.uk     │ ○ pend.  │ 3        │ ✓ all      │ strict     │
 └───────────────────────────┴──────────┴──────────┴────────────┴────────────┘

 Fleet Apps
 ┌───────────────────────────┬───────────────────────────────────────────────┐
 │ App                       │ Domains                                       │
 ├───────────────────────────┼───────────────────────────────────────────────┤
 │ personal-site             │ matthesketh.pro, www.matthesketh.pro          │
 │ ab-man-and-van            │ abmanandvan.co.uk, www.abmanandvan.co.uk     │
 └───────────────────────────┴───────────────────────────────────────────────┘

 ↑↓ select   Enter details   o onboard   a audit all   r refresh
```

**Keyboard:**
- `↑` / `↓` — move selection in zones table
- `Enter` — drill into selected zone (zone-detail screen)
- `o` — open onboard wizard
- `a` — run bulk protection audit
- `r` — refresh all data
- `s` — settings
- `q` — quit
- `?` — help overlay

### Zone Detail (`zone-detail.tsx`)

Calls `cloudflare_get_dns` and `cloudflare_get_protection_status` for the selected zone.

**Layout:**

```
 ← Back                                    matthesketh.pro (● active)
─────────────────────────────────────────────────────────────────────────────────

 DNS Records (16)
 ┌────────┬──────────────────────────────┬─────────────────────┬─────────┐
 │ Type   │ Name                         │ Content             │ Proxied │
 ├────────┼──────────────────────────────┼─────────────────────┼─────────┤
 │ A      │ matthesketh.pro              │ 194.164.93.168      │ ●       │
 │ CNAME  │ www.matthesketh.pro          │ matthesketh.pro     │ ●       │
 │ CNAME  │ blog.matthesketh.pro         │ matthesketh.pro     │ ●       │
 │ TXT    │ matthesketh.pro              │ v=spf1 include:...  │ ○       │
 │ ...    │                              │                     │         │
 └────────┴──────────────────────────────┴─────────────────────┴─────────┘

 Protection Audit
 ┌──────────────────────────────┬────────────┬────────────┬──────────┐
 │ Setting                      │ Category   │ Expected   │ Status   │
 ├──────────────────────────────┼────────────┼────────────┼──────────┤
 │ ssl                          │ SSL        │ strict     │ ✓ ok     │
 │ always_use_https             │ SSL        │ on         │ ✓ ok     │
 │ tls_1_3                      │ SSL        │ on         │ ✓ ok     │
 │ ...                          │            │            │          │
 └──────────────────────────────┴────────────┴────────────┴──────────┘

 Esc back   p apply protection   ↑↓ scroll
```

### Onboard Wizard (`onboard.tsx`)

Step-by-step domain onboarding with confirmation before each destructive step.

**Steps:**

1. Enter domain name
2. Confirm: "This will create a Cloudflare zone, migrate DNS from Namecheap, update nameservers, and apply all protection settings. Continue? [y/n]"
   - Option to disable DNS migration (for non-Namecheap domains)
3. Progress view — shows each step as it executes with live status
4. Results summary — records migrated, protection applied, any errors
5. Option to drill into zone detail to verify

### Audit Screen (`audit.tsx`)

Calls `cloudflare_get_protection_status` for every zone in parallel (sequential MCP calls, but displayed as a unified progress view).

Shows a summary grid: which zones pass, which have mismatches, drill into any zone for details.

### Settings Screen (`settings.tsx`)

- View current config (masked secrets)
- Edit individual values
- Re-run setup wizard
- Test connection

## Table Component (`table.tsx`)

Tables are the primary data display. They must render correctly at all terminal widths.

### Rendering Rules

- **Unicode box-drawing characters** — `┌ ┐ └ ┘ ├ ┤ ┬ ┴ ┼ │ ─` for borders
- **Column width calculation** — measure actual content width of every cell in a column, take the max, add 1 char padding each side. Use `string-width` npm package to handle Unicode/emoji correctly.
- **Minimum column width** — header text width + 2 padding, never narrower than the header
- **Terminal overflow** — if total table width exceeds terminal columns, truncate the widest text column with `…`. Never wrap within a cell. Never break box-drawing alignment.
- **Row highlighting** — selected row gets inverted colors (Ink `<Box>` with `backgroundColor`)
- **Status indicators** — `●` green for active/ok, `○` dim for pending, `✗` red for error. Never raw text like "active" when a badge fits.

### Implementation

The `<Table>` component accepts:

```typescript
interface TableProps {
  columns: { key: string; header: string; width?: number; align?: 'left' | 'right' }[];
  rows: Record<string, string | number>[];
  selectedIndex?: number;
  maxWidth?: number;           // defaults to terminal width
}
```

Column widths are computed on every render from cell content. The component handles its own border drawing — no dependency on external table libraries that might misalign.

## Testing Strategy

### Framework

Vitest + `ink-testing-library` for component tests.

### What to Test

**MCP Client:**
- JSON-RPC message framing (serialize/deserialize)
- Tool call → response mapping
- Error handling (process crash, malformed response)
- Connection lifecycle (connect, disconnect, reconnect)

**Config:**
- Load from own file
- Fallback to claude.json
- Missing config triggers setup
- Write config file
- Masked secret display

**Screens:**
- Each screen renders without crashing given mock MCP data
- Keyboard navigation works (arrow keys, enter, escape)
- Setup wizard flows through all steps in each experience level
- Onboard wizard shows confirmation before destructive action
- Dashboard populates from MCP tool results

**Table Component:**
- Columns align correctly with varying content widths
- Unicode characters don't break alignment (use `string-width`)
- Truncation with `…` when content exceeds available width
- Selected row highlighting
- Empty table state

### Mock Strategy

`mcp-client.ts` is injected via React context. Tests provide a mock implementation that returns canned responses for each tool name. No actual Java process spawned during tests.

## Dependencies

```
ink                   — React for CLI
ink-text-input        — text input component
ink-select-input      — select/radio input
ink-spinner           — loading spinner
react                 — React 18
string-width          — accurate Unicode string width measurement
meow                  — CLI arg parsing
vitest                — test runner
ink-testing-library   — render Ink components in tests
```

## CLI Interface

```
infrastructure-tui [options]

Options:
  --jar <path>    Path to infrastructure-mcp JAR (auto-discovered if omitted)
  --config <path> Path to config file (default: ~/.infrastructure-mcp.json)
  --setup         Force re-run setup wizard
  --version       Show version
  --help          Show help
```

## Installation

**From repo (development):**
```bash
cd tui && npm install && npm start
```

**Published (future):**
```bash
npx infrastructure-tui
```

Requires Java 21+ installed for the MCP server subprocess.

## Out of Scope for v1.2.0

- Direct DNS record editing (use Cloudflare dashboard or MCP server via Claude)
- Custom WAF rule management
- Multi-account support
- Namecheap domain purchasing
- Real-time log streaming from Fleet
