# DNS Migration

The DNS migration step converts Namecheap DNS records to Cloudflare format and creates them in the target zone.

## Record type mapping

| Namecheap Type | Cloudflare Type | Notes |
|----------------|-----------------|-------|
| A | A | Direct mapping |
| AAAA | AAAA | Direct mapping |
| CNAME | CNAME | Direct mapping |
| MX | MX | Priority preserved |
| TXT | TXT | Direct mapping |
| SRV | SRV | Direct mapping |
| URL Redirect (301) | — | Skipped (use Page Rules or Redirect Rules) |
| URL Frame | — | Skipped |
| NS (@ host) | — | Skipped (Cloudflare manages root NS) |

## Proxy behavior

Records are proxied through Cloudflare (orange cloud) by default, except:

- **MX records** — cannot be proxied
- **TXT records** — cannot be proxied
- **SRV records** — cannot be proxied

A and CNAME records pointing to the origin server are proxied to enable Cloudflare's CDN and security features.

## TTL handling

- Proxied records use automatic TTL (`ttl: 1`)
- Non-proxied records preserve the original TTL from Namecheap
- Namecheap's minimum TTL (60s) maps to 60 in Cloudflare

## Error handling

### Transient 403 errors

Newly created zones may not be immediately available across all Cloudflare API nodes. The migration uses automatic retry:

- **3 attempts** per record
- **Backoff:** 2 seconds, then 4 seconds
- Only retries on 403/authentication errors (not other failures)

### Duplicate records

If a record already exists in the zone (e.g., from a previous partial migration), Cloudflare returns a conflict error. The record is logged as failed but migration continues.

### Post-migration verification

Always verify with `cloudflare_get_dns` after migration:

```
cloudflare_get_dns(domain: "example.com")
```

Compare the record count with what Namecheap reported.
