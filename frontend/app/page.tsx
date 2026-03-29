"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Scan, Radio, Activity, Zap, ShieldCheck, ShieldAlert,
  TrendingUp, TrendingDown, Minus, Clock, ChevronRight,
  Brain, Target, AlertTriangle, BarChart3
} from "lucide-react";
import dynamic from "next/dynamic";
import {
  fetchPrice, scanMarket, submitDecision,
  PriceResponse, TradeProposal, PriceBar,
} from "@/lib/api";

const MiniChart = dynamic(() => import("@/components/MiniChart"), { ssr: false });

type ProposalRecord = TradeProposal & { timestamp: string; isNew?: boolean };

/* ──────────────────── Typewriter ──────────────────── */
function TypewriterText({ text, speed = 18 }: { text: string; speed?: number }) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);
  useEffect(() => {
    setDisplayed("");
    setDone(false);
    let i = 0;
    const iv = setInterval(() => {
      if (i < text.length) {
        setDisplayed(text.slice(0, i + 1));
        i++;
      } else {
        setDone(true);
        clearInterval(iv);
      }
    }, speed);
    return () => clearInterval(iv);
  }, [text, speed]);
  return (
    <span>
      {displayed}
      {!done && <span className="cursor-blink text-sky-400 font-bold">_</span>}
    </span>
  );
}

