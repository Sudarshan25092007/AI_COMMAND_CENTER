from contextlib import asynccontextmanager
from fastapi import FastAPI
from pydantic import BaseModel
from models import AccountState, PriceBar, TradeProposal, HumanDecisionRequest
from data_loader import load_data, get_current_bar, advance_time, get_recent_bars
from agents.technical import analyze_technical
from agents.strategy import generate_strategy
from agents.risk import apply_risk_checks
from orchestrator import run_scan, PROPOSALS_DB
from datetime import datetime, timezone
from fastapi import HTTPException
from fastapi.middleware.cors import CORSMiddleware

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Load the CSV data on startup
    load_data()
    yield

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    example_account = AccountState(
        balance=10000.0,
        equity=10050.0,
        open_risk=1.5,
        daily_pnl=50.0
    )
    return {
        "status": "ok",
        "example_account": example_account,
        "current_bar": get_current_bar()
    }

class PriceResponse(BaseModel):
    current_bar: PriceBar | None
    recent_bars: list[PriceBar]


@app.get("/price", response_model=PriceResponse)
def get_price_data():
    return PriceResponse(
        current_bar=get_current_bar(),
        recent_bars=get_recent_bars(50)
    )

@app.post("/scan", response_model=TradeProposal)
def scan_market():
    return run_scan()

@app.post("/decision", response_model=TradeProposal)
def submit_decision(request: HumanDecisionRequest):
    proposal = PROPOSALS_DB.get(request.proposal_id)
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")
    
    proposal.human_decision = request.decision
    proposal.human_decision_at = datetime.now(timezone.utc).isoformat()
    return proposal

@app.get("/debug/technical")
def debug_technical():
    bars = get_recent_bars(50)
    return analyze_technical(bars)

@app.get("/debug/strategy")
def debug_strategy():
    account = AccountState(balance=10000.0, equity=10000.0, open_risk=0.0, daily_pnl=0.0)
    bars = get_recent_bars(50)
    tech = analyze_technical(bars)
    current = get_current_bar()
    if not current:
        return {"error": "No price data available"}
    proposal = generate_strategy(tech, account, current.close)
    return proposal

@app.get("/debug/risk")
def debug_risk():
    account = AccountState(balance=10000.0, equity=10000.0, open_risk=0.0, daily_pnl=0.0)
    bars = get_recent_bars(50)
    tech = analyze_technical(bars)
    current = get_current_bar()
    if not current:
        return {"error": "No price data available"}
    proposal = generate_strategy(tech, account, current.close)
    proposal = apply_risk_checks(proposal, account)
    return proposal
