import { useState, useEffect, useRef } from "react";

const C = {
  bg: "#EEF1F5",
  forest: "#186132",
  emerald: "#148C59",
  mint: "#14D571",
  violet: "#5B61F4",
  navy: "#0B1C48",
  textMuted: "#6B7280",
  textDim: "#9CA3AF",
};

const glass = {
  background: "rgba(255,255,255,0.5)",
  backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
  borderRadius: 14, border: "1px solid rgba(255,255,255,0.65)",
  boxShadow: "0 4px 20px rgba(0,0,0,0.03), 0 1px 3px rgba(0,0,0,0.02), inset 0 1px 0 rgba(255,255,255,0.7)",
};

const STATUS_MESSAGES = [
  "Mapping conversion pathways...", "Scanning above-the-fold signals...",
  "Cross-referencing industry benchmarks...", "Measuring cognitive load patterns...",
  "Evaluating persuasion architecture...", "Detecting friction points...",
  "Parsing trust signal density...", "Analysing content-to-intent alignment...",
];

const SCORE = 58;
const ASSESSMENT = "You're leaving conversions on the table — 3 critical fixes could change everything.";
const FINDINGS = [
  { severity: "critical", text: "Hero copy lacks a clear value proposition" },
  { severity: "major", text: "No trust signals visible above the fold" },
  { severity: "major", text: "Primary CTA competes with navigation links" },
];

const getScoreColor = (s) => s >= 70 ? C.mint : s >= 40 ? C.emerald : C.forest;
const getSeverityBadge = (s) => {
  if (s >= 70) return { label: "Good", bg: "#D1FAE5", color: C.emerald };
  if (s >= 40) return { label: "Needs Work", bg: "#E0E7FF", color: C.violet };
  return { label: "Critical", bg: "#FEE2E2", color: "#DC2626" };
};
const sevDot = { critical: "#DC2626", major: "#F59E0B", minor: C.emerald };

