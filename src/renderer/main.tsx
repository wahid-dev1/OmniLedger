import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { useAppStore } from "./stores/useAppStore";
import type { DatabaseConfig } from "@shared/types";

// Load database configuration from localStorage on app start
const loadDatabaseConfig = () => {
  try {
    const stored = localStorage.getItem("omniledger_db_config");
    if (stored) {
      const config = JSON.parse(stored) as DatabaseConfig;
      useAppStore.getState().setDatabaseConfig(config);
    }
  } catch (error) {
    console.error("Failed to load database configuration from localStorage:", error);
  }
};

// Initialize app
loadDatabaseConfig();

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element not found!");
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

