import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { registerServiceWorker } from "./firebase";
import { API_BASE } from "./constants/api";
import { installSecureAuthStorage } from "./utils/secureAuthStorage";
import { installSecureNetworkDefaults } from "./utils/secureNetworkDefaults";
import {
  installDateLocaleTimezoneOverride,
  getSelectedTimeZone,
  setSelectedTimeZone,
} from "./utils/timezone";

installSecureAuthStorage();
installSecureNetworkDefaults({ apiBase: API_BASE });
setSelectedTimeZone(getSelectedTimeZone());
installDateLocaleTimezoneOverride();
registerServiceWorker();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
