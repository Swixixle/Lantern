document.body.style.background = "#111";
document.body.insertAdjacentHTML("afterbegin", "<div id='boot-probe' style='color:lime;padding:16px;font-family:monospace;font-size:18px'>BOOT-PROBE: main.tsx executed</div>");

import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

console.log("MAIN.TSX EXECUTED");

const rootEl = document.getElementById("root");
if (!rootEl) {
  document.body.insertAdjacentHTML("beforeend", "<div style='color:red;padding:40px'>ERROR: #root element not found</div>");
} else {
  createRoot(rootEl).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
