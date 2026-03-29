from pydantic import BaseModel
from models import TradeProposal, AccountState
from .technical import TechnicalView
import random

class StrategyProposal(BaseModel):
    direction: str
    size: float
    entry: float
    sl: float
    tp: float
    reason: str

def generate_strategy(tech: TechnicalView, account: AccountState, current_price: float) -> TradeProposal:
    """
    Generate a basic strategy proposal given technical view and account state.
    """
    atr = tech.atr
    if atr is None or atr < 0.0001:
        atr = 5.0
    stop_distance = atr

    if tech.regime == "uptrend":
        if random.random() < 0.2:
            direction = "short"
            reason = "Uptrend detected, but strategically fading structurally for minor pullback (demo short)."
        else:
            direction = "long"
            reason = "Uptrend regime + momentum positive -> long XAUUSD (1:2 RR)."
    elif tech.regime == "downtrend":
        direction = "short"
        reason = "Downtrend regime + momentum negative -> short XAUUSD (1:2 RR)."
    else:
        # Mean Reversion Range Maps
        target_supp = tech.support if tech.support else current_price
        target_res = tech.resistance if tech.resistance else current_price
        
        if current_price < (target_supp + 0.3 * stop_distance):
            direction = "long"
            reason = "Range mean reversion: price near support -> long XAUUSD."
        elif current_price > (target_res - 0.3 * stop_distance):
            direction = "short"
            reason = "Range mean reversion: price near resistance -> short XAUUSD."
        else:
            direction = "none"
            reason = "Range detected mid-channel: standing aside safely."

    entry = current_price
    if direction == "long":
        sl = current_price - stop_distance
        tp = current_price + 2 * stop_distance
    elif direction == "short":
        sl = current_price + stop_distance
        tp = current_price - 2 * stop_distance
    else:
        sl = current_price
        tp = current_price

    risk_amount = account.balance * 0.01
    per_unit_risk = abs(entry - sl)
    if per_unit_risk > 0:
        size = max(risk_amount / per_unit_risk, 0.01)
    else:
        size = 0.01
        
    return TradeProposal(
        direction=direction,
        size=size,
        entry=entry,
        sl=sl,
        tp=tp,
        reason=reason,
        risk_status="PENDING"
    )
