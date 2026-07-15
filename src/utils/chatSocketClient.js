import { API_BASE } from "../constants/api";
import { getSecureItem } from "./secureAuthStorage";

/**
 * Raw WebSocket client for the doctor-patient chat realtime channel
 * (typing indicators + a "new message" push hint). Mirrors the protocol
 * already implemented on the Flutter side
 * (MedicalVault/lib/services/chat_socket_service.dart) against the same
 * backend endpoint (Backend-MedicalVault/services/chatPresenceRealtime.js)
 * — this is not a new backend feature, just the previously-missing web
 * client for an endpoint that already exists and already works for the
 * Flutter app.
 *
 * Reconnects with exponential backoff so a dropped connection (network
 * blip, laptop sleep, backend restart) recovers automatically instead of
 * silently degrading to poll-only forever.
 */
const wsBaseFromApiBase = () => {
  const httpBase = API_BASE.replace(/\/api\/?$/, "");
  return httpBase.replace(/^http:/i, "ws:").replace(/^https:/i, "wss:");
};

const RECONNECT_DELAYS_MS = [1000, 2000, 4000, 8000, 15000];

export class ChatSocketClient {
  constructor({ onEvent }) {
    this.onEvent = onEvent;
    this.ws = null;
    this.reconnectAttempt = 0;
    this.reconnectTimer = null;
    this.manuallyClosed = false;
  }

  connect() {
    this.manuallyClosed = false;
    this._openSocket();
  }

  _openSocket() {
    const token = getSecureItem("token");
    if (!token) return;

    const wsBase = wsBaseFromApiBase();
    const url = `${wsBase}/api/sessions/chat/ws?token=${encodeURIComponent(token)}`;

    let socket;
    try {
      socket = new WebSocket(url);
    } catch {
      this._scheduleReconnect();
      return;
    }
    this.ws = socket;

    socket.onopen = () => {
      this.reconnectAttempt = 0;
    };

    socket.onmessage = (event) => {
      let data;
      try {
        data = JSON.parse(event.data);
      } catch {
        return;
      }
      if (this.onEvent) this.onEvent(data);
    };

    socket.onclose = () => {
      if (this.ws === socket) this.ws = null;
      if (!this.manuallyClosed) this._scheduleReconnect();
    };

    socket.onerror = () => {
      // onclose fires right after onerror for WebSocket; reconnection is
      // handled there to avoid double-scheduling.
    };
  }

  _scheduleReconnect() {
    if (this.manuallyClosed) return;
    if (this.reconnectTimer) return;
    const delay =
      RECONNECT_DELAYS_MS[
        Math.min(this.reconnectAttempt, RECONNECT_DELAYS_MS.length - 1)
      ];
    this.reconnectAttempt += 1;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this._openSocket();
    }, delay);
  }

  _send(payload) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    try {
      this.ws.send(JSON.stringify(payload));
    } catch {
      // Best-effort — typing signals are not queued/retried.
    }
  }

  sendTyping(counterpartId) {
    this._send({ type: "typing", counterpartId });
  }

  sendTypingStop(counterpartId) {
    this._send({ type: "typing_stop", counterpartId });
  }

  dispose() {
    this.manuallyClosed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        // Ignore close errors.
      }
      this.ws = null;
    }
  }
}
