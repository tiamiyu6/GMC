"""The kill-switch: halts the bot when losses cross limits you set.

This is the part that stops "let it hustle forever" from turning into
"lost everything and kept going." A bot with no kill-switch doesn't stop
losing money on its own -- it just stops when the money runs out.
"""

from datetime import datetime, timezone


class RiskManager:
    def __init__(self, starting_balance: float, max_daily_loss_pct: float, max_total_loss_pct: float):
        self.starting_balance = starting_balance
        self.max_daily_loss_pct = max_daily_loss_pct
        self.max_total_loss_pct = max_total_loss_pct
        self.daily_start_balance = starting_balance
        self.daily_date = datetime.now(timezone.utc).date().isoformat()

    def to_state(self) -> dict:
        return {
            "starting_balance": self.starting_balance,
            "daily_start_balance": self.daily_start_balance,
            "daily_date": self.daily_date,
        }

    @classmethod
    def from_state(cls, state: dict, max_daily_loss_pct: float, max_total_loss_pct: float) -> "RiskManager":
        rm = cls(state["starting_balance"], max_daily_loss_pct, max_total_loss_pct)
        rm.daily_start_balance = state.get("daily_start_balance", rm.starting_balance)
        rm.daily_date = state.get("daily_date", rm.daily_date)
        return rm

    def _roll_day_if_needed(self, current_value: float) -> None:
        today = datetime.now(timezone.utc).date().isoformat()
        if today != self.daily_date:
            self.daily_date = today
            self.daily_start_balance = current_value

    def check(self, current_value: float) -> str | None:
        """Returns a shutdown reason string if a limit is breached, else None."""
        self._roll_day_if_needed(current_value)

        total_loss_pct = (self.starting_balance - current_value) / self.starting_balance
        if total_loss_pct >= self.max_total_loss_pct:
            return (
                f"TOTAL LOSS LIMIT HIT: down {total_loss_pct:.1%} from starting balance "
                f"(limit {self.max_total_loss_pct:.1%}). Bot shut down permanently."
            )

        daily_loss_pct = (self.daily_start_balance - current_value) / self.daily_start_balance
        if daily_loss_pct >= self.max_daily_loss_pct:
            return (
                f"DAILY LOSS LIMIT HIT: down {daily_loss_pct:.1%} today "
                f"(limit {self.max_daily_loss_pct:.1%}). Bot shut down for today."
            )

        return None
