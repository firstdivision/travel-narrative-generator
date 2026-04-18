import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./styles.css";

const appRoot = document.querySelector("#app");

if (!appRoot) {
  throw new Error("Could not find app root.");
}

createRoot(appRoot).render(<App />);
