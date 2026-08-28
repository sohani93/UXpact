import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { KEYFRAMES, color, font } from "./theme";

const styleTag = document.createElement("style");
styleTag.textContent = `
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; background: ${color.bg}; }
body { font-family: ${font.body}; color: ${color.navy}; -webkit-font-smoothing: antialiased; }
${KEYFRAMES}
`;
document.head.appendChild(styleTag);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
