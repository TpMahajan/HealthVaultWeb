const DEFAULT_APP_TIMEZONE = "Asia/Kolkata";
const APP_TIMEZONE_KEY = "app_timezone";

const safeParseJson = (raw) => {
  if (!raw || typeof raw !== "string") return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const isValidTimeZone = (candidate) => {
  const value = String(candidate || "").trim();
  if (!value) return false;
  try {
    new Intl.DateTimeFormat(undefined, { timeZone: value });
    return true;
  } catch {
    return false;
  }
};

export const normalizeAppTimeZone = (candidate) => {
  const value = String(candidate || "").trim();
  return isValidTimeZone(value) ? value : DEFAULT_APP_TIMEZONE;
};

const extractKnownTimeZone = () => {
  if (typeof window === "undefined") return DEFAULT_APP_TIMEZONE;

  const direct = window.localStorage.getItem(APP_TIMEZONE_KEY);
  if (isValidTimeZone(direct)) return String(direct).trim();

  const doctorPrefs = safeParseJson(window.localStorage.getItem("doctorPreferences"));
  if (isValidTimeZone(doctorPrefs?.timezone)) return doctorPrefs.timezone;

  const userData = safeParseJson(window.localStorage.getItem("user"));
  if (isValidTimeZone(userData?.preferences?.timezone)) {
    return userData.preferences.timezone;
  }

  return DEFAULT_APP_TIMEZONE;
};

export const getSelectedTimeZone = () => normalizeAppTimeZone(extractKnownTimeZone());

export const setSelectedTimeZone = (candidate) => {
  if (typeof window === "undefined") return normalizeAppTimeZone(candidate);

  const nextTimeZone = normalizeAppTimeZone(candidate);
  window.localStorage.setItem(APP_TIMEZONE_KEY, nextTimeZone);

  const doctorPrefs = safeParseJson(window.localStorage.getItem("doctorPreferences"));
  if (doctorPrefs && typeof doctorPrefs === "object") {
    doctorPrefs.timezone = nextTimeZone;
    window.localStorage.setItem("doctorPreferences", JSON.stringify(doctorPrefs));
  }

  const userData = safeParseJson(window.localStorage.getItem("user"));
  if (userData && typeof userData === "object") {
    if (userData.preferences && typeof userData.preferences === "object") {
      userData.preferences.timezone = nextTimeZone;
      window.localStorage.setItem("user", JSON.stringify(userData));
    }
  }

  window.dispatchEvent(
    new CustomEvent("app-timezone-changed", {
      detail: { timeZone: nextTimeZone },
    })
  );

  return nextTimeZone;
};

export const formatDateTimeInSelectedTimeZone = (
  value,
  {
    locale,
    fallback = "-",
    ...intlOptions
  } = {}
) => {
  if (!value) return fallback;

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;

  const resolvedOptions = { ...intlOptions };
  if (!resolvedOptions.timeZone) {
    resolvedOptions.timeZone = getSelectedTimeZone();
  }

  return date.toLocaleString(locale, resolvedOptions);
};

export const formatDateInSelectedTimeZone = (
  value,
  {
    locale,
    fallback = "-",
    ...intlOptions
  } = {}
) => {
  if (!value) return fallback;

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;

  const resolvedOptions = { ...intlOptions };
  if (!resolvedOptions.timeZone) {
    resolvedOptions.timeZone = getSelectedTimeZone();
  }

  return date.toLocaleDateString(locale, resolvedOptions);
};

export const formatTimeInSelectedTimeZone = (
  value,
  {
    locale,
    fallback = "-",
    ...intlOptions
  } = {}
) => {
  if (!value) return fallback;

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;

  const resolvedOptions = { ...intlOptions };
  if (!resolvedOptions.timeZone) {
    resolvedOptions.timeZone = getSelectedTimeZone();
  }

  return date.toLocaleTimeString(locale, resolvedOptions);
};

const formatDatePartsForTimeZone = (value, timeZone) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  if (!year || !month || !day) return null;

  return { year, month, day };
};

export const formatDateInputValueInSelectedTimeZone = (
  value,
  {
    fallback = "",
    timeZone,
  } = {}
) => {
  if (!value) return fallback;
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    return value.trim();
  }
  const resolvedTimeZone = normalizeAppTimeZone(timeZone || getSelectedTimeZone());
  const parts = formatDatePartsForTimeZone(value, resolvedTimeZone);
  if (!parts) return fallback;
  return `${parts.year}-${parts.month}-${parts.day}`;
};

export const getCurrentDateInSelectedTimeZone = () =>
  formatDateInputValueInSelectedTimeZone(new Date());

const maybeAttachTimeZone = (options) => {
  if (options == null) {
    return { timeZone: getSelectedTimeZone() };
  }

  if (typeof options !== "object") {
    return options;
  }

  if (options.timeZone) {
    return options;
  }

  return { ...options, timeZone: getSelectedTimeZone() };
};

export const installDateLocaleTimezoneOverride = () => {
  if (typeof window === "undefined" || typeof Date === "undefined") return;
  if (window.__medicalVaultTimezonePatchInstalled) return;

  const originalToLocaleString = Date.prototype.toLocaleString;
  const originalToLocaleDateString = Date.prototype.toLocaleDateString;
  const originalToLocaleTimeString = Date.prototype.toLocaleTimeString;

  Date.prototype.toLocaleString = function patchedToLocaleString(locales, options) {
    return originalToLocaleString.call(this, locales, maybeAttachTimeZone(options));
  };

  Date.prototype.toLocaleDateString = function patchedToLocaleDateString(locales, options) {
    return originalToLocaleDateString.call(this, locales, maybeAttachTimeZone(options));
  };

  Date.prototype.toLocaleTimeString = function patchedToLocaleTimeString(locales, options) {
    return originalToLocaleTimeString.call(this, locales, maybeAttachTimeZone(options));
  };

  window.__medicalVaultTimezonePatchInstalled = true;
};

export { APP_TIMEZONE_KEY, DEFAULT_APP_TIMEZONE };
