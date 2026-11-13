#!/bin/bash
set -euo pipefail
exec 9>/run/papermarketing-backup.lock
flock -n 9 || exit 0
for tenant in /opt/papermarketing/tenants/*/compose.json; do
  test -f "$tenant" || continue
  slug=$(basename "$(dirname "$tenant")")
  /bin/bash /opt/papermarketing/cloud/backup.sh "$slug"
done
# Keep the newest seven complete snapshots per tenant. Never follow symlinks.
node /opt/papermarketing/cloud/retain-backups.mjs
