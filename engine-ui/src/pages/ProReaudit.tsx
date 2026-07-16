// @ts-nocheck
import { useState } from "react";
import Nav from "../components/Nav";
import Blobs from "../components/Blobs";

const C = {
  bg: "#EEF1F5", navy: "#0B1C48", forest: "#186132", emerald: "#148C59",
  mint: "#14D571", violet: "#5B61F4", muted: "#6B7280", dim: "#9CA3AF",
};

const glass = {
  background: "rgba(255,255,255,0.6)", backdropFilter: "blur(24px)",
  WebkitBackdropFilter: "blur(24px)", borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.75)",
  boxShadow: "0 4px 20px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.7)",
};

const KEYFRAMES = `
@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes progressFill{from{width:0%}to{width:var(--w)}}
`;

const MOCK_FINDINGS = [
  { l: "CTA above fold",          prev: "Critical", now: "resolved",  icon: "✓", c: "#16A34A" },
  { l: "Value proposition",       prev: "Critical", now: "resolved",  icon: "✓", c: "#16A34A" },
  { l: "Social proof placement",  prev: "Major",    now: "improved",  icon: "↑", c: "#148C59" },
  { l: "Mobile nav hides pricing",prev: "Major",    now: "regressed", icon: "↓", c: "#F59E0B" },
  { l: "Brand voice consistency", prev: "Major",    now: "unchanged", icon: "—", c: "#9CA3AF" },
  { l: "Feature copy outcomes",   prev: "Minor",    now: "resolved",  icon: "✓", c: "#16A34A" },
];

const ROW_BG = {
  resolved:  "rgba(20,213,113,0.05)",
  improved:  "rgba(20,140,89,0.05)",
  regressed: "rgba(245,158,11,0.06)",
  unchanged: "rgba(0,0,0,0.02)",
};

