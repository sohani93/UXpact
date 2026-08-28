// ─── UXPACT DESIGN SYSTEM ───
// Single source of truth for color, type, and surface treatments. Brand
// guideline: Unbounded for headings (660-700 weight), Space Grotesk for
// body (400-500 weight). Forest Green -> Mint gradient is the primary
// brand mark. Navy for text, Blue-Violet as the one accent for
// interactive/premium moments. Never red, yellow, or purple decoratively.

export const color = {
  bg: "#F9F9F9",
  surface: "#F5F5F5",
  forest: "#186132",
  mint: "#14D571",
  navy: "#0B1C48",
  violet: "#5B61F4",
  muted: "#6B7280",
  dim: "#9CA3AF",
  border: "rgba(11,28,72,0.08)",
  danger: "#B3261E", // reserved for genuine error states only, never decorative
} as const;

export const gradient = {
  brand: "linear-gradient(135deg, #186132 0%, #14D571 100%)",
  brandSoft: "linear-gradient(160deg, rgba(20,213,113,0.10) 0%, rgba(255,255,255,0.5) 100%)",
  violetSoft: "linear-gradient(160deg, rgba(91,97,244,0.10) 0%, rgba(255,255,255,0.5) 100%)",
  text: "linear-gradient(90deg, #186132, #14D571)",
} as const;

export const font = {
  display: "'Unbounded', sans-serif",
  body: "'Space Grotesk', sans-serif",
} as const;

// Frosted glass — the recurring surface treatment for every card in the
// workspace. Kept as one definition so every panel reads as one system.
export const glass = {
  background: "rgba(255,255,255,0.6)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  border: "1px solid rgba(255,255,255,0.7)",
  boxShadow: "0 8px 32px rgba(11,28,72,0.06), inset 0 1px 0 rgba(255,255,255,0.8)",
} as const;

export const radius = { sm: 8, md: 12, lg: 16, xl: 22, pill: 999 } as const;

export const GOOGLE_FONTS_HREF =
  "https://fonts.googleapis.com/css2?family=Unbounded:wght@400;600;660;700;800&family=Space+Grotesk:wght@400;500;600;700&display=swap";

export const KEYFRAMES = `
@keyframes upIn { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes pulseDot { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(0.82); } }
@keyframes spin { to { transform: rotate(360deg); } }
@keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
.reveal { opacity: 0; }
.reveal.in-view { animation: upIn 0.6s cubic-bezier(0.16,1,0.3,1) both; }
*:focus-visible { outline: 2px solid ${color.violet}; outline-offset: 2px; }
`;
