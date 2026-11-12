#!/bin/bash
set -euo pipefail
umask 077
root=/opt/papermarketing
slug=${1:?Usage: backup.sh TENANT_SLUG}
[[ "$slug" =~ ^[a-z][a-z0-9-]{2,30}$ ]] || exit 2
tenant="$root/tenants/$slug"
test -f "$tenant/compose.json"
stamp=$(date -u +%Y%m%dT%H%M%SZ)
dest="$root/backups/$slug/$stamp"
mkdir -p "$dest"
compose=(docker compose -f "$tenant/compose.json")
"${compose[@]}" stop app
trap '"${compose[@]}" start app >/dev/null' EXIT
"${compose[@]}" exec -T db pg_dump -U papermarketing -d papermarketing -Fc > "$dest/database.dump"
"${compose[@]}" run --rm --no-deps -T --entrypoint tar app -C /paperclip -czf - . > "$dest/application.tar.gz"
cp "$tenant/compose.json" "$tenant/secrets.json" "$dest/"
node --input-type=module -e "import {DatabaseSync} from 'node:sqlite'; const db=new DatabaseSync('/var/lib/papermarketing-cloud/control.sqlite');db.exec(\"VACUUM INTO '\"+process.argv[1]+\"/control.sqlite'\");" "$dest"
cp /etc/papermarketing-cloud/private.pem /etc/papermarketing-cloud/public.pem "$dest/"
(cd "$dest" && sha256sum database.dump application.tar.gz compose.json secrets.json control.sqlite private.pem public.pem > SHA256SUMS)
"${compose[@]}" start app
trap - EXIT
touch "$dest/COMPLETE"
printf '%s\n' "$dest"
