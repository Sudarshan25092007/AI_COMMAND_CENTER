import pandas as pd
from pathlib import Path
from models import PriceBar

PRICE_BARS: list[PriceBar] = []
CURRENT_INDEX: int = 100

def load_data():
    global PRICE_BARS, CURRENT_INDEX
    
    data_path = Path(__file__).parent / "data" / "xauusd_1h.csv"
    
    if not data_path.exists():
        print(f"Data file not found at {data_path}")
        return
        
    df = pd.read_csv(data_path)
    
    if 'timestamp' in df.columns:
        # Coerce European mapping strings into proper strict Pandas datetime objects natively
        df['timestamp'] = pd.to_datetime(df['timestamp'].str.replace(' UTC', ''), dayfirst=True, errors='coerce')

    bars: list[PriceBar] = []
    for _, row in df.iterrows():
        # Extrapolate strict ISO 8601 natively appended with UTC Z-mapping
        ts_val = row['timestamp'].isoformat() + "Z" if pd.notna(row['timestamp']) else "1970-01-01T00:00:00Z"
        
        bar = PriceBar(
            timestamp=str(ts_val),
            open=float(row['open']),
            high=float(row['high']),
            low=float(row['low']),
            close=float(row['close']),
            volume=float(row['volume']) if not pd.isna(row['volume']) else None
        )
        bars.append(bar)
        
    PRICE_BARS = bars
    CURRENT_INDEX = min(100, len(bars) - 1) if bars else 0
    print(f"Loaded {len(PRICE_BARS)} price bars from CSV, primed at index {CURRENT_INDEX}.")


def get_current_bar() -> PriceBar | None:
    if not PRICE_BARS:
        return None
    return PRICE_BARS[CURRENT_INDEX]

def get_recent_bars(n: int) -> list[PriceBar]:
    if not PRICE_BARS:
        return []
    start_idx = max(0, CURRENT_INDEX - n + 1)
    return PRICE_BARS[start_idx:CURRENT_INDEX + 1]

def advance_time(steps: int = 1) -> PriceBar | None:
    global CURRENT_INDEX
    if not PRICE_BARS:
        return None
        
    new_index = CURRENT_INDEX + steps
    max_index = len(PRICE_BARS) - 1
    CURRENT_INDEX = min(new_index, max_index)
    
    return PRICE_BARS[CURRENT_INDEX]