/* ──────────────────── Agent LED ──────────────────── */
function AgentLED({
  label, color, text,
}: {
  label: string;
  color: "green" | "yellow" | "red" | "blue" | "purple";
  text: string;
}) {
  const colorMap = {
    green: "bg-emerald-400 text-emerald-400",
    yellow: "bg-amber-400 text-amber-400",
    red: "bg-red-400 text-red-400",
    blue: "bg-sky-400 text-sky-400",
    purple: "bg-purple-400 text-purple-400",
  };
  return (
    <div className="flex items-start gap-3 py-1.5">
      <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 led-active ${colorMap[color].split(" ")[0]}`} />
      <div>
        <span className={`text-[10px] font-bold uppercase tracking-widest ${colorMap[color].split(" ")[1]}`}>
          {label}
        </span>
        <p className="text-slate-400 text-xs font-mono leading-relaxed mt-0.5">{text}</p>
      </div>
    </div>
  );
}

/* ──────────────────── Main ──────────────────── */
export default function AetherCommand() {
  const [priceData, setPriceData] = useState<PriceResponse | null>(null);
  const [proposal, setProposal] = useState<TradeProposal | null>(null);
  const [history, setHistory] = useState<ProposalRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [autoScan, setAutoScan] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [priceFlash, setPriceFlash] = useState<"up" | "down" | null>(null);
  const [showStamp, setShowStamp] = useState(false);
  const [stampType, setStampType] = useState<"CONFIRMED" | "REJECTED">("CONFIRMED");
  const prevPrice = useRef<number | null>(null);
  const [clock, setClock] = useState<Date | null>(null);

  // Live clock — only starts on client to prevent hydration mismatch
  useEffect(() => {
    setClock(new Date());
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Price polling — freeze when HITL decision is pending
  useEffect(() => {
    const poll = () => {
      fetchPrice()
        .then((data) => {
          const newClose = data.current_bar?.close;
          if (prevPrice.current !== null && newClose != null) {
            if (newClose > prevPrice.current) setPriceFlash("up");
            else if (newClose < prevPrice.current) setPriceFlash("down");
            setTimeout(() => setPriceFlash(null), 1500);
          }
          if (newClose != null) prevPrice.current = newClose;
          setPriceData(data);
          setError(null);
        })
        .catch(() => setError("Feed decoupled"));
    };
    poll();
    const iv = setInterval(poll, 10000);
    return () => clearInterval(iv);
  }, []);

  // Auto-scan — pauses when a proposal awaiting human decision is active
  useEffect(() => {
    if (!autoScan) return;
    // Don't auto-scan if we have an undecided proposal
    if (proposal && !proposal.human_decision) return;
    const iv = setInterval(() => {
      document.getElementById("scan-btn")?.click();
    }, 15000);
    return () => clearInterval(iv);
  }, [autoScan, proposal]);

  const handleScan = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await scanMarket();
      setProposal(data);
      const priceUpdate = await fetchPrice();
      setPriceData(priceUpdate);

      const newClose = priceUpdate.current_bar?.close;
      if (prevPrice.current !== null && newClose != null) {
        if (newClose > prevPrice.current) setPriceFlash("up");
        else if (newClose < prevPrice.current) setPriceFlash("down");
        setTimeout(() => setPriceFlash(null), 1500);
      }
      if (newClose != null) prevPrice.current = newClose;

      const ts = priceUpdate.current_bar?.timestamp
        ? new Date(priceUpdate.current_bar.timestamp).toLocaleString()
        : new Date().toLocaleString();
      setHistory((prev) => [{ ...data, timestamp: ts, isNew: true }, ...prev]);
      // Clear "new" badge after 3s
      setTimeout(() => {
        setHistory((prev) =>
          prev.map((p, i) => (i === 0 ? { ...p, isNew: false } : p))
        );
      }, 3000);
    } catch (err: any) {
      setError(err.message || "Scan failed");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDecision = useCallback(
    async (decision: "APPROVED_BY_HUMAN" | "REJECTED_BY_HUMAN") => {
      if (!proposal?.id) return;
      try {
        const updated = await submitDecision(proposal.id, decision);
        const isApproved = decision === "APPROVED_BY_HUMAN";
        setStampType(isApproved ? "CONFIRMED" : "REJECTED");
        setShowStamp(true);
        setTimeout(() => {
          setShowStamp(false);
          setProposal({
            ...proposal,
            human_decision: updated.human_decision,
            human_decision_at: updated.human_decision_at,
          });
          setHistory((prev) =>
            prev.map((p) =>
              p.id === updated.id
                ? { ...p, human_decision: updated.human_decision }
                : p
            )
          );
        }, 1200);
      } catch (err) {
        console.error("Decision failed:", err);
      }
    },
    [proposal]
  );

  const bar = priceData?.current_bar;
  const recentBars = priceData?.recent_bars || [];
  const closePrice = bar?.close;
  const dir = proposal?.direction || "none";
  const pulseClass = dir === "long" ? "pulse-long" : dir === "short" ? "pulse-short" : "pulse-neutral";
  const dirColor = dir === "long" ? "text-emerald-400" : dir === "short" ? "text-red-400" : "text-slate-500";
  const isActive = dir !== "none";

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* ═══════ ORBITAL HEADER ═══════ */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-xl shrink-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 led-active" />
          <h1 className="text-sm font-bold text-slate-100 tracking-wider uppercase">
            Aether Command<span className="text-sky-400 ml-1">:</span>
            <span className="text-sky-400 ml-1 font-mono">XAUUSD ORBITAL</span>
          </h1>
        </div>

        <div className="flex items-center gap-2 text-slate-500 font-mono text-[11px]">
          <Clock size={12} />
          {clock ? clock.toLocaleTimeString() : "--:--:--"} UTC+5:30
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">LIVE</span>
          <div className={`text-xl font-black font-mono text-slate-100 tabular-nums
            ${priceFlash === "up" ? "price-flash-up" : priceFlash === "down" ? "price-flash-down" : ""}
          `}>
            ${closePrice != null ? Number(closePrice).toFixed(2) : "----.--"}
          </div>
        </div>
      </header>

      {/* ═══════ COCKPIT GRID ═══════ */}
      <div className="flex-1 grid gap-0 overflow-hidden" style={{ gridTemplateColumns: '280px 1fr 220px' }}>

        {/* ── COLUMN 1: SENSORS & CONTROLS ── */}
        <aside className="border-r border-slate-800/60 bg-slate-950/50 p-4 flex flex-col gap-3 overflow-y-auto">
          {/* System Controls */}
          <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/60 rounded-lg p-4">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <Radio size={10} /> System Controls
            </div>

            <button
              id="scan-btn"
              onClick={handleScan}
              disabled={loading}
              className={`w-full py-3 px-4 mb-4 bg-slate-900 border-2 border-sky-500/50 text-sky-300 font-bold text-sm uppercase tracking-widest rounded-lg
                hover:bg-sky-900/30 hover:border-sky-400 hover:shadow-[0_0_15px_rgba(56,189,248,0.3)]
                active:scale-95 transition-all disabled:opacity-40 disabled:cursor-wait
                flex items-center justify-center gap-2 ${!loading ? 'scan-btn-idle' : ''}`}
            >
              {loading ? (
                <><Activity size={14} className="animate-spin" /> Scanning...</>
              ) : (
                <><Scan size={14} /> Execute Scan</>
              )}
            </button>

            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Auto-Scan</span>
              <button
                onClick={() => setAutoScan(!autoScan)}
                className={`cockpit-switch ${autoScan ? "active" : ""}`}
                aria-label="Toggle auto-scan"
              />
            </div>
            {autoScan && (
              <div className="text-[9px] text-emerald-400 font-mono mt-1 flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> POLLING 15s
              </div>
            )}
          </div>

          {/* Market Metrics */}
          <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/60 rounded-lg p-3">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <BarChart3 size={10} /> Market Metrics
            </div>
            <div className="space-y-2 text-[11px] font-mono">
              <div className="flex justify-between">
                <span className="text-slate-500">Open</span>
                <span className="text-slate-300">{bar?.open != null ? Number(bar.open).toFixed(2) : "---"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">High</span>
                <span className="text-emerald-400">{bar?.high != null ? Number(bar.high).toFixed(2) : "---"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Low</span>
                <span className="text-red-400">{bar?.low != null ? Number(bar.low).toFixed(2) : "---"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Close</span>
                <span className="text-sky-400 font-bold">{closePrice != null ? Number(closePrice).toFixed(2) : "---"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Spread</span>
                <span className="text-slate-300">{bar?.high != null && bar?.low != null ? (Number(bar.high) - Number(bar.low)).toFixed(2) : "---"}</span>
              </div>
            </div>
          </div>

          {/* Mini Chart */}
          <div className="relative bg-gradient-to-b from-slate-900/80 to-slate-950/90 backdrop-blur-xl border border-slate-700/40 rounded-xl overflow-hidden flex-1 min-h-[180px] shadow-[inset_0_1px_0_rgba(148,163,184,0.05)]">
            <div className="px-3 pt-2.5 pb-1 flex items-center justify-between">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                <Activity size={10} className="text-emerald-500/70" /> Price Feed
              </div>
              <div className="text-[9px] font-mono text-emerald-400/60 uppercase tracking-wider">Live</div>
            </div>
            <div className="h-[calc(100%-32px)] px-1">
              <MiniChart bars={recentBars} />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-2 text-[10px] text-red-400 font-mono flex items-center gap-1.5">
              <AlertTriangle size={10} /> {error}
            </div>
          )}
        </aside>

        {/* ── COLUMN 2: AI MISSION TERMINAL ── */}
        <main className={`p-4 overflow-y-auto relative ${proposal ? 'radar-line' : ''}`}>
          {/* STAMP OVERLAY */}
          <AnimatePresence>
            {showStamp && (
              <motion.div
                className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <motion.div
                  initial={{ scale: 5, opacity: 0, rotate: -15 }}
                  animate={{ scale: 1, opacity: 0.9, rotate: 0 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className={`text-6xl font-black uppercase tracking-widest border-8 px-10 py-4 rounded-xl
                    ${stampType === "CONFIRMED"
                      ? "text-emerald-400 border-emerald-400 bg-emerald-400/10"
                      : "text-red-400 border-red-400 bg-red-400/10"
                    }`}
                  style={{ textShadow: stampType === "CONFIRMED" ? "0 0 40px rgba(74,222,128,0.5)" : "0 0 40px rgba(239,68,68,0.5)" }}
                >
                  {stampType}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {!proposal ? (
            /* AWAITING COMMAND state */
            <div className="h-full flex flex-col items-center justify-center gap-4">
              <div className="w-16 h-16 rounded-full border-2 border-slate-700 flex items-center justify-center">
                <Zap size={28} className="text-slate-600" />
              </div>
              <div className="font-mono text-slate-600 text-sm">
                <TypewriterText text="AWAITING COMMAND... Execute scan to initialize agent pipeline." speed={40} />
              </div>
            </div>
          ) : (
            <div className="space-y-4 max-w-4xl mx-auto">
              {/* LIVE ACTION CARD */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`bg-slate-900/60 backdrop-blur-xl border-2 rounded-xl p-5 shadow-2xl relative overflow-hidden ${pulseClass}`}
              >
                {/* Direction sweep background */}
                <div className={`absolute inset-0 opacity-[0.03] ${
                  dir === "long" ? "bg-gradient-to-br from-emerald-400 to-transparent" :
                  dir === "short" ? "bg-gradient-to-br from-red-400 to-transparent" :
                  "bg-gradient-to-br from-sky-400 to-transparent"
                }`} />

                <div className="relative z-10">
                  {/* Top bar: Risk badge + Timestamp */}
                  <div className="flex justify-between items-center mb-4">
                    <span className={`px-3 py-1 rounded text-[10px] font-black uppercase tracking-widest
                      ${proposal.risk_status === "OK" ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" :
                        proposal.risk_status === "WARN" ? "bg-amber-500/15 text-amber-400 border border-amber-500/30" :
                        "bg-red-500/15 text-red-400 border border-red-500/30"
                      }`}>
                      <ShieldCheck size={10} className="inline mr-1" />
                      Risk: {proposal.risk_status}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">
                      {bar ? new Date(bar.timestamp).toLocaleString() : "---"}
                    </span>
                  </div>

                  {/* HUGE DIRECTION */}
                  <div className="text-center my-4">
                    <div className="flex items-center justify-center gap-3 mb-1">
                      {dir === "long" && <TrendingUp size={36} className="text-emerald-400" />}
                      {dir === "short" && <TrendingDown size={36} className="text-red-400" />}
                      {dir === "none" && <Minus size={28} className="text-slate-500" />}
                      <span className={`text-6xl font-black font-mono uppercase tracking-wider ${dirColor}`}
                        style={{ textShadow: isActive ? `0 0 30px ${dir === "long" ? "rgba(74,222,128,0.4)" : "rgba(239,68,68,0.4)"}` : "none" }}>
                        {dir === "none" ? "STAND ASIDE" : dir}
                      </span>
                    </div>
                  </div>

                  {/* Metric modules */}
                  {isActive ? (
                    <div className="grid grid-cols-4 gap-3 mt-4">
                      {[
                        { icon: Target, label: "Entry", value: Number(proposal.entry).toFixed(2), color: "text-sky-400" },
                        { icon: ShieldAlert, label: "Stop Loss", value: Number(proposal.sl).toFixed(2), color: "text-red-400" },
                        { icon: Zap, label: "Take Profit", value: Number(proposal.tp).toFixed(2), color: "text-emerald-400" },
                        { icon: BarChart3, label: "Size", value: `${Number(proposal.size).toFixed(2)}L (${Number(proposal.risk_percent).toFixed(2)}%)`, color: "text-purple-400" },
                      ].map((m, i) => (
                        <motion.div key={m.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                          className="bg-slate-950/60 border border-slate-800/50 rounded-lg p-3 text-center">
                          <m.icon size={14} className={`mx-auto mb-1 ${m.color}`} />
                          <div className="text-[9px] text-slate-500 uppercase tracking-widest font-bold mb-1">{m.label}</div>
                          <div className={`font-mono font-bold text-sm ${m.color}`}>{m.value}</div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-slate-500 text-xs font-mono py-2">
                      No active trade parameters — agents standing aside
                    </div>
                  )}
                </div>
              </motion.div>

              {/* AI ORCHESTRATOR REASONING */}
              <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                className="bg-slate-900/40 backdrop-blur-xl border border-purple-500/20 rounded-xl p-4 shadow-[0_0_30px_rgba(192,132,252,0.05)]">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center">
                    <Brain size={12} className="text-purple-400" />
                  </div>
                  <span className="text-[10px] font-bold text-purple-400 uppercase tracking-widest">
                    AI Orchestrator Reasoning
                  </span>
                  <div className="group relative cursor-help">
                    <div className="w-3.5 h-3.5 rounded-full border border-purple-500/40 text-purple-400 text-[8px] flex items-center justify-center font-bold">i</div>
                    <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-56 p-2 bg-slate-950 border border-purple-500/30 rounded-lg text-slate-400 text-[10px] z-50 shadow-xl">
                      Reasoning generated by Gemini when available, otherwise synthesized from internal agent outputs.
                    </div>
                  </div>
                </div>
                <div className="text-slate-300 text-sm leading-relaxed font-mono">
                  <TypewriterText text={proposal.orchestrator_reason || proposal.reason} speed={12} />
                </div>
              </motion.div>

              {/* AGENT BREAKDOWN — LED SCHEMATIC */}
              {proposal.agent_summaries && (
                <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
                  className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/50 rounded-xl p-4">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                    <Activity size={10} /> Agent Telemetry
                  </div>
                  <AgentLED label="Technical" color="blue" text={proposal.agent_summaries.technical} />
                  <AgentLED label="Strategy" color="purple" text={proposal.agent_summaries.strategy} />
                  <AgentLED label="Risk" color={proposal.risk_status === "OK" ? "green" : proposal.risk_status === "WARN" ? "yellow" : "red"}
                    text={proposal.agent_summaries.risk} />
                </motion.div>
              )}

              {/* HITL CONTROLS */}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
                className="flex items-center justify-center gap-4 pt-2">
                {!proposal.human_decision ? (
                  <>
                    <button onClick={() => handleDecision("REJECTED_BY_HUMAN")}
                      className="px-6 py-2.5 bg-slate-900 border-2 border-red-500/40 text-red-400 font-bold text-xs uppercase tracking-widest rounded-lg
                        hover:bg-red-500/10 hover:border-red-400 hover:shadow-[0_0_20px_rgba(239,68,68,0.3)]
                        active:scale-95 transition-all flex items-center gap-2">
                      <ShieldAlert size={14} /> Reject
                    </button>
                    <button onClick={() => handleDecision("APPROVED_BY_HUMAN")}
                      className="px-8 py-2.5 bg-slate-900 border-2 border-emerald-500/40 text-emerald-400 font-bold text-xs uppercase tracking-widest rounded-lg
                        hover:bg-emerald-500/10 hover:border-emerald-400 hover:shadow-[0_0_20px_rgba(74,222,128,0.3)]
                        active:scale-95 transition-all flex items-center gap-2">
                      <ShieldCheck size={14} /> Approve & Execute
                    </button>
                  </>
                ) : (
                  <span className={`px-5 py-2 rounded-lg text-xs font-black uppercase tracking-widest flex items-center gap-2
                    ${proposal.human_decision === "APPROVED_BY_HUMAN"
                      ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-[0_0_15px_rgba(74,222,128,0.2)]"
                      : "bg-red-500/15 text-red-400 border border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.2)]"
                    }`}>
                    {proposal.human_decision === "APPROVED_BY_HUMAN" ? <>✅ Approved</> : <>❌ Rejected</>}
                  </span>
                )}
              </motion.div>
            </div>
          )}
        </main>

        {/* ── COLUMN 3: THE LEDGER ── */}
        <aside className="border-l border-slate-800/60 bg-slate-950/50 flex flex-col overflow-hidden">
          <div className="px-3 py-2.5 border-b border-slate-800/60 bg-slate-900/40 flex items-center gap-1.5 shrink-0">
            <Clock size={10} className="text-slate-500" />
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Pipeline Ledger</span>
          </div>

          <div className="flex-1 overflow-y-auto">
            {history.length === 0 ? (
              <div className="p-4 text-center text-slate-600 text-[10px] font-mono">
                No transactions yet
              </div>
            ) : (
              <div className="divide-y divide-slate-800/40">
                {history.slice(0, 20).map((item, idx) => {
                  const t = item.direction !== "none";
                  const pnl = t ? Math.abs(item.tp - item.entry) * item.size * 100 : null;
                  return (
                    <motion.div key={idx}
                      initial={idx === 0 ? { opacity: 0, x: 20 } : false}
                      animate={{ opacity: 1, x: 0 }}
                      className={`px-3 py-2 text-[10px] ${idx % 2 === 0 ? "bg-slate-950/30" : "bg-slate-900/20"} hover:bg-slate-800/20 transition-colors`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono text-slate-500">{item.timestamp}</span>
                        {item.isNew && (
                          <span className="new-badge px-1.5 py-0.5 bg-sky-500/20 text-sky-400 rounded text-[8px] font-bold uppercase">New</span>
                        )}
                      </div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className={`font-black uppercase tracking-wider ${
                          item.direction === "long" ? "text-emerald-400" :
                          item.direction === "short" ? "text-red-400" : "text-slate-500"
                        }`}>
                          {item.direction === "none" ? "ASIDE" : item.direction}
                        </span>
                        <span className="font-mono text-emerald-400 font-bold">
                          {pnl ? `+$${pnl.toFixed(0)}` : "---"}
                        </span>
                      </div>
                      {t && (
                        <div className="flex gap-3 font-mono text-[9px] text-slate-500 mb-1.5">
                          <span>E:{Number(item.entry).toFixed(0)}</span>
                          <span className="text-red-400/60">SL:{Number(item.sl).toFixed(0)}</span>
                          <span className="text-emerald-400/60">TP:{Number(item.tp).toFixed(0)}</span>
                        </div>
                      )}
                      {/* Status badge */}
                      {!item.human_decision ? (
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider
                          ${item.risk_status === "OK" ? "bg-emerald-500/10 text-emerald-400/70 border border-emerald-500/20" :
                            item.risk_status === "WARN" ? "bg-amber-500/10 text-amber-400/70 border border-amber-500/20" :
                            "bg-red-500/10 text-red-400/70 border border-red-500/20"
                          }`}>
                          AGENTS: {item.risk_status}
                        </span>
                      ) : (
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider
                          ${item.human_decision === "APPROVED_BY_HUMAN"
                            ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-[0_0_6px_rgba(74,222,128,0.2)]"
                            : "bg-red-500/15 text-red-400 border border-red-500/30 shadow-[0_0_6px_rgba(239,68,68,0.2)]"
                          }`}>
                          {item.human_decision === "APPROVED_BY_HUMAN" ? "HUMAN: APPROVED" : "HUMAN: OVERRIDDEN"}
                        </span>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
