# Paper-trading bot

An SMA-crossover crypto bot that trades **simulated** money against real
Binance market data. Built because you wanted a bot that "hustles the
money" for a car — read this section before running anything.

## Read this first

- This bot has no edge. SMA crossover is the textbook beginner strategy;
  it does not reliably beat the market, and nothing in this code changes
  that. It exists so you can *see*, with real prices and zero risk, how a
  simple bot actually performs — which is usually "loses slowly to fees
  and whipsaws," not "prints money."
- **Default mode is paper trading.** `config.py` sets `paper_mode = True`
  and the bot refuses to run any other way. No real exchange account, no
  API keys, no real money, ever, unless you deliberately build that part
  yourself (see "Going live" below).
- There is a kill-switch (`risk.py`). If the simulated balance drops more
  than `max_daily_loss_pct` in a day or `max_total_loss_pct` overall, the
  bot force-sells any open position, halts itself, and will not trade
  again until you delete `state.json`. That's the "gets shot down" part —
  it protects you from the strategy, not the other way around.
- This code was written inside a sandboxed session that **cannot reach
  Binance's API** (network policy blocks it — confirmed with a 403 on
  `api.binance.com`). Run this on your own machine, phone-adjacent VPS, or
  any host with normal internet access.

## Setup

```bash
cd trading-bot
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
```

Requires Python 3.10+.

## Run it

One check, useful for testing or for a cron job:

```bash
python3 bot.py --once
```

Continuous loop (polls every `poll_seconds`, 15 min by default):

```bash
python3 bot.py --loop
```

State is saved to `state.json` between runs, so you can stop and restart
without losing the simulated position. Every trade is appended to
`trade_log.csv` — open it in a spreadsheet to see exactly what the bot did
and why.

### Watch it from a browser instead of the terminal

Run this in a second terminal alongside the bot:

```bash
python3 dashboard.py
```

Then open `http://127.0.0.1:8000` — it shows current portfolio value,
P/L%, cash, position, a chart of value over time, and a trade table, and
refreshes itself every 10 seconds. It's read-only (just reads `state.json`
and `trade_log.csv`) and only listens on localhost by default. If it's
running on a remote VPS, use SSH port forwarding rather than exposing it
publicly — it has no login, so anyone who could reach the port would see
your balance and trades:

```bash
ssh -L 8000:127.0.0.1:8000 you@your-vps
```
then open `http://127.0.0.1:8000` on your own laptop.

## Configuration

Edit `config.py`:

- `symbol` / `interval` — which pair and candle size to trade.
- `short_window` / `long_window` — SMA periods. Shorter windows react
  faster and trade more (more fees, more noise); longer windows trade
  less and lag more.
- `starting_balance_usdt` — set this to your real ₦20,000 converted at
  today's actual rate, not the rough placeholder in the file.
- `stop_loss_pct`, `max_daily_loss_pct`, `max_total_loss_pct` — the
  kill-switch thresholds. Tightening these makes the bot halt sooner on
  a bad run; loosening them lets it lose more before stopping.

## What "success" should look like here

Run this in paper mode for at least a few weeks across different market
conditions before drawing any conclusion. Track the numbers in
`trade_log.csv` honestly:

- If it's flat or losing slowly (likely), that's the realistic answer to
  "can a simple bot fund a car" — no, and now you have real numbers
  instead of a guess.
- If it's genuinely and consistently profitable over a long enough
  sample (this would be unusual), then and only then is it worth thinking
  about small real money — and even then, "small" means an amount you
  could lose completely without it mattering, not your whole car fund.

## Going live (not recommended, not built here)

This repo intentionally does not include code that places real orders.
Wiring that up means adding Binance API key/secret handling, HMAC request
signing, and order-execution error handling — real financial software
that deserves more care than a first pass. If your paper-trading results
genuinely justify it after a real test period, come back and we'll build
that part deliberately, with its own explicit safeguards (hard position
size caps, separate confirmation step, etc.) rather than bolting it on
here.
