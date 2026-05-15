import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App as KonstaApp } from "konsta/react";
import { registerSW } from "virtual:pwa-register";
import { App } from "./App";
import "./index.css";

registerSW({ immediate: true });

if ("serviceWorker" in navigator) {
  let pendingReload = false;

  const reloadIfHidden = (): boolean => {
    if (document.visibilityState === "hidden") {
      window.location.reload();
      return true;
    }
    return false;
  };

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (pendingReload) return;
    pendingReload = true;

    if (reloadIfHidden()) return;

    document.addEventListener("visibilitychange", () => {
      reloadIfHidden();
    });
  });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <KonstaApp theme="ios" className="max-w-[390px] mx-auto">
      <App />
    </KonstaApp>
  </StrictMode>
);
