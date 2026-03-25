const SENSITIVE_KEYS = new Set([
  "token",
  "adminToken",
  "superadmin_token",
  "refreshToken",
  "user",
  "role",
  "superadmin_user",
]);

const memoryFallback = new Map();

let installed = false;

const canUseSessionStorage = () => {
  try {
    return typeof window !== "undefined" && !!window.sessionStorage;
  } catch {
    return false;
  }
};

const readSecure = (key) => {
  if (!SENSITIVE_KEYS.has(key)) return null;

  if (canUseSessionStorage()) {
    try {
      const value = window.sessionStorage.getItem(key);
      if (value != null) return value;
    } catch {
      // Ignore and fallback to memory map
    }
  }

  return memoryFallback.has(key) ? memoryFallback.get(key) : null;
};

const writeSecure = (key, value) => {
  if (!SENSITIVE_KEYS.has(key)) return;

  if (canUseSessionStorage()) {
    try {
      window.sessionStorage.setItem(key, String(value));
    } catch {
      memoryFallback.set(key, String(value));
    }
    return;
  }

  memoryFallback.set(key, String(value));
};

const removeSecure = (key) => {
  if (!SENSITIVE_KEYS.has(key)) return;
  if (canUseSessionStorage()) {
    try {
      window.sessionStorage.removeItem(key);
    } catch {
      // noop
    }
  }
  memoryFallback.delete(key);
};

const migrateLegacyLocalStorageValues = (localStorageRef) => {
  if (!localStorageRef) return;
  for (const key of SENSITIVE_KEYS) {
    try {
      const value = localStorageRef.getItem(key);
      if (value != null && value !== "") {
        writeSecure(key, value);
        localStorageRef.removeItem(key);
      }
    } catch {
      // noop
    }
  }
};

export const installSecureAuthStorage = () => {
  if (installed || typeof window === "undefined" || !window.localStorage) return;

  const localStorageRef = window.localStorage;
  const originalGetItem = localStorageRef.getItem.bind(localStorageRef);
  const originalSetItem = localStorageRef.setItem.bind(localStorageRef);
  const originalRemoveItem = localStorageRef.removeItem.bind(localStorageRef);

  migrateLegacyLocalStorageValues(localStorageRef);

  localStorageRef.getItem = (key) => {
    if (SENSITIVE_KEYS.has(String(key))) {
      const secureValue = readSecure(String(key));
      return secureValue == null ? null : secureValue;
    }
    return originalGetItem(key);
  };

  localStorageRef.setItem = (key, value) => {
    if (SENSITIVE_KEYS.has(String(key))) {
      writeSecure(String(key), value);
      try {
        originalRemoveItem(String(key));
      } catch {
        // noop
      }
      return;
    }
    return originalSetItem(key, value);
  };

  localStorageRef.removeItem = (key) => {
    if (SENSITIVE_KEYS.has(String(key))) {
      removeSecure(String(key));
      try {
        originalRemoveItem(String(key));
      } catch {
        // noop
      }
      return;
    }
    return originalRemoveItem(key);
  };

  installed = true;
};

export const getSecureItem = (key) => {
  if (typeof window === "undefined" || !window.localStorage) return null;
  return window.localStorage.getItem(key);
};

export const setSecureItem = (key, value) => {
  if (typeof window === "undefined" || !window.localStorage) return;
  if (value == null) {
    window.localStorage.removeItem(key);
    return;
  }
  window.localStorage.setItem(key, String(value));
};

export const removeSecureItem = (key) => {
  if (typeof window === "undefined" || !window.localStorage) return;
  window.localStorage.removeItem(key);
};

export const clearSecureAuthSession = () => {
  for (const key of SENSITIVE_KEYS) {
    removeSecure(key);
    try {
      window.localStorage?.removeItem(key);
    } catch {
      // noop
    }
  }
};

export const getPrimaryAuthToken = () =>
  getSecureItem("token") || getSecureItem("adminToken") || getSecureItem("superadmin_token") || "";
