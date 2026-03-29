from pydantic import BaseModel

class PriceBar(BaseModel):
    timestamp: str
    open: float
    high: float
    low: float
    close: float
    volume: float | None = None

class AccountState(BaseModel):
    balance: float
    equity: float
    open_risk: float
    daily_pnl: float

class AgentSummaries(BaseModel):
    technical: str
    strategy: str
    risk: str

class TradeProposal(BaseModel):
    id: int | None = None
    direction: str
    size: float
    entry: float
    sl: float
    tp: float
    reason: str
    risk_status: str
    risk_percent: float = 0.0
    orchestrator_reason: str | None = None
    human_decision: str | None = None
    human_decision_at: str | None = None
    agent_summaries: AgentSummaries | None = None

class HumanDecisionRequest(BaseModel):
    proposal_id: int
    decision: str
