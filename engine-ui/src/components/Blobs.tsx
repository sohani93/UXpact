// Dark-canvas glow blobs, matching the approved mockup's body radial-gradient
// composition (mint/violet/forest glows on near-black), not the old light-
// theme's faint pastel circles.
export default function Blobs() {
  return (
    <>
      <div style={{ position: "fixed", top: -100, left: -60, width: 900, height: 640, background: "radial-gradient(ellipse 900px 640px at 10% -8%, rgba(123,127,255,0.22), transparent 60%)", pointerEvents: "none", zIndex: 0 }} />
      <div style={{ position: "fixed", top: 100, right: -80, width: 700, height: 520, background: "radial-gradient(ellipse 700px 520px at 105% 22%, rgba(20,213,113,0.10), transparent 55%)", pointerEvents: "none", zIndex: 0 }} />
      <div style={{ position: "fixed", bottom: -200, left: "30%", width: 1000, height: 760, background: "radial-gradient(ellipse 1000px 760px at 45% 115%, rgba(74,63,191,0.28), transparent 62%)", pointerEvents: "none", zIndex: 0 }} />
    </>
  );
}
