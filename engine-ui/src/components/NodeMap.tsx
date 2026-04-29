import { useEffect, useRef } from "react";

const C = { forest: "#186132", mint: "#14D571" };

export default function NodeMap({ burst = false }: { burst?: boolean }) {
  const cvs = useRef<HTMLCanvasElement | null>(null);
  const raf = useRef<number | null>(null);
  const t0 = useRef(Date.now());
  const ns = useRef<{ n: any[]; cn: number[][] } | null>(null);

  useEffect(() => {
    const c = cvs.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1, W = 320, H = 320;
    c.width = W * dpr; c.height = H * dpr;
    c.style.width = W + "px"; c.style.height = H + "px";
    ctx.scale(dpr, dpr);
    if (!ns.current) {
      const n: any[] = [], cx = W / 2, cy = H / 2;
      const rng = (s: number) => ((Math.sin(s * 127.1 + 311.7) * 43758.5453) % 1 + 1) % 1;
      n.push({ x: cx, y: cy, r: 5, c: "forest" });
      for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2 - Math.PI / 2; n.push({ x: cx + Math.cos(a) * 52, y: cy + Math.sin(a) * 52, r: 3.5, c: rng(i) > 0.5 ? "violet" : "green" }); }
      for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + 0.2; n.push({ x: cx + Math.cos(a) * 95, y: cy + Math.sin(a) * 95, r: 2.5, c: rng(i + 10) > 0.45 ? "violet" : "green" }); }
      for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2 + 0.1; n.push({ x: cx + Math.cos(a) * 138, y: cy + Math.sin(a) * 138, r: 2, c: rng(i + 20) > 0.5 ? "violet" : "green" }); }
      const cn: number[][] = [];
      for (let i = 1; i <= 5; i++) cn.push([0, i]);
      for (let i = 1; i <= 5; i++) { cn.push([i, 6 + (i % 8)]); cn.push([i, 6 + ((i + 1) % 8)]); }
      for (let i = 6; i <= 13; i++) { cn.push([i, 14 + ((i - 6) % 10)]); cn.push([i, 14 + ((i - 5) % 10)]); }
      for (let i = 6; i < 13; i++) cn.push([i, i + 1]);
      ns.current = { n, cn };
    }
    const { n, cn } = ns.current;
    function draw() {
      if (!ctx) return;
      const t = (Date.now() - t0.current) / 1000;
      ctx.clearRect(0, 0, W, H);
      const wR = burst ? 999 : ((t * 40) % 210);
      cn.forEach(([a, b]) => {
        const na = n[a], nb = n[b], md = (Math.hypot(na.x - W / 2, na.y - H / 2) + Math.hypot(nb.x - W / 2, nb.y - H / 2)) / 2;
        const act = md < wR, isV = nb.c === "violet";
        ctx.beginPath(); ctx.moveTo(na.x, na.y); ctx.lineTo(nb.x, nb.y);
        const ba = burst ? 0.5 : (0.18 + Math.sin(t * 2 + a) * 0.08);
        ctx.strokeStyle = act ? (isV ? `rgba(91,97,244,${ba})` : `rgba(20,213,113,${ba})`) : (isV ? "rgba(91,97,244,0.05)" : "rgba(20,140,89,0.05)");
        ctx.lineWidth = act ? (burst ? 1.5 : 1) : 0.5; ctx.stroke();
        if (act && !burst) { const pt = (t * 0.8 + a * 0.3) % 1; ctx.beginPath(); ctx.arc(na.x + (nb.x - na.x) * pt, na.y + (nb.y - na.y) * pt, 1.2, 0, Math.PI * 2); ctx.fillStyle = `rgba(20,213,113,${0.5 * (1 - Math.abs(pt - 0.5) * 2)})`; ctx.fill(); }
      });
      n.forEach((nd: any) => {
        const d = Math.hypot(nd.x - W / 2, nd.y - H / 2), act = d < wR, int = act ? Math.min(1, (wR - d) / 40) : 0;
        ctx.beginPath(); ctx.arc(nd.x, nd.y, burst ? nd.r * 1.3 : nd.r, 0, Math.PI * 2);
        if (nd.c === "forest") ctx.fillStyle = C.forest;
        else if (burst) ctx.fillStyle = nd.c === "violet" ? "rgba(91,97,244,0.9)" : "rgba(20,213,113,0.9)";
        else if (nd.c === "violet") ctx.fillStyle = act ? `rgba(91,97,244,${0.3 + int * 0.7})` : "rgba(91,97,244,0.12)";
        else ctx.fillStyle = act ? `rgba(20,213,113,${0.3 + int * 0.7})` : "rgba(20,140,89,0.12)";
        ctx.fill();
      });
      raf.current = requestAnimationFrame(draw);
    }
    draw();
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [burst]);

  return <canvas ref={cvs} style={{ display: "block", margin: "0 auto" }} />;
}
