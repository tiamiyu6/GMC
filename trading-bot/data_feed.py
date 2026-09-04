"""Fetches real market data from Binance's public REST API (no API key needed)."""

import requests

BINANCE_KLINES_URL = "https://api.binance.com/api/v3/klines"


def fetch_closes(symbol: str, interval: str, limit: int = 100) -> list[float]:
    """Return the last `limit` closing prices for symbol/interval, oldest first."""
    params = {"symbol": symbol, "interval": interval, "limit": limit}
    resp = requests.get(BINANCE_KLINES_URL, params=params, timeout=10)
    resp.raise_for_status()
    klines = resp.json()
    # Each kline: [open_time, open, high, low, close, volume, ...]
    return [float(k[4]) for k in klines]


def fetch_latest_price(symbol: str, interval: str) -> float:
    return fetch_closes(symbol, interval, limit=1)[-1]
