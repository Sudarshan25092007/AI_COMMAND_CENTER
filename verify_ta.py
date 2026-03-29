import sys
from pathlib import Path
import os

# Add the workspace root to sys.path so 'backend' can be imported
sys.path.insert(0, os.path.abspath("."))

from backend.models import PriceBar
from backend.agents.technical import analyze_technical

def test_analyze_technical():
    print("Generating 50 synthetic price bars representing an uptrend...")
    bars = []
    for i in range(50):
        bars.append(PriceBar(
            timestamp=f"2026-03-28T10:{i:02d}:00Z",
            open=2000.0 + i,
            high=2005.0 + i,
            low=1995.0 + i,
            close=2002.0 + i,
            volume=100.0
        ))
        
    view = analyze_technical(bars)
    
    print("--- Technical View Results ---")
    print(f"Regime:     {view.regime}")
    print(f"Support:    {view.support}")
    print(f"Resistance: {view.resistance}")
    print(f"ATR:        {view.atr:.2f}")
    
    # Assertions to ensure math lines up conceptually
    assert view.regime == "uptrend", "Should be uptrend since close > sma20 > sma50"
    
    print("\nVerification Passed successfully.")

if __name__ == "__main__":
    test_analyze_technical()
