from typing import List
from pydantic import BaseModel
from models import PriceBar

class TechnicalView(BaseModel):
    regime: str # "uptrend" | "downtrend" | "range"
    support: float | None = None
    resistance: float | None = None
    atr: float | None = None

def compute_sma(values: List[float], window: int) -> float:
    """Compute Simple Moving Average for the given window size."""
    if not values:
        return 0.0
    w = min(len(values), window)
    return sum(values[-w:]) / w

def analyze_technical(bars: List[PriceBar]) -> TechnicalView:
    """
    Given the most recent price bars, compute a simple technical view.
    Computes SMAs, ATR14, support (min low) and resistance (max high) over recent bars.
    """
    if not bars:
        return TechnicalView(regime="range")

    if len(bars) < 20:
        last_close = bars[-1].close
        return TechnicalView(
            regime="range",
            support=last_close,
            resistance=last_close,
            atr=0.0
        )

    closes = [b.close for b in bars]
    highs = [b.high for b in bars]
    lows = [b.low for b in bars]

    sma20 = compute_sma(closes, 20)
    sma50 = compute_sma(closes, 50)

    # Compute ATR14
    true_ranges = []
    start_idx = max(1, len(bars) - 14)
    for i in range(start_idx, len(bars)):
        curr_h = highs[i]
        curr_l = lows[i]
        prev_c = closes[i - 1]
        
        tr = max(
            curr_h - curr_l,
            abs(curr_h - prev_c),
            abs(curr_l - prev_c)
        )
        true_ranges.append(tr)

    atr = sum(true_ranges) / len(true_ranges) if true_ranges else 0.0

    support = min(lows[-20:])
    resistance = max(highs[-20:])

    last_close = closes[-1]
    
    momentum = 0.0
    if len(bars) > 10:
        c_10 = closes[-11]
        momentum = (last_close - c_10) / c_10
        
    atr = max(atr, 1.0)

    if sma20 > sma50 and momentum > 0.002:
        regime = "uptrend"
    elif sma20 < sma50 and momentum < -0.002:
        regime = "downtrend"
    else:
        regime = "range"

    return TechnicalView(
        regime=regime,
        support=support,
        resistance=resistance,
        atr=atr
    )
