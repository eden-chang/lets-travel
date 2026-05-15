import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App as KonstaApp } from "konsta/react";
import { registerSW } from "virtual:pwa-register";
import { App } from "./App";
import "./index.css";

registerSW({ immediate: true });

if ("serviceWorker" in navigator) {
  let reloading = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (reloading) return;
    reloading = true;
    window.location.reload();
  });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <KonstaApp theme="ios" className="max-w-[390px] mx-auto">
      <App />
    </KonstaApp>
  </StrictMode>
);
