#!/usr/bin/env bash
# Stops and removes the systemd services installed by install_service.sh.
# This does not touch state.json or trade_log.csv -- your trade history stays.
set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
  echo "Run this with sudo: sudo ./uninstall_service.sh" >&2
  exit 1
fi

for name in trading-bot.service trading-bot-dashboard.service; do
  systemctl disable --now "$name" 2>/dev/null || true
  rm -f "/etc/systemd/system/$name"
  echo "Removed $name"
done

systemctl daemon-reload
echo "Done."
