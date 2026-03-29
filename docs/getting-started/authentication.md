# Authentication

Infrastructure MCP authenticates with three external services.

## Cloudflare

### Global API Key (recommended)

The Global API Key provides full access to the Cloudflare API. Set:

- `CLOUDFLARE_API_KEY` — found at **My Profile > API Tokens > Global API Key**
- `CLOUDFLARE_EMAIL` — your Cloudflare account email

Requests are authenticated with `X-Auth-Key` and `X-Auth-Email` headers.

### Scoped API Token

API Tokens provide scoped access. Create one at **My Profile > API Tokens > Create Token**.

Required permissions:

| Permission | Access |
|-----------|--------|
| Zone > Zone Settings | Edit |
| Zone > DNS | Edit |
| Zone > Zone WAF | Edit |
| Zone > Bot Management | Edit |
| Zone > Zone Rulesets | Edit |
| Zone > Managed Headers | Edit |
| Account > Account Rulesets | Read |

Set `CLOUDFLARE_API_TOKEN` with the generated token. Requests use `Authorization: Bearer` headers.

### Finding your Account ID

Your Account ID is in the Cloudflare dashboard URL:

```
https://dash.cloudflare.com/<ACCOUNT_ID>/...
```

Or via API:

```bash
curl -H "X-Auth-Key: KEY" -H "X-Auth-Email: EMAIL" \
  https://api.cloudflare.com/client/v4/accounts
```

## Namecheap

1. Enable API access at **Profile > Tools > Business & Dev Tools > Namecheap API Access**
2. Whitelist your server's IP address
3. Set `NAMECHEAP_API_USER`, `NAMECHEAP_API_KEY`, and `NAMECHEAP_CLIENT_IP`

!!! note
    Namecheap requires a minimum account balance or domain count to enable API access.

## Fleet

Fleet authenticates locally via its registry file. No API keys needed — just ensure the `FLEET_REGISTRY_PATH` points to your Fleet installation's registry and the `FLEET_BINARY` is in PATH or specified as an absolute path.
