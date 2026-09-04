"""Offline sanity checks for the crossover logic. No network needed."""

from strategy import generate_signal, sma


def test_sma_basic():
    assert sma([1, 2, 3, 4, 5], 3) == 4.0


def test_not_enough_data_holds():
    assert generate_signal([1.0] * 10, short_window=5, long_window=21) == "HOLD"


def test_golden_cross_buys():
    # Flat, then one sharp uptick right at the end: short SMA crosses above
    # long SMA only on this last step.
    closes = [10.0] * 17 + [20.0]
    assert generate_signal(closes, short_window=3, long_window=10) == "BUY"


def test_death_cross_sells():
    closes = [10.0] * 17 + [1.0]
    assert generate_signal(closes, short_window=3, long_window=10) == "SELL"


def test_flat_market_holds():
    closes = [10.0] * 30
    assert generate_signal(closes, short_window=5, long_window=20) == "HOLD"


if __name__ == "__main__":
    test_sma_basic()
    test_not_enough_data_holds()
    test_golden_cross_buys()
    test_death_cross_sells()
    test_flat_market_holds()
    print("All strategy tests passed.")
