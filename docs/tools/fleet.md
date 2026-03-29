# Fleet Tools

## fleet_list_apps

List all applications registered in Fleet.

**Parameters:** None

**Returns:** Array of app objects with name, directory, ports, and configuration.

---

## fleet_list_domains

List all domains across Fleet-registered applications.

**Parameters:** None

**Returns:** Object with:

- `domains` — all domains (including subdomains) across all apps
- `rootDomains` — deduplicated root domains

---

## fleet_run_command

Execute a Fleet CLI command.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `command` | string | Yes | Fleet command string (e.g. `status`, `health`, `logs myapp`) |

**Returns:** Command output as text.

!!! warning "Destructive"
    This tool can execute any Fleet command including `stop`, `restart`, and `remove`. It is annotated as destructive and will prompt for confirmation.
