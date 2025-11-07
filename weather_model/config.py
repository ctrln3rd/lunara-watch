# intent_model/config.py
from pathlib import Path

# Always resolves relative to this file
BASE_DIR = Path(__file__).resolve().parent

INTENT_KEYWORDS = BASE_DIR / "intent_keywords.json"
TIMEFRAME_KEYWORDS = BASE_DIR / "timeframe_keywords.json"
