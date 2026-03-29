# Namecheap Tools

## namecheap_list_domains

List domains registered at Namecheap.

**Parameters:**

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `page` | integer | No | `1` | Page number |
| `pageSize` | integer | No | `100` | Results per page (max 100) |

**Returns:** List of domains with registration details.

---

## namecheap_get_dns

Get DNS host records for a Namecheap domain.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `domain` | string | Yes | Domain name (e.g. `example.com`) |

**Returns:** Array of DNS host records with type, name, address, TTL, and MX priority.

!!! note
    This only works while nameservers point to Namecheap. After switching to Cloudflare, use `cloudflare_get_dns` instead.

---

## namecheap_get_nameservers

Get nameserver configuration for a Namecheap domain.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `domain` | string | Yes | Domain name |

**Returns:** Current nameserver list and whether using Namecheap defaults or custom nameservers.
