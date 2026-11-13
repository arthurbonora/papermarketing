#!/bin/bash
set -euo pipefail
# Run as root on the new pilot host after copying cloud/ to /opt/papermarketing/cloud.
test "$(id -u)" = 0
test -n "${CLOUD_IMAGE:?Set the verified application image tag}"
test "$(node -p 'Number(process.versions.node.split(".")[0])')" -ge 24
command -v docker >/dev/null
command -v openssl >/dev/null
id pm-cloud >/dev/null 2>&1 || useradd --system --home /var/lib/papermarketing-cloud --shell /usr/sbin/nologin pm-cloud
install -d -o pm-cloud -g pm-cloud -m 2770 /var/lib/papermarketing-cloud
install -d -m 755 /etc/papermarketing-cloud /opt/papermarketing/edge/tenants
install -d -m 700 /opt/papermarketing/tenants /opt/papermarketing/backups
if ! test -e /etc/papermarketing-cloud/private.pem; then
  umask 077
  openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:3072 -out /etc/papermarketing-cloud/private.pem 2>/dev/null
  openssl pkey -in /etc/papermarketing-cloud/private.pem -pubout -out /etc/papermarketing-cloud/public.pem
fi
chmod 600 /etc/papermarketing-cloud/private.pem
chmod 644 /etc/papermarketing-cloud/public.pem
printf 'CLOUD_IMAGE=%s\nCLOUD_DOMAIN=papermarketing.cloud\nCLOUD_ORIGIN=https://papermarketing.cloud\nCLOUD_MAX_ACCOUNTS=2\n' "$CLOUD_IMAGE" > /etc/papermarketing-cloud/service.env
chmod 644 /etc/papermarketing-cloud/service.env
cat > /opt/papermarketing/edge/Caddyfile <<'EOF'
{
  admin localhost:2019
}
papermarketing.cloud {
  encode zstd gzip
  reverse_proxy 127.0.0.1:8090
}
www.papermarketing.cloud {
  redir https://papermarketing.cloud{uri} permanent
}
import /etc/caddy/tenants/*.caddy
EOF
cat > /opt/papermarketing/edge/compose.yaml <<'EOF'
name: papermarketing-edge
services:
  edge:
    image: caddy:2.11.2-alpine
    container_name: papermarketing-edge
    network_mode: host
    restart: unless-stopped
    mem_limit: 256m
    pids_limit: 128
    volumes:
      - /opt/papermarketing/edge:/etc/caddy:ro
      - data:/data
      - config:/config
    logging:
      driver: json-file
      options:
        max-size: 10m
        max-file: '3'
volumes:
  data:
  config:
EOF
cat > /etc/systemd/system/papermarketing-portal.service <<'EOF'
[Unit]
Description=PaperMarketing Cloud portal
After=network-online.target
Wants=network-online.target
[Service]
User=pm-cloud
Group=pm-cloud
UMask=0007
WorkingDirectory=/opt/papermarketing/cloud
EnvironmentFile=/etc/papermarketing-cloud/service.env
ExecStart=/usr/local/bin/node /opt/papermarketing/cloud/portal.mjs
Restart=on-failure
RestartSec=5
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
PrivateTmp=true
ReadWritePaths=/var/lib/papermarketing-cloud
MemoryMax=256M
TasksMax=128
RestrictAddressFamilies=AF_UNIX AF_INET AF_INET6
[Install]
WantedBy=multi-user.target
EOF
cat > /etc/systemd/system/papermarketing-worker.service <<'EOF'
[Unit]
Description=PaperMarketing Cloud tenant provisioning
After=docker.service network-online.target
Requires=docker.service
[Service]
User=root
Group=pm-cloud
UMask=0007
RuntimeDirectory=papermarketing-worker
RuntimeDirectoryMode=0750
WorkingDirectory=/opt/papermarketing/cloud
EnvironmentFile=/etc/papermarketing-cloud/service.env
ExecStart=/usr/local/bin/node /opt/papermarketing/cloud/worker.mjs
Restart=on-failure
RestartSec=10
MemoryMax=256M
TasksMax=128
[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
runuser -u pm-cloud -- /usr/local/bin/node --input-type=module -e "import {openDb} from '/opt/papermarketing/cloud/core.mjs';openDb('/var/lib/papermarketing-cloud/control.sqlite').close();"
systemctl enable --now papermarketing-portal.service papermarketing-worker.service
docker compose -f /opt/papermarketing/edge/compose.yaml up -d
curl --fail --silent http://127.0.0.1:8090/api/cloud/health
cat > /etc/systemd/system/papermarketing-backup.service <<'EOF'
[Unit]
Description=Consistent PaperMarketing local backups
After=docker.service
[Service]
Type=oneshot
ExecStart=/bin/bash /opt/papermarketing/cloud/backup-all.sh
UMask=0077
EOF
cat > /etc/systemd/system/papermarketing-backup.timer <<'EOF'
[Unit]
Description=Nightly PaperMarketing local backup
[Timer]
OnCalendar=*-*-* 03:30:00 UTC
Persistent=true
RandomizedDelaySec=300
[Install]
WantedBy=timers.target
EOF
chmod +x /opt/papermarketing/cloud/backup.sh /opt/papermarketing/cloud/backup-all.sh
systemctl daemon-reload
systemctl enable --now papermarketing-backup.timer
