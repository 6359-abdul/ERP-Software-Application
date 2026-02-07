import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { SchoolProvider } from "./contexts/SchoolContext";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <SchoolProvider>
    <App />
  </SchoolProvider>
); 
