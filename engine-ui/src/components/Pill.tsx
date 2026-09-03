type PillProps = {
  text: string;
  v?: "green" | "violet" | "white";
};

export default function Pill({ text, v }: PillProps) {
  const s =
    v === "green"
      ? { background: "#14D571", color: "#06210F" }
      : v === "violet"
        ? { background: "rgba(123,127,255,0.14)", color: "#7B7FFF" }
        : { background: "rgba(255,255,255,0.08)", color: "#B7B2CC" };
  return (
    <div style={{ ...s, padding: "5px 14px", borderRadius: 6, fontSize: 12.5, fontWeight: v ? 600 : 450, whiteSpace: "nowrap", fontFamily: "'Space Grotesk',sans-serif" }}>
      {text}
    </div>
  );
}
