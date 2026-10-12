import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";

// The standalone glass-cube landing page lives in public/home.html.
// Keep the existing clearinghouse and Hashed terminal untouched at /app.
if (window.location.pathname === "/" || window.location.pathname === "/index.html") {
  window.location.replace("/home.html");
} else {
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}