function Pill({ text, variant }) {
  const base = { padding: "5px 14px", borderRadius: 6, border: "none", fontSize: 12.5, whiteSpace: "nowrap", cursor: "default", fontFamily: "'Space Grotesk',sans-serif" };
  if (variant === "green") return <div style={{ ...base, background: "#D1FAE5", color: "#0B1C48", fontWeight: 600, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>{text}</div>;
  if (variant === "violet") return <div style={{ ...base, background: "#E0E7FF", color: "#0B1C48", fontWeight: 600, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>{text}</div>;
  return <div style={{ ...base, background: "rgba(255,255,255,0.85)", color: "#6B7280", fontWeight: 450 }}>{text}</div>;
}

// ─── NODE MAP ───
function NodeMap({ burst }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const startTime = useRef(Date.now());
  const nodesRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const W = 320, H = 320;
    canvas.width = W * dpr; canvas.height = H * dpr;
    canvas.style.width = W + "px"; canvas.style.height = H + "px";
    ctx.scale(dpr, dpr);

    if (!nodesRef.current) {
      const nodes = []; const cx = W / 2, cy = H / 2;
      const rng = (seed) => ((Math.sin(seed * 127.1 + 311.7) * 43758.5453) % 1 + 1) % 1;
      nodes.push({ x: cx, y: cy, r: 5, colorType: "forest" });
      for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2 - Math.PI / 2; nodes.push({ x: cx + Math.cos(a) * 52, y: cy + Math.sin(a) * 52, r: 3.5, colorType: rng(i) > 0.5 ? "violet" : "green" }); }
      for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + 0.2; nodes.push({ x: cx + Math.cos(a) * 95, y: cy + Math.sin(a) * 95, r: 2.5, colorType: rng(i + 10) > 0.45 ? "violet" : "green" }); }
      for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2 + 0.1; nodes.push({ x: cx + Math.cos(a) * 138, y: cy + Math.sin(a) * 138, r: 2, colorType: rng(i + 20) > 0.5 ? "violet" : "green" }); }
      const connections = [];
      for (let i = 1; i <= 5; i++) connections.push([0, i]);
      for (let i = 1; i <= 5; i++) { connections.push([i, 6 + (i % 8)]); connections.push([i, 6 + ((i + 1) % 8)]); }
      for (let i = 6; i <= 13; i++) { connections.push([i, 14 + ((i - 6) % 10)]); connections.push([i, 14 + ((i - 5) % 10)]); }
      for (let i = 6; i < 13; i++) connections.push([i, i + 1]);
      nodesRef.current = { nodes, connections };
    }
    const { nodes, connections } = nodesRef.current;

    function draw() {
      const t = (Date.now() - startTime.current) / 1000;
      ctx.clearRect(0, 0, W, H);
      const waveR = burst ? 999 : ((t * 40) % 210);
      connections.forEach(([a, b]) => {
        const na = nodes[a], nb = nodes[b];
        const midDist = (Math.hypot(na.x - W / 2, na.y - H / 2) + Math.hypot(nb.x - W / 2, nb.y - H / 2)) / 2;
        const activated = midDist < waveR;
        const isV = nb.colorType === "violet";
        ctx.beginPath(); ctx.moveTo(na.x, na.y); ctx.lineTo(nb.x, nb.y);
        const ba = burst ? 0.5 : (0.18 + Math.sin(t * 2 + a) * 0.08);
        ctx.strokeStyle = activated ? (isV ? `rgba(91,97,244,${ba})` : `rgba(20,213,113,${ba})`) : (isV ? "rgba(91,97,244,0.05)" : "rgba(20,140,89,0.05)");
        ctx.lineWidth = activated ? (burst ? 1.5 : 1) : 0.5; ctx.stroke();
        if (activated && !burst) {
          const pulseT = (t * 0.8 + a * 0.3) % 1;
          ctx.beginPath(); ctx.arc(na.x + (nb.x - na.x) * pulseT, na.y + (nb.y - na.y) * pulseT, 1.2, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(20,213,113,${0.5 * (1 - Math.abs(pulseT - 0.5) * 2)})`; ctx.fill();
        }
      });
      nodes.forEach((n) => {
        const dist = Math.hypot(n.x - W / 2, n.y - H / 2);
        const activated = dist < waveR;
        ctx.beginPath(); ctx.arc(n.x, n.y, burst ? n.r * 1.3 : n.r, 0, Math.PI * 2);
        if (n.colorType === "forest") ctx.fillStyle = C.forest;
        else if (burst) ctx.fillStyle = n.colorType === "violet" ? "rgba(91,97,244,0.9)" : "rgba(20,213,113,0.9)";
        else if (n.colorType === "violet") ctx.fillStyle = activated ? `rgba(91,97,244,${0.3 + Math.min(1, (waveR - dist) / 40) * 0.7})` : "rgba(91,97,244,0.12)";
        else ctx.fillStyle = activated ? `rgba(20,213,113,${0.3 + Math.min(1, (waveR - dist) / 40) * 0.7})` : "rgba(20,140,89,0.12)";
        ctx.fill();
      });
      animRef.current = requestAnimationFrame(draw);
    }
    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [burst]);
  return <canvas ref={canvasRef} style={{ display: "block", margin: "0 auto" }} />;
}

function StatusMessage() {
  const [idx, setIdx] = useState(0); const [opacity, setOpacity] = useState(1);
  useEffect(() => { const i = setInterval(() => { setOpacity(0); setTimeout(() => { setIdx(p => (p + 1) % STATUS_MESSAGES.length); setOpacity(1); }, 300); }, 1800); return () => clearInterval(i); }, []);
  return <div style={{ fontSize: 12.5, fontWeight: 500, color: C.textMuted, fontFamily: "'Space Grotesk',sans-serif", opacity, transition: "opacity 0.3s ease", minHeight: 18, textAlign: "center" }}>{STATUS_MESSAGES[idx]}</div>;
}

function ProgressBar() {
  const barRef = useRef(null);
  useEffect(() => { const bar = barRef.current; if (!bar) return; const start = Date.now(); let raf;
    const tick = () => { const p = Math.min((Date.now() - start) / 8000, 1); bar.style.width = (1 - Math.pow(1 - p, 2.5)) * 100 + "%"; if (p < 1) raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf); }, []);
  return <div style={{ width: "100%", maxWidth: 260, height: 3, borderRadius: 2, background: "rgba(0,0,0,0.06)", overflow: "hidden", margin: "0 auto" }}>
    <div ref={barRef} style={{ height: "100%", borderRadius: 2, width: "0%", background: `linear-gradient(90deg,${C.forest},${C.mint})`, boxShadow: "0 0 6px rgba(20,213,113,0.25)" }} />
  </div>;
}

function HangTight() {
  const [show, setShow] = useState(false);
  useEffect(() => { const t = setTimeout(() => setShow(true), 5000); return () => clearTimeout(t); }, []);
  return <div style={{ fontSize: 11, color: C.textDim, fontFamily: "'Space Grotesk',sans-serif", opacity: show ? 1 : 0, transition: "opacity 0.8s ease", marginTop: 4, textAlign: "center" }}>Hang tight — almost there</div>;
}

// ─── ARC GAUGE (centred, larger for hero moment) ───
function ArcGauge({ animated }) {
  const r = 90, sw = 9, cx = 110, cy = 112;
  const startA = 180, endA = 360;
  const pol = (rad, a) => ({ x: cx + rad * Math.cos(a * Math.PI / 180), y: cy + rad * Math.sin(a * Math.PI / 180) });
  const s = pol(r, startA), e = pol(r, endA);
  const bgArc = `M ${s.x} ${s.y} A ${r} ${r} 0 0 1 ${e.x} ${e.y}`;
  const arcLen = Math.PI * r;
  const frac = animated ? SCORE / 100 : 0;
  const dashOffset = arcLen * (1 - frac);
  const sc = getScoreColor(SCORE);
  const sev = getSeverityBadge(SCORE);
  const dot = pol(r, startA + 180 * frac);

  const [num, setNum] = useState(0);
  const [dotVisible, setDotVisible] = useState(false);
  useEffect(() => {
    if (!animated) return;
    const start = Date.now();
    const tick = () => { const p = Math.min((Date.now() - start) / 1400, 1); setNum(Math.round((1 - Math.pow(1 - p, 3)) * SCORE)); if (p < 1) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
    const dt = setTimeout(() => setDotVisible(true), 1650);
    return () => clearTimeout(dt);
  }, [animated]);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <svg width={220} height={135} viewBox="0 0 220 135">
        <defs>
          <linearGradient id="ag" x1="0%" y1="50%" x2="100%" y2="50%">
            <stop offset="0%" stopColor={C.forest} /><stop offset="50%" stopColor={C.emerald} /><stop offset="100%" stopColor={C.mint} />
          </linearGradient>
          <filter id="gl"><feGaussianBlur stdDeviation="2.5" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        </defs>
        <path d={bgArc} fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth={sw} strokeLinecap="round" />
        <path d={bgArc} fill="none" stroke="url(#ag)" strokeWidth={sw} strokeLinecap="round"
          strokeDasharray={arcLen} strokeDashoffset={dashOffset}
          style={{ transition: "stroke-dashoffset 1.6s cubic-bezier(0.25,0.46,0.45,0.94)" }}
        />
        {dotVisible && frac > 0 && (
          <circle cx={dot.x} cy={dot.y} r={5} fill={sc} filter="url(#gl)" />
        )}
        <text x={cx} y={cy - 10} textAnchor="middle" style={{ fontSize: 48, fontWeight: 800, fill: sc, fontFamily: "'Unbounded',sans-serif", letterSpacing: "-2px" }}>
          {num}
        </text>
        <text x={cx} y={cy + 12} textAnchor="middle" style={{ fontSize: 10, fontWeight: 600, fill: C.textDim, letterSpacing: 2.5, textTransform: "uppercase", fontFamily: "'Space Grotesk',sans-serif" }}>
          UX Score
        </text>
      </svg>
      <div style={{
        marginTop: -2, padding: "4px 16px", borderRadius: 20,
        background: sev.bg, fontSize: 11, fontWeight: 600, color: sev.color,
        fontFamily: "'Space Grotesk',sans-serif", letterSpacing: 0.3,
      }}>{sev.label}</div>
    </div>
  );
}

// ─── FINDINGS ───
function Findings({ show }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {FINDINGS.map((f, i) => (
        <div key={i} style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "10px 14px", borderRadius: 8,
          background: "rgba(255,255,255,0.6)", border: "1px solid rgba(0,0,0,0.04)",
          opacity: show ? 1 : 0, transform: show ? "translateY(0)" : "translateY(8px)",
          transition: `opacity 0.3s ease ${0.3 + i * 0.15}s, transform 0.3s ease ${0.3 + i * 0.15}s`,
        }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: sevDot[f.severity], flexShrink: 0, boxShadow: `0 0 6px ${sevDot[f.severity]}44` }} />
          <span style={{ fontSize: 12.5, fontWeight: 500, color: C.navy, fontFamily: "'Space Grotesk',sans-serif" }}>{f.text}</span>
          <span style={{
            marginLeft: "auto", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5,
            color: sevDot[f.severity], fontFamily: "'Space Grotesk',sans-serif", flexShrink: 0,
          }}>{f.severity}</span>
        </div>
      ))}
    </div>
  );
}

// ─── CTA ───
function CTAButton({ show }) {
  const [hov, setHov] = useState(false);
  return (
    <div style={{ opacity: show ? 1 : 0, transform: show ? "translateY(0)" : "translateY(8px)", transition: "opacity 0.4s ease 0.9s, transform 0.4s ease 0.9s", textAlign: "center" }}>
      <button onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
        style={{
          padding: "14px 40px", borderRadius: 10, border: "none", cursor: "pointer",
          fontFamily: "'Unbounded',sans-serif", fontSize: 14, fontWeight: 660, color: "#fff",
          background: hov ? `linear-gradient(135deg, ${C.violet}, #7B7FFF)` : `linear-gradient(135deg, ${C.forest}, ${C.mint})`,
          boxShadow: hov ? "0 4px 20px rgba(91,97,244,0.35), 0 0 12px rgba(91,97,244,0.2)" : "0 3px 12px rgba(20,140,89,0.2)",
          transition: "all 0.3s ease", transform: hov ? "translateY(-1px)" : "none",
          display: "inline-flex", alignItems: "center", gap: 8,
        }}>
        Access Full Report
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M5 12h14m-7-7l7 7-7 7" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
    </div>
  );
}

// ─── NAV ───
function Nav() {
  return (
    <nav style={{ maxWidth: 1120, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 28px", position: "relative", zIndex: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
        <div style={{ width: 28, height: 28, borderRadius: 7, background: "linear-gradient(135deg,#186132,#14D571)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(20,140,89,0.2)" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M9 12l2 2 4-4" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /><circle cx="12" cy="12" r="10" stroke="#fff" strokeWidth="2" /></svg>
        </div>
        <span style={{ fontFamily: "'Unbounded',sans-serif", fontSize: 16, fontWeight: 700, color: "#0B1C48" }}>UXpact</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        {["Home", "Audits"].map(t => <span key={t} style={{ fontSize: 13, color: "#6B7280", fontWeight: 450, cursor: "pointer" }}>{t}</span>)}
        <span style={{ fontSize: 13, color: "#148C59", fontWeight: 600, cursor: "pointer" }}>New Audit</span>
      </div>
    </nav>
  );
}

// ─── MAIN ───
export default function ResultsPage() {
  const [phase, setPhase] = useState("loading");
  const [resultsAnimated, setResultsAnimated] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("burst"), 8000);
    const t2 = setTimeout(() => setPhase("results"), 8900);
    const t3 = setTimeout(() => setResultsAnimated(true), 9100);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  const showResults = phase === "results";

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Space Grotesk',sans-serif", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: -100, left: -60, width: 480, height: 480, background: "radial-gradient(circle, rgba(20,213,113,0.10) 0%, transparent 70%)", borderRadius: "50%", pointerEvents: "none" }} />
      <div style={{ position: "absolute", top: 300, right: -80, width: 380, height: 380, background: "radial-gradient(circle, rgba(91,97,244,0.06) 0%, transparent 70%)", borderRadius: "50%", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: -60, left: "30%", width: 400, height: 350, background: "radial-gradient(circle, rgba(20,140,89,0.06) 0%, transparent 70%)", borderRadius: "50%", pointerEvents: "none" }} />

      <link href="https://fonts.googleapis.com/css2?family=Unbounded:wght@400;500;600;700;800&family=Space+Grotesk:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      <Nav />

      <div style={{ maxWidth: 1060, margin: "0 auto", padding: "8px 28px 60px", position: "relative", zIndex: 10 }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontFamily: "'Unbounded',sans-serif", fontSize: 26, fontWeight: 700, color: "#0B1C48", letterSpacing: "-0.5px", margin: "0 0 6px" }}>
            {showResults ? "Your " : "Scanning "}
            <span style={{ background: "linear-gradient(90deg,#186132,#14D571)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              {showResults ? "UXpact" : "Your Site"}
            </span>
          </h1>
          <p style={{ fontSize: 14, color: "#6B7280", margin: 0, fontWeight: 400 }}>
            {showResults ? "Here's how your site performed across our analysis." : "We're deep-diving into your site right now."}
          </p>
        </div>

        <div style={{ ...glass, padding: "36px 32px", display: "flex", flexDirection: "column", alignItems: "center", gap: showResults ? 20 : 20 }}>
          {/* Pills */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
            <Pill text="yoursite.com" variant="green" />
            <Pill text="Signups" variant="green" />
            <Pill text="Demo requests" variant="violet" />
          </div>

          {/* LOADING / BURST */}
          {!showResults && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20, opacity: phase === "burst" ? 0 : 1, transition: "opacity 0.3s ease" }}>
              <div style={{ width: 320, height: 320 }}><NodeMap burst={phase === "burst"} /></div>
              <StatusMessage />
              <ProgressBar />
              <HangTight />
            </div>
          )}

          {/* RESULTS */}
          {showResults && (
            <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 20, opacity: 1, transition: "opacity 0.4s ease" }}>
              {/* Arc gauge — hero moment */}
              <ArcGauge animated={resultsAnimated} />

              {/* One-liner assessment */}
              <p style={{
                fontSize: 14, fontWeight: 500, color: C.navy, textAlign: "center",
                fontFamily: "'Space Grotesk',sans-serif", lineHeight: 1.5,
                maxWidth: 440, margin: 0,
                opacity: resultsAnimated ? 1 : 0, transform: resultsAnimated ? "translateY(0)" : "translateY(6px)",
                transition: "opacity 0.4s ease 0.2s, transform 0.4s ease 0.2s",
              }}>{ASSESSMENT}</p>

              {/* Revenue Leak Teaser */}
              <div style={{
                display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0, width: "100%", maxWidth: 420,
                borderRadius: 10, overflow: "hidden",
                border: "1px solid rgba(255,255,255,0.65)",
                background: "rgba(255,255,255,0.5)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
                boxShadow: "0 4px 16px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.7)",
                opacity: resultsAnimated ? 1 : 0, transform: resultsAnimated ? "translateY(0)" : "translateY(6px)",
                transition: "opacity 0.4s ease 0.35s, transform 0.4s ease 0.35s",
              }}>
                <div style={{ padding: "16px 18px", borderRight: "1px solid rgba(0,0,0,0.05)", textAlign: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, marginBottom: 3 }}>
                    <span style={{ fontSize: 18, lineHeight: 1 }}>🔻</span>
                    <span style={{ fontSize: 22, fontWeight: 800, color: C.forest, fontFamily: "'Unbounded',sans-serif" }}>~52%</span>
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 500, color: C.textMuted, fontFamily: "'Space Grotesk',sans-serif" }}>mobile drop-off</div>
                </div>
                <div style={{ padding: "16px 18px", textAlign: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, marginBottom: 3 }}>
                    <span style={{ fontSize: 16, lineHeight: 1 }}>⚠️</span>
                    <span style={{ fontSize: 22, fontWeight: 800, color: C.navy, fontFamily: "'Unbounded',sans-serif" }}>~£X,XXX/mo</span>
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 500, color: C.textMuted, fontFamily: "'Space Grotesk',sans-serif" }}>at risk</div>
                </div>
              </div>

              {/* Divider */}
              <div style={{ width: "100%", height: 1, background: "rgba(0,0,0,0.05)" }} />

              {/* Top findings */}
              <div style={{ width: "100%" }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.textDim, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 10, fontFamily: "'Space Grotesk',sans-serif" }}>
                  Top Findings
                </div>
                <Findings show={resultsAnimated} />
              </div>

              {/* CTA */}
              <CTAButton show={resultsAnimated} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
