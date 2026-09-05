#!/usr/bin/env bash
# Installs the bot and dashboard as systemd services so they start on boot
# and restart themselves if they crash. Run this on the machine that will
# actually run the bot (a VPS or your own always-on Linux box) -- not in a
# sandbox with no persistent systemd/network.
set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
  echo "Run this with sudo: sudo ./install_service.sh" >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RUN_AS_USER="${SUDO_USER:-$(whoami)}"
PYTHON_BIN="$(command -v python3)"

if [ -x "$SCRIPT_DIR/venv/bin/python3" ]; then
  PYTHON_BIN="$SCRIPT_DIR/venv/bin/python3"
  echo "Using venv interpreter: $PYTHON_BIN"
else
  echo "No venv found at $SCRIPT_DIR/venv -- using system python3: $PYTHON_BIN"
  echo "(Make sure 'pip install -r requirements.txt' was run for this interpreter.)"
fi

install_unit() {
  local template="$1" name="$2"
  sed \
    -e "s|__USER__|$RUN_AS_USER|g" \
    -e "s|__WORKDIR__|$SCRIPT_DIR|g" \
    -e "s|__PYTHON__|$PYTHON_BIN|g" \
    "$template" > "/etc/systemd/system/$name"
  echo "Installed /etc/systemd/system/$name"
}

install_unit "$SCRIPT_DIR/systemd/trading-bot.service.template" "trading-bot.service"
install_unit "$SCRIPT_DIR/systemd/trading-bot-dashboard.service.template" "trading-bot-dashboard.service"

systemctl daemon-reload
systemctl enable --now trading-bot.service
systemctl enable --now trading-bot-dashboard.service

cat <<EOF

Done. The bot and dashboard now start on boot and restart on crash.

Check status:
  systemctl status trading-bot.service
  systemctl status trading-bot-dashboard.service

Follow logs live:
  journalctl -u trading-bot.service -f
  journalctl -u trading-bot-dashboard.service -f

Dashboard: http://127.0.0.1:8000 on this machine.
For remote access use SSH port forwarding (see README.md) rather than
opening the port publicly -- the dashboard has no login.

To stop and remove:
  sudo ./uninstall_service.sh
EOF
