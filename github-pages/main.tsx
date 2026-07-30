import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import Page from "../app/page";
import "../app/globals.css";
import "./standalone.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Veil of Secrets could not find its application root.");
}

createRoot(root).render(
  <StrictMode>
    <Page />
  </StrictMode>,
);
