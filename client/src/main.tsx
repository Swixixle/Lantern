import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

console.log("MAIN.TSX EXECUTED");

const rootEl = document.getElementById("root");
if (!rootEl) {
  document.body.innerHTML = "<div style='color:red;padding:40px'>ERROR: #root element not found</div>";
} else {
  createRoot(rootEl).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
