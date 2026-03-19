import { useState, useEffect, useRef } from "react";

const C = {
  bg: "#EEF1F5",
  white: "#FFFFFF",
  forest: "#186132",
  emerald: "#148C59",
  mint: "#14D571",
  violet: "#5B61F4",
  navy: "#0B1C48",
  textMuted: "#6B7280",
  textDim: "#9CA3AF",
  border: "rgba(0,0,0,0.07)",
};

const STATUS_MESSAGES = [
  "Mapping conversion pathways...",
  "Scanning above-the-fold signals...",
  "Cross-referencing industry benchmarks...",
  "Measuring cognitive load patterns...",
  "Evaluating persuasion architecture...",
  "Detecting friction points...",
  "Parsing trust signal density...",
  "Analysing content-to-intent alignment...",
  "Profiling visual hierarchy depth...",
  "Decoding call-to-action strength...",
];

// ─── Glass card style — same as form ───
const glass = {
  background: "rgba(255,255,255,0.5)",
  backdropFilter: "blur(24px)",
  WebkitBackdropFilter: "blur(24px)",
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.65)",
  boxShadow: "0 4px 20px rgba(0,0,0,0.03), 0 1px 3px rgba(0,0,0,0.02), inset 0 1px 0 rgba(255,255,255,0.7)",
};

