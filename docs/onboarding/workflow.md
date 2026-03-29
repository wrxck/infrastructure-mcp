# Domain Onboarding Workflow

The `onboard_domain` tool automates the full migration of a domain from Namecheap to Cloudflare.

## Pipeline steps

```
1. Verify zone doesn't already exist in Cloudflare
       │
2. Fetch DNS records from Namecheap API
       │
3. Create new zone in Cloudflare
       │
4. Migrate DNS records (with retry on transient 403s)
       │
5. Update nameservers at Namecheap → Cloudflare NS
       │
6. Apply 30+ protection settings
       ├── Zone settings (SSL, security, speed, caching, network)
       ├── DNSSEC
       ├── Bot Fight Mode
       ├── Free WAF Managed Ruleset
       ├── Managed Transforms (security headers, remove X-Powered-By)
       └── URL Normalization
```

## Usage

```
onboard_domain(domain: "example.com")
```

With options:

```
onboard_domain(
  domain: "example.com",
  migrateRecords: true,
  applyProtection: true
)
```

## Post-onboarding

After onboarding:

1. **Verify DNS** with `cloudflare_get_dns` — check all records migrated correctly
2. **Verify protection** with `cloudflare_get_protection_status` — audit settings
3. **Wait for nameserver propagation** — typically 1-24 hours
4. **Check zone status** with `cloudflare_list_zones` — should transition from `pending` to `active`

## Domains not in Namecheap

For domains registered at other registrars, onboard with DNS migration disabled:

```
onboard_domain(domain: "example.com", migrateRecords: false)
```

Then manually add DNS records via `cloudflare_get_dns` or the Cloudflare dashboard, and update nameservers at your registrar.

## Retry behavior

DNS record creation uses automatic retry (up to 3 attempts with 2s/4s backoff) for transient 403 authentication errors. These occur when Cloudflare's zone hasn't propagated across all API nodes after creation.
