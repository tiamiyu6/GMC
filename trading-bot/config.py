from dataclasses import dataclass


@dataclass
class Config:
    # --- Market ---
    symbol: str = "BTCUSDT"        # Binance trading pair
    interval: str = "15m"          # candle size used for the strategy
    short_window: int = 9          # short SMA period (candles)
    long_window: int = 21          # long SMA period (candles)

    # --- Money ---
    # ~NGN20,000 converted to USDT at a rough rate. Edit to match today's
    # actual NGN/USD rate and your real budget before you take this seriously.
    starting_balance_usdt: float = 13.0
    trade_fraction: float = 0.95   # fraction of cash spent per BUY
    fee_rate: float = 0.001        # 0.1%, matches Binance's default spot fee

    # --- Risk controls (the kill-switch) ---
    stop_loss_pct: float = 0.05        # sell a position if it drops 5% from entry
    max_daily_loss_pct: float = 0.15   # halt for the day if daily loss exceeds 15%
    max_total_loss_pct: float = 0.50   # halt permanently if total loss exceeds 50%

    # --- Operations ---
    poll_seconds: int = 900        # how often the loop checks the market (15 min)
    paper_mode: bool = True        # NEVER flip this without reading README.md first
    log_file: str = "trade_log.csv"
    state_file: str = "state.json"
