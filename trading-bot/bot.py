#!/usr/bin/env python3
"""Paper-trading bot: SMA-crossover strategy on real Binance market data,
simulated money only. Read README.md before running this, especially the
part about what this bot is realistically going to do to a small balance.
"""

import argparse
import json
import os
import sys
import time

from config import Config
from data_feed import fetch_closes
from portfolio import PaperPortfolio
from risk import RiskManager
from strategy import generate_signal


def load_state(cfg: Config):
    if os.path.exists(cfg.state_file):
        with open(cfg.state_file) as f:
            state = json.load(f)
        portfolio = PaperPortfolio.from_state(state["portfolio"], cfg.fee_rate, cfg.log_file)
        risk = RiskManager.from_state(state["risk"], cfg.max_daily_loss_pct, cfg.max_total_loss_pct)
        halted = state.get("halted", False)
        return portfolio, risk, halted
    portfolio = PaperPortfolio(cfg.starting_balance_usdt, cfg.fee_rate, cfg.log_file)
    risk = RiskManager(cfg.starting_balance_usdt, cfg.max_daily_loss_pct, cfg.max_total_loss_pct)
    return portfolio, risk, False


def save_state(cfg: Config, portfolio: PaperPortfolio, risk: RiskManager, halted: bool) -> None:
    with open(cfg.state_file, "w") as f:
        json.dump({"portfolio": portfolio.to_state(), "risk": risk.to_state(), "halted": halted}, f, indent=2)


def run_once(cfg: Config) -> bool:
    """Runs a single check/trade cycle. Returns False if the bot just halted."""
    portfolio, risk, halted = load_state(cfg)

    if halted:
        print("Bot is HALTED (kill-switch previously tripped). Not trading. "
              "Delete state.json to reset after you've reviewed what happened.")
        return False

    closes = fetch_closes(cfg.symbol, cfg.interval, limit=cfg.long_window + 5)
    price = closes[-1]
    signal = generate_signal(closes, cfg.short_window, cfg.long_window)

    if portfolio.has_position():
        drawdown = (portfolio.entry_price - price) / portfolio.entry_price
        if drawdown >= cfg.stop_loss_pct:
            portfolio.sell(price, reason="STOP_LOSS")
        elif signal == "SELL":
            portfolio.sell(price, reason="SELL")
    elif signal == "BUY":
        portfolio.buy(price, cfg.trade_fraction)

    value = portfolio.value(price)
    reason = risk.check(value)

    if reason:
        if portfolio.has_position():
            portfolio.sell(price, reason="KILL_SWITCH")
            value = portfolio.value(price)
        print(f"[{cfg.symbol}] price={price:.2f} value={value:.2f} -- {reason}")
        save_state(cfg, portfolio, risk, halted=True)
        return False

    print(f"[{cfg.symbol}] price={price:.2f} signal={signal} "
          f"cash={portfolio.cash:.2f} position={portfolio.position_qty:.6f} value={value:.2f}")
    save_state(cfg, portfolio, risk, halted=False)
    return True


def main() -> None:
    parser = argparse.ArgumentParser(description="Paper-trading bot (simulated money only)")
    parser.add_argument("--once", action="store_true", help="Run a single check and exit (good for cron)")
    parser.add_argument("--loop", action="store_true", help="Run continuously, polling on the configured interval")
    args = parser.parse_args()

    cfg = Config()
    if not cfg.paper_mode:
        print("Refusing to start: paper_mode is False in config.py, and this script "
              "only knows how to paper trade. See README.md before going any further.")
        sys.exit(1)

    print(f"Starting PAPER TRADING bot on {cfg.symbol} -- simulated balance "
          f"{cfg.starting_balance_usdt:.2f} USDT. No real money is at risk.")

    if args.loop:
        while True:
            keep_going = run_once(cfg)
            if not keep_going:
                break
            time.sleep(cfg.poll_seconds)
    else:
        run_once(cfg)


if __name__ == "__main__":
    main()
