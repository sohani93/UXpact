type NavProps = {
  onNew?: () => void;
  rightLabel?: string;
};

export default function Nav({ onNew, rightLabel = "New Audit" }: NavProps) {
  return (
    <nav style={{ maxWidth: 1120, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 28px", position: "relative", zIndex: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
        <div style={{ width: 28, height: 28, borderRadius: 7, background: "linear-gradient(135deg,#186132,#14D571)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(20,140,89,0.2)" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M9 12l2 2 4-4" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="12" r="10" stroke="#fff" strokeWidth="2"/></svg>
        </div>
        <span style={{ fontFamily: "'Unbounded',sans-serif", fontSize: 16, fontWeight: 700, color: "#0B1C48" }}>UXpact</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        {["Home", "Audits"].map(t => <span key={t} style={{ fontSize: 13, color: "#6B7280", fontWeight: 450, cursor: "pointer" }}>{t}</span>)}
        {rightLabel && <span onClick={onNew} style={{ fontSize: 13, color: "#148C59", fontWeight: 600, cursor: "pointer" }}>{rightLabel}</span>}
      </div>
    </nav>
  );
}