export default function ProReaudit({ auditId }: { auditId: string }) {
  const [tab, setTab]           = useState<"delta"|"resolved"|"regressed"|"unchanged">("delta");
  const [running, setRunning]   = useState(false);
  const [ran, setRan]           = useState(false);
  const [progress, setProgress] = useState(0);

  const runAudit = () => {
    setRunning(true); setProgress(0); setRan(false);
    let p = 0;
    const tick = setInterval(() => {
      p = Math.min(p + Math.random() * 18 + 8, 100);
      setProgress(p);
      if (p >= 100) { clearInterval(tick); setTimeout(() => { setRunning(false); setRan(true); }, 400); }
    }, 500);
  };

  const goBack = () => {
    window.history.pushState({}, "", `/report/${auditId}`);
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  const resolved  = MOCK_FINDINGS.filter(f => f.now === "resolved");
  const regressed = MOCK_FINDINGS.filter(f => f.now === "regressed");
  const improved  = MOCK_FINDINGS.filter(f => f.now === "improved");
  const unchanged = MOCK_FINDINGS.filter(f => f.now === "unchanged");

  const tabMap = { delta: MOCK_FINDINGS, resolved: [...resolved, ...improved], regressed, unchanged };
  const tabFindings = tabMap[tab];

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Space Grotesk',sans-serif", position: "relative" }}>
      <style>{KEYFRAMES}</style>
      <Blobs />
      <Nav />

      <div style={{ maxWidth: 820, margin: "0 auto", padding: "0 28px 60px" }}>

        {/* Back */}
        <button onClick={goBack} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: C.muted, fontFamily: "'Space Grotesk',sans-serif", padding: 0, marginBottom: 20, display: "flex", alignItems: "center", gap: 6 }}>
          ← Back to report
        </button>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
          <h1 style={{ fontFamily: "'Unbounded',sans-serif", fontSize: 24, fontWeight: 700, color: C.navy, margin: 0, letterSpacing: "-0.5px" }}>
            Re-audit & <span style={{ background: "linear-gradient(90deg,#186132,#14D571)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Regression Tracking</span>
          </h1>
          <div style={{ fontSize: 9, fontWeight: 700, background: "rgba(91,97,244,0.1)", color: C.violet, borderRadius: 20, padding: "4px 12px", letterSpacing: "0.04em", flexShrink: 0 }}>Pro</div>
        </div>
        <p style={{ fontSize: 13, color: C.muted, margin: "0 0 28px", lineHeight: 1.6 }}>
          Re-run the full 50-check audit after making changes. See what improved, what regressed, and what new issues surfaced since your last run.
        </p>

        {/* Main card */}
        <div style={{ ...glass, padding: 0, overflow: "hidden", animation: "fadeUp 0.35s ease both" }}>

          {/* Run header */}
          <div style={{ padding: "22px 24px", borderBottom: "1px solid rgba(0,0,0,0.05)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.navy, marginBottom: 4 }}>Previous audit — Audit #{auditId}</div>
              <div style={{ display: "flex", gap: 8 }}>
                {[["3 Resolved", "#16A34A"], ["1 Regressed", "#F59E0B"], ["Score +13", "#148C59"]].map(([t, c]) => (
                  <div key={t} style={{ fontSize: 11, fontWeight: 600, color: c, background: `${c}18`, border: `1px solid ${c}30`, borderRadius: 6, padding: "3px 9px" }}>{t}</div>
                ))}
              </div>
            </div>
            {!ran && (
              <button onClick={runAudit} disabled={running}
                style={{ flexShrink: 0, padding: "10px 20px", borderRadius: 9, border: "none", cursor: running ? "not-allowed" : "pointer", background: running ? "rgba(20,140,89,0.1)" : "linear-gradient(135deg,#186132,#14D571)", color: running ? C.emerald : "#fff", fontFamily: "'Space Grotesk',sans-serif", fontSize: 12, fontWeight: 700, transition: "all 0.2s", boxShadow: running ? "none" : "0 2px 8px rgba(20,140,89,0.25)" }}>
                {running ? "Running…" : "Run Re-audit →"}
              </button>
            )}
            {ran && (
              <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 16px", borderRadius: 9, background: "rgba(20,213,113,0.1)", border: "1px solid rgba(20,213,113,0.2)", flexShrink: 0 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#16A34A" }}>Audit complete</span>
              </div>
            )}
          </div>

          {/* Progress */}
          {running && (
            <div style={{ padding: "16px 24px", background: "rgba(20,213,113,0.03)", borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>
                <span style={{ fontSize: 12, color: C.muted }}>Comparing against previous audit…</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: C.emerald }}>{Math.round(progress)}%</span>
              </div>
              <div style={{ height: 5, borderRadius: 3, background: "rgba(0,0,0,0.06)", overflow: "hidden" }}>
                <div style={{ height: "100%", borderRadius: 3, background: `linear-gradient(90deg,${C.forest},${C.mint})`, width: `${progress}%`, transition: "width 0.4s ease" }} />
              </div>
            </div>
          )}

          {/* Results */}
          {ran && (
            <>
              {/* Score banner */}
              <div style={{ padding: "20px 24px", background: "linear-gradient(135deg,rgba(20,213,113,0.06),rgba(91,97,244,0.04))", borderBottom: "1px solid rgba(0,0,0,0.05)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                  {[["Previous", "61", C.dim], ["", "→", C.mint], ["Now", "74", C.emerald]].map(([label, val, col], i) => (
                    label === "" ? (
                      <div key={i} style={{ fontSize: 22, color: col, fontWeight: 300 }}>{val}</div>
                    ) : (
                      <div key={i} style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 10, fontWeight: 600, color: C.dim, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>{label}</div>
                        <div style={{ fontFamily: "'Unbounded',sans-serif", fontSize: label === "Now" ? 32 : 24, fontWeight: 800, color: col }}>{val}</div>
                      </div>
                    )
                  ))}
                  <div style={{ padding: "5px 14px", borderRadius: 20, background: "rgba(20,213,113,0.15)", border: "1px solid rgba(20,213,113,0.25)" }}>
                    <span style={{ fontFamily: "'Unbounded',sans-serif", fontSize: 13, fontWeight: 800, color: C.emerald }}>+13 pts</span>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 20 }}>
                  {[[resolved.length, "Resolved", "#16A34A"], [improved.length, "Improved", C.emerald], [regressed.length, "Regressed", "#F59E0B"], [unchanged.length, "Unchanged", C.dim]].map(([n, l, c]) => (
                    <div key={l} style={{ textAlign: "center" }}>
                      <div style={{ fontFamily: "'Unbounded',sans-serif", fontSize: 20, fontWeight: 800, color: c }}>{n}</div>
                      <div style={{ fontSize: 10, color: C.dim, marginTop: 2 }}>{l}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Score bar */}
              <div style={{ padding: "14px 24px", borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
                <div style={{ position: "relative", height: 7, borderRadius: 4, background: "rgba(0,0,0,0.06)", overflow: "hidden", marginBottom: 6 }}>
                  <div style={{ position: "absolute", left: 0, top: 0, height: "100%", borderRadius: 4, background: "rgba(0,0,0,0.1)", width: "61%" }} />
                  <div style={{ position: "absolute", left: 0, top: 0, height: "100%", borderRadius: 4, background: `linear-gradient(90deg,${C.forest},${C.mint})`, width: "74%", transition: "width 1s ease" }} />
                  <div style={{ position: "absolute", top: -2, left: "61%", transform: "translateX(-50%)", width: 2, height: 11, background: "rgba(255,255,255,0.9)", borderRadius: 1 }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: C.dim }}>
                  <span>Previous: 61</span><span>Industry avg: 68</span><span style={{ color: C.emerald, fontWeight: 600 }}>Current: 74</span>
                </div>
              </div>

              {/* Tabs */}
              <div style={{ display: "flex", borderBottom: "1px solid rgba(0,0,0,0.05)", background: "rgba(255,255,255,0.4)" }}>
                {(["delta", "resolved", "regressed", "unchanged"] as const).map((v, i) => {
                  const labels = ["All Changes", "Resolved & Improved", "Regressed", "Unchanged"];
                  return (
                    <button key={v} onClick={() => setTab(v)}
                      style={{ padding: "10px 16px", fontSize: 11, fontWeight: tab === v ? 700 : 400, color: tab === v ? C.emerald : C.dim, background: "transparent", border: "none", borderBottom: tab === v ? `2px solid ${C.emerald}` : "2px solid transparent", cursor: "pointer", transition: "all 0.2s", fontFamily: "'Space Grotesk',sans-serif", whiteSpace: "nowrap", marginBottom: -1 }}>
                      {labels[i]}
                    </button>
                  );
                })}
              </div>

              {/* Rows */}
              <div style={{ maxHeight: 320, overflowY: "auto" }}>
                {tabFindings.map((f, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 24px", borderBottom: "1px solid rgba(0,0,0,0.04)", background: ROW_BG[f.now] }}>
                    <div style={{ width: 24, height: 24, borderRadius: "50%", border: `1.5px solid ${f.c}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: f.c }}>{f.icon}</span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: C.navy }}>{f.l}</div>
                      <div style={{ fontSize: 11, color: C.dim, marginTop: 2 }}>Was: <span style={{ fontWeight: 600, color: C.muted }}>{f.prev}</span></div>
                    </div>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: f.c, padding: "3px 10px", borderRadius: 20, border: `1px solid ${f.c}33`, background: ROW_BG[f.now] }}>{f.now}</div>
                  </div>
                ))}
              </div>

              {/* Lock CTA */}
              <div style={{ padding: "14px 24px", borderTop: "1px solid rgba(0,0,0,0.05)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 14 }}>🔒</span>
                  <span style={{ fontSize: 12, color: C.muted }}>Re-audit unlocks once your Pulse checklist is complete</span>
                </div>
                <button onClick={() => { setRan(false); setProgress(0); }}
                  style={{ fontSize: 11, fontWeight: 600, color: C.emerald, background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>
                  Reset demo
                </button>
              </div>
            </>
          )}

          {/* Idle state */}
          {!ran && !running && (
            <div style={{ padding: "20px 24px", display: "flex", alignItems: "center", gap: 14, background: "rgba(11,28,72,0.02)" }}>
              <div style={{ flex: 1, fontSize: 12, color: C.dim, lineHeight: 1.6 }}>
                Click "Run Re-audit →" to simulate what happens after you ship fixes. See score delta, resolved vs regressed findings, and what new issues surfaced.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
