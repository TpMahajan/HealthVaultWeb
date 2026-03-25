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

let fetchInstalled = false;

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

    const headers = normalizeHeaders(options.headers);
    const authValue = String(headers.get("Authorization") || "");
    if (authValue === "Bearer null" || authValue === "Bearer undefined" || authValue === "Bearer ") {
      headers.delete("Authorization");
    }
    options.headers = headers;

    return originalFetch(input, options);
  };

  fetchInstalled = true;
};
