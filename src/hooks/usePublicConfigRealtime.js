import { useEffect, useRef } from "react";
import { API_BASE } from "../constants/api";

const RECONNECT_DELAY_MS = 4000;
const MAX_RECONNECT_DELAY_MS = 60000;
const RECONNECT_BACKOFF_MULTIPLIER = 1.8;
const COOLDOWN_AFTER_FAILURES = 8;

const toList = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    return value
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
  }
  return [];
};

const toUpperSet = (value) =>
  new Set(
    toList(value)
      .map((entry) => entry.toUpperCase())
      .filter(Boolean)
  );

const matchesTarget = (eventSet, targetValue) => {
  if (!targetValue) return true;
  if (!eventSet || eventSet.size === 0) return true;
  return eventSet.has(String(targetValue).toUpperCase());
};

const buildSocketUrl = ({ platform, surface }) => {
  const wsBase = API_BASE.replace(/^http/, "ws");
  const url = new URL(`${wsBase}/public/ws`);
  if (platform) url.searchParams.set("platform", String(platform).toUpperCase());
  if (surface) url.searchParams.set("surface", String(surface).toUpperCase());
  return url.toString();
};

const getReconnectDelay = (attempt) => {
  if (attempt <= 1) return RECONNECT_DELAY_MS;
  const exponentialDelay =
    RECONNECT_DELAY_MS *
    Math.pow(RECONNECT_BACKOFF_MULTIPLIER, Math.max(0, attempt - 1));
  return Math.min(Math.round(exponentialDelay), MAX_RECONNECT_DELAY_MS);
};

export const usePublicConfigRealtime = ({
  platform = "WEB",
  surface = "",
  enabled = true,
  onEvent,
}) => {
  const onEventRef = useRef(onEvent);
  const reconnectTimerRef = useRef(null);
  const reconnectAttemptRef = useRef(0);

  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    if (!enabled) return undefined;
    let socket = null;
    let closedByUser = false;

    const scheduleReconnect = () => {
      if (closedByUser) return;
      const nextAttempt = reconnectAttemptRef.current + 1;
      reconnectAttemptRef.current = nextAttempt;
      const inCooldownWindow = nextAttempt >= COOLDOWN_AFTER_FAILURES;
      const delay = inCooldownWindow
        ? MAX_RECONNECT_DELAY_MS
        : getReconnectDelay(nextAttempt);
      if (inCooldownWindow) {
        reconnectAttemptRef.current = 0;
      }
      reconnectTimerRef.current = window.setTimeout(connect, delay);
    };

    const connect = () => {
      if (closedByUser) return;
      try {
        socket = new WebSocket(buildSocketUrl({ platform, surface }));
      } catch {
        scheduleReconnect();
        return;
      }
      socket.onopen = () => {
        reconnectAttemptRef.current = 0;
      };

      socket.onmessage = (event) => {
        let payload = null;
        try {
          payload = JSON.parse(event.data);
        } catch {
          return;
        }
        if (!payload || typeof payload !== "object") return;
        const type = String(payload.type || "").toLowerCase();
        if (!type || type === "connected" || type === "heartbeat") return;

        const eventPlatforms = toUpperSet(payload.platforms || payload.platform);
        const eventSurfaces = toUpperSet(payload.surfaces || payload.surface);
        const platformMatch = matchesTarget(eventPlatforms, platform);
        const surfaceMatch = matchesTarget(eventSurfaces, surface);
        if (!platformMatch || !surfaceMatch) return;

        onEventRef.current?.(payload);
      };

      socket.onerror = () => {
        try {
          socket?.close();
        } catch {
          // Ignore close errors.
        }
      };

      socket.onclose = () => {
        if (closedByUser) return;
        scheduleReconnect();
      };
    };

    connect();

    return () => {
      closedByUser = true;
      if (reconnectTimerRef.current) {
        window.clearTimeout(reconnectTimerRef.current);
      }
      if (
        socket &&
        socket.readyState === WebSocket.OPEN
      ) {
        socket.close();
      }
    };
  }, [enabled, platform, surface]);
};

