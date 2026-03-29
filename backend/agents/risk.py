from models import TradeProposal, AccountState

MAX_RISK_OK = 0.015   # 1.5% of balance
MAX_RISK_WARN = 0.03 # 3% of balance

def apply_risk_checks(proposal: TradeProposal, account: AccountState) -> TradeProposal:
    """
    Given a proposed trade and the current account state, compute an approximate
    risk-per-trade and set proposal.risk_status to one of:
    - "OK"    -> risk per trade <= 1% of balance
    - "WARN"  -> between 1% and 2%
    - "REJECT"-> above 2% or direction == "none"
    """
    if proposal.direction == "none":
        proposal.risk_status = "REJECT"
        return proposal

    per_unit_risk = abs(proposal.entry - proposal.sl)
    if per_unit_risk <= 0 or proposal.size <= 0:
        proposal.risk_status = "REJECT"
        return proposal

    estimated_risk_amount = per_unit_risk * proposal.size

    if account.balance <= 0:
        proposal.risk_status = "REJECT"
        return proposal

    risk_fraction = estimated_risk_amount / account.balance
    proposal.risk_percent = round(risk_fraction * 100, 2)

    if risk_fraction <= MAX_RISK_OK:
        proposal.risk_status = "OK"
    elif risk_fraction <= MAX_RISK_WARN:
        proposal.risk_status = "WARN"
    else:
        proposal.risk_status = "REJECT"

    return proposal
