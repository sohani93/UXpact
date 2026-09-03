// Matches the mockup's .brand-corner exactly: logo + name, fixed top-left.
// The mockup has no top nav links ("Home / Audits / New Audit") anywhere —
// that was invented in an earlier pass and never existed in the reference.
export default function Nav() {
  return (
    <div style={{ position: "fixed", top: 18, left: 22, display: "flex", alignItems: "center", gap: 8, zIndex: 30 }}>
      <div style={{ width: 24, height: 24, borderRadius: 6, background: "linear-gradient(135deg,#1F8C4C,#14D571)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M9 12l2 2 4-4" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="12" r="9.5" stroke="#fff" strokeWidth="2"/></svg>
      </div>
      <span style={{ fontFamily: "'Unbounded',sans-serif", fontWeight: 680, fontSize: 14, color: "#fff" }}>UXpact</span>
    </div>
  );
}
