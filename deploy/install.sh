#!/usr/bin/env bash
# One-shot installer for the hourly skillrosa index job + nginx site (run on the server).
# Usage: ./deploy/install.sh https://skills.example.com
set -euo pipefail
SITE_URL="${1:?usage: install.sh https://your-domain}"
APP="$(cd "$(dirname "$0")/.." && pwd)"
RUN_USER="$(id -un)"

command -v git >/dev/null || { echo "git is required"; exit 1; }
command -v python3 >/dev/null || { echo "python3 is required"; exit 1; }
python3 -c "import yaml" 2>/dev/null || pip3 install --user pyyaml

# First build so the site exists before the timer fires.
SITE_URL="$SITE_URL" "$APP/update.sh"

# systemd units (system-wide, but the job runs as the current user).
sudo tee /etc/systemd/system/skillrosa-update.service >/dev/null <<UNIT
[Unit]
Description=skillrosa index update
After=network-online.target

[Service]
Type=oneshot
User=$RUN_USER
WorkingDirectory=$APP
Environment=SITE_URL=$SITE_URL
ExecStart=$APP/update.sh
TimeoutStartSec=1800
UNIT
sudo tee /etc/systemd/system/skillrosa-update.timer >/dev/null <<UNIT
[Unit]
Description=Run skillrosa index update hourly

[Timer]
OnCalendar=hourly
RandomizedDelaySec=300
Persistent=true

[Install]
WantedBy=timers.target
UNIT
sudo systemctl daemon-reload
sudo systemctl enable --now skillrosa-update.timer

# nginx site config (domain comes from SITE_URL).
HOST="${SITE_URL#*://}"; HOST="${HOST%%/*}"
sed -e "s|__ROOT__|$APP/dist|g" -e "s|__HOST__|$HOST|g" "$APP/deploy/nginx.conf" | sudo tee /etc/nginx/conf.d/skillrosa.conf >/dev/null
sudo nginx -t && sudo systemctl reload nginx
echo "Done. Hourly timer: systemctl list-timers skillrosa-update.timer"
