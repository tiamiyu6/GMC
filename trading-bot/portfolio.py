"""Simulated (paper) trading portfolio. No real money ever moves here."""

import csv
import os
from datetime import datetime, timezone


class PaperPortfolio:
    def __init__(self, cash: float, fee_rate: float, log_file: str):
        self.cash = cash
        self.position_qty = 0.0
        self.entry_price = 0.0
        self.fee_rate = fee_rate
        self.log_file = log_file
        self._ensure_log_header()

    def _ensure_log_header(self) -> None:
        if not os.path.exists(self.log_file):
            with open(self.log_file, "w", newline="") as f:
                csv.writer(f).writerow(
                    ["timestamp", "action", "price", "qty", "cash", "position_qty", "portfolio_value"]
                )

    def _log(self, action: str, price: float, qty: float) -> None:
        with open(self.log_file, "a", newline="") as f:
            csv.writer(f).writerow(
                [
                    datetime.now(timezone.utc).isoformat(),
                    action,
                    f"{price:.8f}",
                    f"{qty:.8f}",
                    f"{self.cash:.2f}",
                    f"{self.position_qty:.8f}",
                    f"{self.value(price):.2f}",
                ]
            )

    def value(self, current_price: float) -> float:
        return self.cash + self.position_qty * current_price

    def has_position(self) -> bool:
        return self.position_qty > 0

    def buy(self, price: float, trade_fraction: float) -> None:
        if self.has_position():
            return
        spend = self.cash * trade_fraction
        fee = spend * self.fee_rate
        qty = (spend - fee) / price
        self.cash -= spend
        self.position_qty = qty
        self.entry_price = price
        self._log("BUY", price, qty)

    def sell(self, price: float, reason: str = "SELL") -> None:
        if not self.has_position():
            return
        proceeds = self.position_qty * price
        fee = proceeds * self.fee_rate
        self.cash += proceeds - fee
        sold_qty = self.position_qty
        self.position_qty = 0.0
        self.entry_price = 0.0
        self._log(reason, price, sold_qty)

    def to_state(self) -> dict:
        return {"cash": self.cash, "position_qty": self.position_qty, "entry_price": self.entry_price}

    @classmethod
    def from_state(cls, state: dict, fee_rate: float, log_file: str) -> "PaperPortfolio":
        p = cls(cash=state["cash"], fee_rate=fee_rate, log_file=log_file)
        p.position_qty = state.get("position_qty", 0.0)
        p.entry_price = state.get("entry_price", 0.0)
        return p
