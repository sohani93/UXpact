type PillProps = {
  text: string;
  v?: "green" | "violet" | "white";
};

export default function Pill({ text, v }: PillProps) {
  const s =
    v === "green"
      ? { background: "#D1FAE5", color: "#0B1C48" }
      : v === "violet"
        ? { background: "#E0E7FF", color: "#0B1C48" }
        : { background: "rgba(255,255,255,0.85)", color: "#6B7280" };
  return (
    <div style={{ ...s, padding: "5px 14px", borderRadius: 6, fontSize: 12.5, fontWeight: v ? 600 : 450, whiteSpace: "nowrap", fontFamily: "'Space Grotesk',sans-serif", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
      {text}
    </div>
  );
}
