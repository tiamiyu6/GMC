"""A plain SMA-crossover strategy. Nothing exotic: this is the same building
block every beginner trading bot uses. It is not an edge by itself — see
README.md for what that means for your money."""


def sma(values: list[float], window: int) -> float:
    return sum(values[-window:]) / window


def generate_signal(closes: list[float], short_window: int, long_window: int) -> str:
    """Returns "BUY", "SELL", or "HOLD" based on a short/long SMA crossover.

    We look at the last two points in time so we react to the moment the
    lines cross, not to every candle where short happens to sit above long
    (which would fire the same signal repeatedly).
    """
    needed = long_window + 1
    if len(closes) < needed:
        return "HOLD"

    prev_short = sma(closes[:-1], short_window)
    prev_long = sma(closes[:-1], long_window)
    curr_short = sma(closes, short_window)
    curr_long = sma(closes, long_window)

    crossed_up = prev_short <= prev_long and curr_short > curr_long
    crossed_down = prev_short >= prev_long and curr_short < curr_long

    if crossed_up:
        return "BUY"
    if crossed_down:
        return "SELL"
    return "HOLD"
