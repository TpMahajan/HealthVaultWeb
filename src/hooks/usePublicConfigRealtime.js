import { useEffect, useRef } from "react";
import { API_BASE } from "../constants/api";

const RECONNECT_DELAY_MS = 4000;

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

export const usePublicConfigRealtime = ({
  platform = "WEB",
  surface = "",
  enabled = true,
  onEvent,
}) => {
  const onEventRef = useRef(onEvent);
  const reconnectTimerRef = useRef(null);

  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    if (!enabled) return undefined;
    let socket = null;
    let closedByUser = false;

    const connect = () => {
      if (closedByUser) return;
      socket = new WebSocket(buildSocketUrl({ platform, surface }));

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
        reconnectTimerRef.current = window.setTimeout(
          connect,
          RECONNECT_DELAY_MS
        );
      };
    };

    connect();

    return () => {
      closedByUser = true;
      if (reconnectTimerRef.current) {
        window.clearTimeout(reconnectTimerRef.current);
      }
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    };
  }, [enabled, platform, surface]);
};

