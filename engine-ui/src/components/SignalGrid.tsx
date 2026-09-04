import { useEffect, useRef } from "react";

// Full-bleed ambient background for the audit-processing wait screen: a
// sparse grid of small square dots spread across the entire canvas, with
// a scattered subset randomly lighting up and fading — like a signal
// moving through the field, not one fixed shape. Mint (#14D571) is the
// primary lit color, blue-violet (#5B61F4) mixed in for variation, both
// against the dark canvas. Canvas-based (not one DOM node per dot) since
// a full-viewport grid can be several hundred cells.
const MINT = "20, 213, 113";
const VIOLET = "91, 97, 244";
const SPACING = 30;
const DOT_SIZE = 2.5;
const BASE_ALPHA = 0.05;
const MAX_ACTIVE = 46;
const SPAWN_MS = 90;
const PULSE_MIN_MS = 900;
const PULSE_MAX_MS = 2200;

type Pulse = { col: number; row: number; color: string; start: number; duration: number };

export default function SignalGrid() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let cols = 0;
    let rows = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.ceil(width / SPACING);
      rows = Math.ceil(height / SPACING);
    };
    resize();
    window.addEventListener("resize", resize);

    const active: Pulse[] = [];
    let raf = 0;
    let lastSpawn = 0;
    const occupied = new Set<string>();

    const spawn = (now: number) => {
      if (active.length >= MAX_ACTIVE || cols === 0 || rows === 0) return;
      for (let attempt = 0; attempt < 6; attempt++) {
        const col = Math.floor(Math.random() * cols);
        const row = Math.floor(Math.random() * rows);
        const key = `${col}:${row}`;
        if (occupied.has(key)) continue;
        occupied.add(key);
        active.push({
          col,
          row,
          color: Math.random() < 0.68 ? MINT : VIOLET,
          start: now,
          duration: PULSE_MIN_MS + Math.random() * (PULSE_MAX_MS - PULSE_MIN_MS),
        });
        break;
      }
    };

    const tick = (now: number) => {
      ctx.clearRect(0, 0, width, height);

      // Faint static base grid — the field the signal moves through.
      ctx.fillStyle = `rgba(255,255,255,${BASE_ALPHA})`;
      for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
          ctx.fillRect(c * SPACING, r * SPACING, DOT_SIZE, DOT_SIZE);
        }
      }

      if (now - lastSpawn > SPAWN_MS) {
        spawn(now);
        lastSpawn = now;
      }

      for (let i = active.length - 1; i >= 0; i--) {
        const p = active[i];
        const t = (now - p.start) / p.duration;
        if (t >= 1) {
          occupied.delete(`${p.col}:${p.row}`);
          active.splice(i, 1);
          continue;
        }
        // Ease in, hold briefly, ease out — a soft pulse rather than a blink.
        const alpha = t < 0.35 ? t / 0.35 : t > 0.7 ? (1 - t) / 0.3 : 1;
        const glow = Math.max(alpha, 0);
        ctx.fillStyle = `rgba(${p.color}, ${0.15 + glow * 0.85})`;
        ctx.shadowColor = `rgba(${p.color}, ${glow * 0.6})`;
        ctx.shadowBlur = 6 * glow;
        ctx.fillRect(p.col * SPACING, p.row * SPACING, DOT_SIZE, DOT_SIZE);
        ctx.shadowBlur = 0;
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} style={{ position: "fixed", inset: 0, width: "100%", height: "100%", zIndex: 0 }} />;
}
