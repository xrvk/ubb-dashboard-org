# URL parameters

The app reads a handful of query parameters off its URL
(`/ubb-dashboard-org/?param=value&...`). There is one end-user param
worth knowing about; everything else is for local development,
screenshots, and deterministic test scenarios.

The personal access token is **never** read from a URL parameter, and
there is no `?pat=` or equivalent. Tokens in URLs leak through browser
history, the `Referer` header, server access logs, and screen-share.
The connect form always requires the PAT to be entered by hand and
does not auto-submit.

## For end users

### `?org=...` — Prefill organization URL

Prefills the **Organization URL** field on the connect form. Useful when
sharing onboarding links or pointing a colleague at the right
organization. The user still has to paste their PAT and click Connect.

The easiest way to generate one of these links is to connect to your
org, open the connection menu in the top-right, and choose
**Copy shareable link**.

Manual construction supports two shapes:

- **Bare slug** (recommended): `?org=acme-corp` →
  `https://github.com/acme-corp`
- **Full URL** (github.com only):
  - `?org=https://github.com/acme-corp`

Invalid values (random garbage, non-github.com hosts, slugs with
disallowed characters, or reserved names like `settings`) are silently
ignored — the form stays usable and falls back to the
`VITE_DEV_ORG_URL` default if one is set, or empty otherwise.

> **GHES is not supported in this variant.** If you need to point at a
> GitHub Enterprise Server host, use the
> [enterprise variant](https://github.com/xrvk/ind-ulb-dashboard) instead.

## For developers and testing

> These parameters are intended for local development, screenshots, and
> deterministic test scenarios. They are not stable end-user features
> and may change without notice.

### `?demo=N`

Boots the app with `N` synthetic users instead of asking you to
connect. Everything in the UI is fake but realistic; all writes are
stubbed with toast notifications.

Common values:

| URL | What it does |
|---|---|
| `?demo=50` | Small org, realistic distribution |
| `?demo=300` | Mid-size: paginated table, full histogram |
| `?demo=900` | Larger: bulk-apply progress UI, rate-limit pre-flight |

The remaining params in this section only take effect when `?demo=N`
is also set.

### `?pool=N`

Override pool fill % (0–200). Scales `consumedAmount` on every budget
so the pool tile shows roughly `N%` drawn.

### `?asof=YYYY-MM-DD`

Pin the synthetic "today" so screenshots and time-elapsed math stay
stable across runs. Default is "5 days before month end" of the
current real month.

### `?debug=1`

Show the dashboard data overlay — origins and raw values for each
tile. See `agents/dashboard-data-flow.md` for what the overlay
exposes.

## Stacking

Params stack. Examples:

- `?demo=150&pool=75` — demo mode, 150 users, pool 75 % full.
- `?demo=150&debug=1` — demo mode with the data overlay on.

Demo mode bypasses the connect form, so `?org=…&demo=N` is valid but
the `?org` value is unused.
