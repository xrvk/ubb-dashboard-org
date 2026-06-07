# Upstream repository

This repo (`xrvk/ubb-dashboard-org`) is the **org-scoped variant** of the UBB
Dashboard. The original (enterprise-scoped) repository is:

> **https://github.com/xrvk/ubb-dashboard**

That repo was previously called `xrvk/ind-ulb-dashboard` and was renamed in
place, so any historical references to `ind-ulb-dashboard` in this codebase
(including `UPSTREAM_SYNC.md` at the repo root) point at the same upstream.
GitHub redirects the old URL, so existing `upstream` remotes keep working.

## Relationship

`xrvk/ubb-dashboard` and `xrvk/ubb-dashboard-org` are siblings, not a GitHub
fork. They share a meaningful chunk of infrastructure code (rate-limit-aware
batching, CSV parsing, snapshot/revert, projection math, the consumption
curve, the Individual ULB table mechanics) that we keep in sync by
cherry-picking commits between the two repos.

The full set of in-scope vs out-of-scope changes, plus the running log of
applied cherry-picks, lives in [`../UPSTREAM_SYNC.md`](../UPSTREAM_SYNC.md).

## Adding the upstream remote

```bash
git remote add upstream https://github.com/xrvk/ubb-dashboard.git
git fetch upstream
```

Use the new name (`ubb-dashboard`) for any new clones; the redirect from
`ind-ulb-dashboard` is convenient but not guaranteed forever.
