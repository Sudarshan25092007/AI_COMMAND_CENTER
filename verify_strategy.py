import sys
from pathlib import Path
import os

sys.path.insert(0, os.path.abspath("."))

from backend.models import AccountState, PriceBar
from backend.agents.technical import TechnicalView
from backend.agents.strategy import generate_strategy

def test_generate_strategy():
    print("Testing generate_strategy explicitly:")
    
    # Fake inputs representing an uptrend
    tech_view = TechnicalView(
        regime="uptrend",
        support=2000.0,
        resistance=2020.0,
        atr=5.0
    )
    acc_state = AccountState(
        balance=10000.0,
        equity=10000.0,
        open_risk=0.0,
        daily_pnl=0.0
    )
    
    current_price = 2010.0
    proposal = generate_strategy(tech_view, acc_state, current_price)
    
    # Will print Pydantic TradeProposal JSON representation safely using .model_dump_json() if pydantic v2 or .json() in v1
    # Try .json() which is backward compatible generally natively.
    print(proposal.json(indent=2))
    
    # Assertions
    assert proposal.direction == "long", "Direction should be 'long'"
    assert proposal.sl == 2005.0, "SL should be 2010 - 5.0 (ATR) = 2005"
    assert proposal.tp == 2020.0, "TP should be 2010 + 2*5.0 = 2020"
    assert proposal.risk_status == "PENDING", "Risk status should be PENDING"
    assert proposal.size == 20.0, "1% of 10000 is 100. Trade risk is 5. So size = 100/5 = 20."
    
    print("\nVerification Passed successfully for strategy math.")

if __name__ == "__main__":
    test_generate_strategy()
