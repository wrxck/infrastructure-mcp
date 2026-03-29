# Cloudflare Tools

## cloudflare_list_zones

List all Cloudflare zones in the account.

**Parameters:** None

**Returns:** Array of zones with `id`, `name`, `status`, and `nameServers`.

**Example response:**
```json
[
  {
    "id": "abc123",
    "name": "example.com",
    "status": "active",
    "nameServers": ["rodrigo.ns.cloudflare.com", "wanda.ns.cloudflare.com"]
  }
]
```

---

## cloudflare_get_dns

Get DNS records for a Cloudflare zone.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `domain` | string | Yes | Domain name (e.g. `example.com`) |

**Returns:** Array of DNS records with `id`, `type`, `name`, `content`, `proxied`, `ttl`, and optional `priority`.

---

## cloudflare_get_protection_status

Audit the current security and performance settings for a zone against recommended baselines.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `domain` | string | Yes | Domain name |

**Returns:** Array of settings with `setting`, `category`, `desiredValue`, `currentValue`, and `status` (`ok` or `error`).

---

## onboard_domain

Full domain onboarding pipeline. Performs these steps in order:

1. Creates a new Cloudflare zone
2. Fetches DNS records from Namecheap
3. Migrates DNS records to Cloudflare (with retry on transient errors)
4. Updates nameservers at Namecheap to point to Cloudflare
5. Applies 30+ protection settings (SSL, security, WAF, speed, caching, network)

**Parameters:**

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `domain` | string | Yes | — | Domain to onboard |
| `migrateRecords` | boolean | No | `true` | Migrate DNS records from Namecheap |
| `applyProtection` | boolean | No | `true` | Apply Cloudflare protection settings |

**Returns:** Summary object with counts for records migrated/skipped, nameserver update status, and protection settings applied/failed.

!!! info "Retry logic"
    DNS record creation retries up to 3 times with backoff on transient 403 errors, which can occur when the zone hasn't fully propagated across Cloudflare's API nodes.

---

## migrate_dns

Migrate DNS records from Namecheap to an existing Cloudflare zone.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `domain` | string | Yes | Domain name |

!!! warning
    Nameservers must still point to Namecheap for this to work. Once nameservers are switched to Cloudflare, Namecheap's API will no longer serve DNS records.

---

## apply_protection

Apply Cloudflare security and performance settings to a zone. See [Protection Settings](../onboarding/protection-settings.md) for the full list.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `domain` | string | Yes | Domain name |
