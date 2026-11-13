# Pilot deployment — 2026-11-12

## Live services

- Official site: https://papermarketing.cloud
- Hosting account: https://papermarketing.cloud/console
- First tenant: https://bonorasw.papermarketing.cloud
- Host: `179.66.143.84`, Ubuntu 26.04.1, 2 CPUs, 7.7 GiB RAM.
- Application source after the hosted Claude login fix: `d86db09f3b525812058714a795062753e31fb021`.
- Application image: `papermarketing:d86db09f`.
- Hosting source and review: https://github.com/arthurbonora/papermarketing/pull/8.

The portal and provisioning worker are separate systemd services. Caddy is
the public reverse proxy. The paired Desktop Commander installation runs as
`desktop-commander.service` and is enabled at boot. Its original process was
replaced with the service and the remote connection was tested afterward.
UFW allows incoming SSH and HTTP/HTTPS. Tenant application ports bind only to
loopback. PostgreSQL has no published host port.

Both domains have active Cloudflare zones and Hostinger delegates to
`art.ns.cloudflare.com` and `nadia.ns.cloudflare.com`. PaperMarketing uses
proxied apex, www and wildcard records with Full (strict) TLS. `bonora.ai`
retains its previous parking destination. This task did not create its website.

## Acceptance evidence

- Three cloud control-plane tests passed on Windows and on the Linux VPS.
- The production application Docker image built successfully on the VPS.
- The owner's invitation registration created the Bonorasw app and PostgreSQL
  containers, claimed the owner and created one company automatically.
- Private bootstrap initially rejected the mapped host port as an auth origin.
  Using the container listen port for Host/Origin fixed the observed failure;
  transport still connects through the tenant's loopback host port.
- Both tenant containers reached healthy state. The registry reports `ready`.
- Public workspace returned HTTPS 200. Anonymous company API returned 403.
- The portal displayed the running workspace. The owner confirmed workspace
  sign-in on another device and a new server session was observed.
- The owner confirmed successful Claude subscription connection after the
  isolated provider login opt-in fix. The public instance keeps trusted MCP
  disabled; anonymous company API access still returns 403.
- Dark official site was reviewed in Chrome using the repository logo, Inter,
  charcoal colors and capsule gradients.
- Local backup `20261112T234849Z` completed. All checksum entries passed.
- That backup restored into a separate temporary Compose project and volumes.
  PostgreSQL, application files, healthy application boot, company count (one),
  and anonymous denial (403) passed. Test containers and volumes were removed.
  The live tenant was never a restore target.

## Operating limits

This is an invite-only pilot with no billing and a two-account admission cap.
Claude subscription connection passed; agent task execution has not been qualified.
Portal and workspace passwords are independent after their initial setup.
There is no automated password recovery or public signup for this pilot.

Backups run locally at 03:30 UTC with up to five minutes of jitter and retain
seven complete sets. Each backup briefly stops the app, so requests can return
502 during the maintenance interval. Off-host backup is deferred by the owner;
loss of this VPS can lose both data and backups. No uptime SLA is offered.

Focused tests and live acceptance do not replace the repository's broad CI.
The PR remains draft until applicable final-revision CI and review complete.

