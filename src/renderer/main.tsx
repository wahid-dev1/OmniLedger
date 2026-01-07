import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { useAppStore } from "./stores/useAppStore";
import type { DatabaseConfig } from "@shared/types";

// Log that the script is executing
console.log("Renderer script loaded");

// Load database configuration from localStorage on app start
const loadDatabaseConfig = () => {
  try {
    console.log("Loading database configuration from localStorage...");
    const stored = localStorage.getItem("omniledger_db_config");
    if (stored) {
      const config = JSON.parse(stored) as DatabaseConfig;
      useAppStore.getState().setDatabaseConfig(config);
      console.log("Database configuration loaded successfully");
    } else {
      console.log("No database configuration found in localStorage");
    }
  } catch (error) {
    console.error("Failed to load database configuration from localStorage:", error);
  }
};

// Initialize app
try {
  console.log("Initializing app...");
  loadDatabaseConfig();
  
  const rootElement = document.getElementById("root");
  if (!rootElement) {
    throw new Error("Root element not found!");
  }
  
  console.log("Root element found, creating React root...");
  const root = ReactDOM.createRoot(rootElement);
  
  console.log("Rendering App component...");
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  console.log("App rendered successfully");
} catch (error) {
  console.error("Fatal error during app initialization:", error);
  // Display error on screen
  const rootElement = document.getElementById("root");
  if (rootElement) {
    rootElement.innerHTML = `
      <div style="padding: 20px; font-family: sans-serif;">
        <h1>Application Error</h1>
        <p>Failed to initialize the application:</p>
        <pre style="background: #f5f5f5; padding: 10px; border-radius: 4px; overflow: auto;">${error instanceof Error ? error.stack : String(error)}</pre>
        <p>Please check the console for more details.</p>
      </div>
    `;
  }
}

