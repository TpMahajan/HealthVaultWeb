import { getSecureItem } from "./secureAuthStorage";

const REQUEST_TIMEOUT_MS = 15000;
const GET_RETRY_COUNT = 2;
const RETRYABLE_STATUS = new Set([408, 429, 500, 502, 503, 504]);
const AUTH_FAILURE_STATUS = new Set([401, 403]);

const isApiRequest = (inputUrl, apiBase) => {
  if (!inputUrl || !apiBase) return false;
  try {
    const base = new URL(apiBase, window.location.origin);
    const target = new URL(inputUrl, window.location.origin);
    return target.origin === base.origin && target.pathname.startsWith(base.pathname);
  } catch {
    return false;
  }
};

const normalizeHeaders = (headers) => {
  if (!headers) return new Headers();
  return headers instanceof Headers ? new Headers(headers) : new Headers(headers);
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isAbortError = (error) =>
  error?.name === "AbortError" ||
  String(error?.message || "").toLowerCase().includes("aborted");

let fetchInstalled = false;

const notifyDoctorAuthFailure = (requestUrl, status) => {
  if (typeof window === "undefined") return;

  const currentRole = String(localStorage.getItem("role") || "").trim().toLowerCase();
  const token = getSecureItem("token");
  if (currentRole !== "doctor" || !token) return;

  const pathname = window.location?.pathname || "";
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password")
  ) {
    return;
  }

  console.warn(
    `[secureNetworkDefaults] Doctor auth failure detected (status=${status}) for ${requestUrl}. Session preserved; waiting for explicit logout.`
  );
  try {
    window.dispatchEvent(
      new CustomEvent("doctor-auth-failure", {
        detail: { requestUrl, status, timestamp: Date.now() },
      })
    );
  } catch {
    // Ignore event dispatch failures.
  }
};

export const installSecureNetworkDefaults = ({ apiBase }) => {
  if (fetchInstalled || typeof window === "undefined" || typeof window.fetch !== "function") {
    return;
  }

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input, init = {}) => {
    const requestUrl =
      typeof input === "string"
        ? input
        : input instanceof URL
        ? input.toString()
        : input?.url || "";

    const options = { ...init };
    const shouldHarden = isApiRequest(requestUrl, apiBase);

    if (shouldHarden && !options.credentials) {
      options.credentials = "include";
    }

    const headerSource = options.headers || (input instanceof Request ? input.headers : undefined);
    const headers = normalizeHeaders(headerSource);
    const authValue = String(headers.get("Authorization") || "");
    if (authValue === "Bearer null" || authValue === "Bearer undefined" || authValue === "Bearer ") {
      headers.delete("Authorization");
    }

    const currentRole = String(localStorage.getItem("role") || "").trim().toLowerCase();
    const token = getSecureItem("token");
    if (shouldHarden && currentRole === "doctor" && token && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    const methodFromRequest = input instanceof Request ? input.method : undefined;
    const method = String(options.method || methodFromRequest || "GET").toUpperCase();
    const retryableMethod = method === "GET" || method === "HEAD";
    const maxRetries = shouldHarden && retryableMethod ? GET_RETRY_COUNT : 0;

    let attempt = 0;
    while (true) {
      const requestOptions = { ...options, headers: new Headers(headers) };
      const callerSignal = requestOptions.signal;
      const hasAbortController = typeof AbortController !== "undefined";
      const controller = hasAbortController ? new AbortController() : null;
      let timeoutId = null;
      let cleanupAbortRelay = null;

      if (controller) {
        if (callerSignal) {
          if (callerSignal.aborted) controller.abort();
          else {
            const relayAbort = () => controller.abort();
            callerSignal.addEventListener("abort", relayAbort, { once: true });
            cleanupAbortRelay = () => callerSignal.removeEventListener("abort", relayAbort);
          }
        }
        requestOptions.signal = controller.signal;
        if (shouldHarden && REQUEST_TIMEOUT_MS > 0) {
          timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
        }
      }

      try {
        const response = await originalFetch(input, requestOptions);

        if (shouldHarden && AUTH_FAILURE_STATUS.has(response.status)) {
          console.warn(
            `[secureNetworkDefaults] Received ${response.status} for ${method} ${requestUrl}.`
          );
          notifyDoctorAuthFailure(requestUrl, response.status);
          return response;
        }

        const canRetryByStatus =
          shouldHarden &&
          retryableMethod &&
          attempt < maxRetries &&
          RETRYABLE_STATUS.has(response.status);

        if (canRetryByStatus) {
          attempt += 1;
          console.warn(
            `[secureNetworkDefaults] Retry ${attempt}/${maxRetries} for ${method} ${requestUrl} (status ${response.status}).`
          );
          await wait(250 * attempt);
          continue;
        }

        return response;
      } catch (error) {
        const callerAborted = Boolean(callerSignal?.aborted);
        const timeoutLikeAbort = isAbortError(error) && !callerAborted;
        const networkLikeError = error instanceof TypeError || timeoutLikeAbort;

        const canRetryByError =
          shouldHarden &&
          retryableMethod &&
          attempt < maxRetries &&
          networkLikeError;

        if (canRetryByError) {
          attempt += 1;
          console.warn(
            `[secureNetworkDefaults] Retry ${attempt}/${maxRetries} for ${method} ${requestUrl} after ${timeoutLikeAbort ? "timeout" : "network"} error: ${error?.message || "unknown error"}`
          );
          await wait(250 * attempt);
          continue;
        }

        if (timeoutLikeAbort) {
          const timeoutError = new Error(`Request timeout after ${REQUEST_TIMEOUT_MS}ms`);
          timeoutError.name = "TimeoutError";
          throw timeoutError;
        }

        throw error;
      } finally {
        if (timeoutId) window.clearTimeout(timeoutId);
        if (cleanupAbortRelay) cleanupAbortRelay();
      }
    }
  };

  fetchInstalled = true;
};
