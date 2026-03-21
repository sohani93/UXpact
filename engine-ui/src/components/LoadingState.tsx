// @ts-nocheck
import { useState, useEffect, useRef } from "react";

const C = { bg: "#EEF1F5", forest: "#186132", emerald: "#148C59", mint: "#14D571", textMuted: "#6B7280", textDim: "#9CA3AF" };
const glass = { background: "rgba(255,255,255,0.5)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", borderRadius: 14, border: "1px solid rgba(255,255,255,0.65)", boxShadow: "0 4px 20px rgba(0,0,0,0.03), 0 1px 3px rgba(0,0,0,0.02), inset 0 1px 0 rgba(255,255,255,0.7)" };
const STATUS_MESSAGES = ["Mapping conversion pathways...","Scanning above-the-fold signals...","Cross-referencing industry benchmarks...","Measuring cognitive load patterns...","Evaluating persuasion architecture..."];

function Pill({ text, variant }) { const base = { padding: "5px 14px", borderRadius: 6, border: "none", fontSize: 12.5, whiteSpace: "nowrap", cursor: "default", fontFamily: "'Space Grotesk', sans-serif" }; return <div style={{ ...base, background: variant === "violet" ? "#E0E7FF" : "#D1FAE5", color: "#0B1C48", fontWeight: 600, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>{text}</div>; }
function NodeMap() { const canvasRef = useRef(null); useEffect(() => { const c = canvasRef.current; if (!c) return; const ctx = c.getContext("2d"); const W=320,H=320; c.width=W;c.height=H; let raf; const draw=()=>{ctx.clearRect(0,0,W,H);ctx.beginPath();ctx.arc(160,160,100,0,Math.PI*2);ctx.fillStyle='rgba(20,213,113,0.14)';ctx.fill(); raf=requestAnimationFrame(draw)};draw(); return ()=>cancelAnimationFrame(raf);}, []); return <canvas ref={canvasRef} style={{ display: "block", margin: "0 auto", width:320, height:320 }} />; }
function StatusMessage() { const [idx,setIdx]=useState(0); useEffect(()=>{const i=setInterval(()=>setIdx((v)=>(v+1)%STATUS_MESSAGES.length),1800);return ()=>clearInterval(i)},[]); return <div style={{ fontSize:12.5,fontWeight:500,color:C.emerald,minHeight:18,textAlign:"center" }}>{STATUS_MESSAGES[idx]}</div>; }
function ProgressBar() { const barRef = useRef(null); useEffect(()=>{ const start=Date.now(); let raf; const t=()=>{const p=Math.min((Date.now()-start)/12000,1); barRef.current.style.width=`${(1-Math.pow(1-p,2.5))*100}%`; if(p<1) raf=requestAnimationFrame(t)}; t(); return ()=>cancelAnimationFrame(raf);},[]); return <div style={{ width:"100%", maxWidth:260, height:3, borderRadius:2, background:"rgba(0,0,0,0.06)", overflow:"hidden", margin:"0 auto" }}><div ref={barRef} style={{ height:"100%", borderRadius:2, width:"0%", background:`linear-gradient(90deg, ${C.forest}, ${C.mint})` }} /></div>; }

export default function LoadingState({ domain, focusAreas, goal }) {
  return <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Space Grotesk', sans-serif", position: "relative", overflow: "hidden" }}>
    <nav style={{ maxWidth: 1120, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 28px", position: "relative", zIndex: 10 }}><span style={{ fontFamily: "'Unbounded', sans-serif", fontSize: 16, fontWeight: 700, color: "#0B1C48" }}>UXpact</span></nav>
    <div style={{ maxWidth: 1060, margin: "0 auto", padding: "8px 28px 60px", position: "relative", zIndex: 10 }}><div style={{ marginBottom: 24 }}><h1 style={{ fontFamily: "'Unbounded', sans-serif", fontSize: 26, fontWeight: 700, color: "#0B1C48", letterSpacing: "-0.5px", margin: "0 0 6px" }}>Scanning <span style={{ background: "linear-gradient(90deg, #186132, #14D571)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Your Site</span></h1><p style={{ fontSize: 14, color: C.textMuted, margin: 0, fontWeight: 400 }}>We're deep-diving into your site right now.</p></div>
      <div style={{ ...glass, padding: "36px 32px", display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
          <Pill text={domain} variant="green" />
          {goal ? <Pill text={goal} variant="green" /> : null}
          {focusAreas.map((f, i) => <Pill key={f} text={f} variant={i % 2 ? "violet" : "green"} />)}
        </div>
        <div style={{ width: 320, height: 320 }}><NodeMap /></div>
        <StatusMessage /><ProgressBar />
        <div style={{ fontSize: 11, color: C.textDim, marginTop: 4, textAlign: "center" }}>Hang tight — almost there</div>
      </div></div></div>;
}
