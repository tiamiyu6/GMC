#!/usr/bin/env python3
"""Local, read-only dashboard for the paper-trading bot.

Run this alongside bot.py and open http://127.0.0.1:8000 in a browser to
watch balance, position, and trade history update automatically, instead
of tailing terminal output. It only reads state.json / trade_log.csv --
it never touches the bot process or your money.
"""

import argparse
import csv
import json
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from config import Config

cfg = Config()

PAGE = """<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>Paper Trading Bot</title>
<style>
  :root { color-scheme: light dark; }
  body { font-family: -apple-system, Segoe UI, Roboto, sans-serif; margin: 0;
         padding: 24px; background: #0d1117; color: #e6edf3; }
  h1 { font-size: 18px; font-weight: 600; margin: 0 0 4px; }
  .sub { color: #8b949e; font-size: 13px; margin-bottom: 20px; }
  .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
           gap: 12px; margin-bottom: 20px; }
  .card { background: #161b22; border: 1px solid #30363d; border-radius: 8px;
          padding: 14px; }
  .card .label { font-size: 12px; color: #8b949e; margin-bottom: 6px; }
  .card .value { font-size: 20px; font-weight: 600; }
  .pos { color: #3fb950; } .neg { color: #f85149; } .warn { color: #d29922; }
  canvas { width: 100%; height: 220px; background: #161b22; border: 1px solid #30363d;
           border-radius: 8px; margin-bottom: 20px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th, td { text-align: left; padding: 6px 10px; border-bottom: 1px solid #21262d; }
  th { color: #8b949e; font-weight: 500; }
  .banner { padding: 10px 14px; border-radius: 8px; margin-bottom: 20px; font-size: 13px; }
  .banner.halted { background: #3d1b1b; border: 1px solid #f85149; color: #f85149; }
  .banner.paper { background: #1b2a3d; border: 1px solid #58a6ff; color: #79c0ff; }
</style>
</head>
<body>
  <h1 id="title">Paper Trading Bot</h1>
  <div class="sub">Simulated money only. Auto-refreshes every 10s.</div>
  <div id="banner"></div>
  <div class="cards" id="cards"></div>
  <canvas id="chart" width="800" height="220"></canvas>
  <table id="trades">
    <thead><tr><th>Time</th><th>Action</th><th>Price</th><th>Qty</th><th>Portfolio Value</th></tr></thead>
    <tbody></tbody>
  </table>

<script>
function fmt(n, d=2) { return Number(n).toFixed(d); }

async function refresh() {
  const res = await fetch('/api/status');
  const s = await res.json();

  document.getElementById('title').textContent = s.symbol + ' -- Paper Trading Bot';

  const banner = document.getElementById('banner');
  if (s.halted) {
    banner.innerHTML = '<div class="banner halted">HALTED -- kill-switch tripped. Not trading. Delete state.json (after reviewing trade_log.csv) to reset.</div>';
  } else {
    banner.innerHTML = '<div class="banner paper">PAPER MODE -- no real money at risk.</div>';
  }

  const pnlClass = s.pnl_pct >= 0 ? 'pos' : 'neg';
  document.getElementById('cards').innerHTML = `
    <div class="card"><div class="label">Portfolio Value</div><div class="value">${fmt(s.latest_value)} USDT</div></div>
    <div class="card"><div class="label">P/L vs start</div><div class="value ${pnlClass}">${s.pnl_pct >= 0 ? '+' : ''}${fmt(s.pnl_pct)}%</div></div>
    <div class="card"><div class="label">Cash</div><div class="value">${fmt(s.cash)} USDT</div></div>
    <div class="card"><div class="label">Position</div><div class="value">${fmt(s.position_qty, 6)}</div></div>
    <div class="card"><div class="label">Entry Price</div><div class="value">${s.entry_price ? fmt(s.entry_price) : '--'}</div></div>
    <div class="card"><div class="label">Trades logged</div><div class="value">${s.trades.length}</div></div>
  `;

  const tbody = document.querySelector('#trades tbody');
  tbody.innerHTML = s.trades.slice().reverse().slice(0, 30).map(t => `
    <tr>
      <td>${t.timestamp.replace('T', ' ').slice(0, 19)}</td>
      <td>${t.action}</td>
      <td>${fmt(t.price)}</td>
      <td>${fmt(t.qty, 6)}</td>
      <td>${fmt(t.portfolio_value)}</td>
    </tr>`).join('');

  drawChart(s.trades, s.starting_balance);
}

function drawChart(trades, startingBalance) {
  const canvas = document.getElementById('chart');
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  const values = trades.map(t => parseFloat(t.portfolio_value));
  if (values.length < 2) {
    ctx.fillStyle = '#8b949e';
    ctx.font = '13px sans-serif';
    ctx.fillText('Not enough trades yet to draw a chart.', 16, h / 2);
    return;
  }

  const min = Math.min(...values, startingBalance);
  const max = Math.max(...values, startingBalance);
  const pad = (max - min) * 0.1 || 1;
  const yMin = min - pad, yMax = max + pad;
  const x = i => 20 + (i / (values.length - 1)) * (w - 40);
  const y = v => h - 20 - ((v - yMin) / (yMax - yMin)) * (h - 40);

  // baseline (starting balance)
  ctx.strokeStyle = '#30363d';
  ctx.beginPath();
  ctx.moveTo(20, y(startingBalance));
  ctx.lineTo(w - 20, y(startingBalance));
  ctx.stroke();

  // portfolio value line
  ctx.strokeStyle = '#58a6ff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  values.forEach((v, i) => i === 0 ? ctx.moveTo(x(i), y(v)) : ctx.lineTo(x(i), y(v)));
  ctx.stroke();
}

refresh();
setInterval(refresh, 10000);
</script>
</body>
</html>
"""


