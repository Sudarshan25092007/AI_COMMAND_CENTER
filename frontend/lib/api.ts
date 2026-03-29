const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export type PriceBar = {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number | null;
};

export type PriceResponse = {
  current_bar: PriceBar | null;
  recent_bars: PriceBar[];
};

export type AgentSummaries = {
  technical: string;
  strategy: string;
  risk: string;
};

export type TradeProposal = {
  id?: number;
  direction: string;
  size: number;
  entry: number;
  sl: number;
  tp: number;
  reason: string;
  risk_status: string;
  risk_percent: number;
  orchestrator_reason?: string;
  human_decision?: "APPROVED_BY_HUMAN" | "REJECTED_BY_HUMAN" | null;
  human_decision_at?: string | null;
  agent_summaries?: AgentSummaries | null;
};

export async function fetchPrice(): Promise<PriceResponse> {
  // Configured `no-store` securely to prevent Next.js from caching old data 
  const res = await fetch(`${BASE_URL}/price`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch price");
  return res.json();
}

export async function scanMarket(): Promise<TradeProposal> {
  const res = await fetch(`${BASE_URL}/scan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" }
  });
  if (!res.ok) throw new Error("Failed to scan market");
  return res.json();
}

export async function submitDecision(
  proposalId: number,
  decision: "APPROVED_BY_HUMAN" | "REJECTED_BY_HUMAN"
): Promise<TradeProposal> {
  const res = await fetch(`${BASE_URL}/decision`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ proposal_id: proposalId, decision }),
  });
  if (!res.ok) throw new Error("Failed to submit decision");
  return res.json();
}
