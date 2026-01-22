console.log("BOOT-PROBE: main.tsx executed");

import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const rootEl = document.getElementById("root");
if (!rootEl) {
  console.error("BOOT-PROBE: #root element not found");
} else {
  createRoot(rootEl).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  console.log("BOOT-PROBE: React render called");
}