def read_state():
    if os.path.exists(cfg.state_file):
        with open(cfg.state_file) as f:
            return json.load(f)
    return None


def read_trades(limit=1000):
    if not os.path.exists(cfg.log_file):
        return []
    with open(cfg.log_file, newline="") as f:
        rows = list(csv.DictReader(f))
    return rows[-limit:]


class Handler(BaseHTTPRequestHandler):
    def _send(self, code, body, content_type="text/html"):
        data = body.encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        if self.path in ("/", "/index.html"):
            self._send(200, PAGE)
        elif self.path == "/api/status":
            state = read_state()
            trades = read_trades()
            latest_value = float(trades[-1]["portfolio_value"]) if trades else cfg.starting_balance_usdt
            portfolio = state["portfolio"] if state else {"cash": cfg.starting_balance_usdt, "position_qty": 0.0, "entry_price": 0.0}
            payload = {
                "symbol": cfg.symbol,
                "starting_balance": cfg.starting_balance_usdt,
                "halted": bool(state and state.get("halted")),
                "cash": portfolio["cash"],
                "position_qty": portfolio["position_qty"],
                "entry_price": portfolio["entry_price"],
                "latest_value": latest_value,
                "pnl_pct": (latest_value - cfg.starting_balance_usdt) / cfg.starting_balance_usdt * 100,
                "trades": trades,
            }
            self._send(200, json.dumps(payload), "application/json")
        else:
            self._send(404, "not found")

    def log_message(self, format, *args):
        pass


def main() -> None:
    parser = argparse.ArgumentParser(description="Read-only web dashboard for the paper-trading bot")
    parser.add_argument("--host", default="127.0.0.1", help="Bind address (default: localhost only)")
    parser.add_argument("--port", type=int, default=8000)
    args = parser.parse_args()

    server = ThreadingHTTPServer((args.host, args.port), Handler)
    print(f"Dashboard running at http://{args.host}:{args.port} (Ctrl+C to stop)")
    if args.host != "127.0.0.1":
        print("WARNING: bound to a non-localhost address. This dashboard has no "
              "login -- anyone who can reach this host/port sees your balance "
              "and trade history. Keep it on 127.0.0.1 and use SSH port "
              "forwarding instead if you need remote access.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
