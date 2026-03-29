MACRO_EVENTS = {
    "2026-03-03T13:30:00Z": "US CPI release - high impact",
    "2026-03-03T15:00:00Z": "FOMC decision expected",
}

def get_macro_context(timestamp: str) -> str:
    return MACRO_EVENTS.get(timestamp, "Normal market conditions")