function NodeMap() {
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
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    ctx.scale(dpr, dpr);

    if (!nodesRef.current) {
      const nodes = [];
      const cx = W / 2, cy = H / 2;
      const rng = (seed) => ((Math.sin(seed * 127.1 + 311.7) * 43758.5453) % 1 + 1) % 1;
      nodes.push({ x: cx, y: cy, r: 5, layer: 0, colorType: "forest" });
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
        nodes.push({ x: cx + Math.cos(a) * 52, y: cy + Math.sin(a) * 52, r: 3.5, layer: 1, colorType: rng(i) > 0.5 ? "violet" : "green" });
      }
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + 0.2;
        nodes.push({ x: cx + Math.cos(a) * 95, y: cy + Math.sin(a) * 95, r: 2.5, layer: 2, colorType: rng(i + 10) > 0.45 ? "violet" : "green" });
      }
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2 + 0.1;
        nodes.push({ x: cx + Math.cos(a) * 138, y: cy + Math.sin(a) * 138, r: 2, layer: 3, colorType: rng(i + 20) > 0.5 ? "violet" : "green" });
      }
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
      const waveR = ((t * 40) % 210);
      connections.forEach(([a, b]) => {
        const na = nodes[a], nb = nodes[b];
        const midDist = (Math.hypot(na.x - W/2, na.y - H/2) + Math.hypot(nb.x - W/2, nb.y - H/2)) / 2;
        const activated = midDist < waveR;
        const isV = nb.colorType === "violet";
        ctx.beginPath(); ctx.moveTo(na.x, na.y); ctx.lineTo(nb.x, nb.y);
        ctx.strokeStyle = activated
          ? (isV ? `rgba(91,97,244,${0.18+Math.sin(t*2+a)*0.08})` : `rgba(20,213,113,${0.18+Math.sin(t*2+a)*0.08})`)
          : (isV ? "rgba(91,97,244,0.05)" : "rgba(20,140,89,0.05)");
        ctx.lineWidth = activated ? 1 : 0.5; ctx.stroke();
        if (activated) {
          const pulseT = (t * 0.8 + a * 0.3) % 1;
          const px = na.x + (nb.x - na.x) * pulseT, py = na.y + (nb.y - na.y) * pulseT;
          ctx.beginPath(); ctx.arc(px, py, 1.2, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(20,213,113,${0.5*(1-Math.abs(pulseT-0.5)*2)})`; ctx.fill();
        }
      });
      nodes.forEach((n) => {
        const dist = Math.hypot(n.x - W/2, n.y - H/2);
        const activated = dist < waveR;
        const intensity = activated ? Math.min(1, (waveR - dist) / 40) : 0;
        ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        if (n.colorType === "forest") ctx.fillStyle = C.forest;
        else if (n.colorType === "violet") ctx.fillStyle = activated ? `rgba(91,97,244,${0.3+intensity*0.7})` : "rgba(91,97,244,0.12)";
        else ctx.fillStyle = activated ? `rgba(20,213,113,${0.3+intensity*0.7})` : "rgba(20,140,89,0.12)";
        ctx.fill();
      });
      animRef.current = requestAnimationFrame(draw);
    }
    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, []);
  return <canvas ref={canvasRef} style={{ display: "block", margin: "0 auto" }} />;
}

function StatusMessage() {
  const [idx, setIdx] = useState(0);
  const [opacity, setOpacity] = useState(1);
  useEffect(() => {
    const interval = setInterval(() => {
      setOpacity(0);
      setTimeout(() => { setIdx(prev => (prev + 1) % STATUS_MESSAGES.length); setOpacity(1); }, 300);
    }, 1800);
    return () => clearInterval(interval);
  }, []);
  return (
    <div style={{ fontSize: 12.5, fontWeight: 500, color: C.emerald, fontFamily: "'Space Grotesk', sans-serif", opacity, transition: "opacity 0.3s ease", minHeight: 18, textAlign: "center" }}>
      {STATUS_MESSAGES[idx]}
    </div>
  );
}

function ProgressBar() {
  const barRef = useRef(null);
  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    const start = Date.now();
    const duration = 12000;
    let raf;
    const tick = () => {
      const elapsed = Date.now() - start;
      const p = Math.min(elapsed / duration, 1);
      bar.style.width = (1 - Math.pow(1 - p, 2.5)) * 100 + "%";
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <div style={{ width: "100%", maxWidth: 260, height: 3, borderRadius: 2, background: "rgba(0,0,0,0.06)", overflow: "hidden", margin: "0 auto" }}>
      <div ref={barRef} style={{ height: "100%", borderRadius: 2, width: "0%", background: `linear-gradient(90deg, ${C.forest}, ${C.mint})`, boxShadow: "0 0 6px rgba(20,213,113,0.25)" }} />
    </div>
  );
}

function HangTight() {
  const [show, setShow] = useState(false);
  useEffect(() => { const t = setTimeout(() => setShow(true), 6000); return () => clearTimeout(t); }, []);
  return (
    <div style={{ fontSize: 11, color: C.textDim, fontFamily: "'Space Grotesk', sans-serif", opacity: show ? 1 : 0, transition: "opacity 0.8s ease", marginTop: 4, textAlign: "center" }}>
      Hang tight — almost there
    </div>
  );
}

/*
  Pills — EXACT copy from UXpact_Engine_Input_v8.jsx lines 111-119:
  padding: "5px 14px", borderRadius: 6
  Unselected: background "rgba(255,255,255,0.85)", color "#6B7280", fontWeight 450, border "none"
  Selected green: background "#D1FAE5", color "#0B1C48", fontWeight 600
  Selected violet: background "#E0E7FF", color "#0B1C48", fontWeight 600
  fontSize: 12.5
*/
function Pill({ text, variant }) {
  const base = {
    padding: "5px 14px", borderRadius: 6, border: "none",
    fontSize: 12.5, whiteSpace: "nowrap", cursor: "default",
    fontFamily: "'Space Grotesk', sans-serif",
  };
  if (variant === "green") return <div style={{ ...base, background: "#D1FAE5", color: "#0B1C48", fontWeight: 600, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>{text}</div>;
  if (variant === "violet") return <div style={{ ...base, background: "#E0E7FF", color: "#0B1C48", fontWeight: 600, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>{text}</div>;
  return <div style={{ ...base, background: "rgba(255,255,255,0.85)", color: "#6B7280", fontWeight: 450, boxShadow: "0 1px 2px rgba(0,0,0,0.03)" }}>{text}</div>;
}

export default function LoadingPage() {
  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Space Grotesk', sans-serif", position: "relative", overflow: "hidden" }}>
      {/* Background blobs — same as form page */}
      <div style={{ position: "absolute", top: -100, left: -60, width: 480, height: 480, background: "radial-gradient(circle, rgba(20,213,113,0.10) 0%, transparent 70%)", borderRadius: "50%", pointerEvents: "none" }} />
      <div style={{ position: "absolute", top: 300, right: -80, width: 380, height: 380, background: "radial-gradient(circle, rgba(91,97,244,0.06) 0%, transparent 70%)", borderRadius: "50%", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: -60, left: "30%", width: 400, height: 350, background: "radial-gradient(circle, rgba(20,140,89,0.06) 0%, transparent 70%)", borderRadius: "50%", pointerEvents: "none" }} />

      <link href="https://fonts.googleapis.com/css2?family=Unbounded:wght@400;500;600;700;800&family=Space+Grotesk:wght@300;400;500;600;700&display=swap" rel="stylesheet" />

      {/* Nav — exact copy from form */}
      <nav style={{ maxWidth: 1120, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 28px", position: "relative", zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: "linear-gradient(135deg, #186132, #14D571)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(20,140,89,0.2)" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M9 12l2 2 4-4" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /><circle cx="12" cy="12" r="10" stroke="#fff" strokeWidth="2" /></svg>
          </div>
          <span style={{ fontFamily: "'Unbounded', sans-serif", fontSize: 16, fontWeight: 700, color: "#0B1C48" }}>UXpact</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          {["Home", "Audits"].map((t) => (<span key={t} style={{ fontSize: 13, color: "#6B7280", fontWeight: 450, cursor: "pointer" }}>{t}</span>))}
          <span style={{ fontSize: 13, color: "#148C59", fontWeight: 600, cursor: "pointer" }}>New Audit</span>
        </div>
      </nav>

      {/* Content — same maxWidth and padding as form page */}
      <div style={{ maxWidth: 1060, margin: "0 auto", padding: "8px 28px 60px", position: "relative", zIndex: 10 }}>
        {/* Page header — same position as form */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontFamily: "'Unbounded', sans-serif", fontSize: 26, fontWeight: 700, color: "#0B1C48", letterSpacing: "-0.5px", margin: "0 0 6px" }}>
            Scanning{" "}
            <span style={{ background: "linear-gradient(90deg, #186132, #14D571)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Your Site</span>
          </h1>
          <p style={{ fontSize: 14, color: "#6B7280", margin: 0, fontWeight: 400 }}>
            We're deep-diving into your site right now.
          </p>
        </div>

        {/* Loading card — fills full width (no sidebar, no grid split) */}
        <div style={{
          ...glass,
          padding: "36px 32px",
          display: "flex", flexDirection: "column",
          alignItems: "center", gap: 20,
        }}>
          {/* Context pills — selected values only, no container */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
            <Pill text="yoursite.com" variant="green" />
            <Pill text="Signups" variant="green" />
            <Pill text="Demo requests" variant="violet" />
          </div>

          {/* Node Map */}
          <div style={{ width: 320, height: 320 }}>
            <NodeMap />
          </div>

          <StatusMessage />
          <ProgressBar />
          <HangTight />
        </div>
      </div>
    </div>
  );
}
