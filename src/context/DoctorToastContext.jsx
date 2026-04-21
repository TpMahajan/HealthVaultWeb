import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { AlertCircle, AlertTriangle, CheckCircle, Info, X } from "lucide-react";
import { useAuth } from "./AuthContext";

const DEFAULT_DURATION = 2500;
const MAX_TOASTS = 4;

const DoctorToastContext = createContext({
  showDoctorToast: () => null,
  dismissDoctorToast: () => {},
  clearDoctorToasts: () => {},
});

const VARIANT_META = {
  success: {
    icon: CheckCircle,
    accentClass: "border-primary",
    progressClass: "bg-primary",
    iconClass: "text-primary",
    iconWrapClass: "bg-primary/10 dark:bg-primary/20",
  },
  error: {
    icon: AlertCircle,
    accentClass: "border-rose-500",
    progressClass: "bg-rose-500",
    iconClass: "text-rose-600 dark:text-rose-400",
    iconWrapClass: "bg-rose-50 dark:bg-rose-500/20",
  },
  warning: {
    icon: AlertTriangle,
    accentClass: "border-amber-500",
    progressClass: "bg-amber-500",
    iconClass: "text-amber-600 dark:text-amber-400",
    iconWrapClass: "bg-amber-50 dark:bg-amber-500/20",
  },
  info: {
    icon: Info,
    accentClass: "border-sky-500",
    progressClass: "bg-sky-500",
    iconClass: "text-sky-600 dark:text-sky-400",
    iconWrapClass: "bg-sky-50 dark:bg-sky-500/20",
  },
};

const normalizeType = (value) => {
  const raw = String(value || "").trim().toLowerCase();
  if (raw === "success" || raw === "error" || raw === "warning" || raw === "info") {
    return raw;
  }
  return "success";
};

const normalizePayload = (input, type, title, duration) => {
  if (typeof input === "string") {
    return {
      message: input,
      type: normalizeType(type),
      title: String(title || "").trim(),
      duration: Number.isFinite(Number(duration)) ? Number(duration) : DEFAULT_DURATION,
    };
  }

  const payload = input && typeof input === "object" ? input : {};
  return {
    message: String(payload.message || "").trim(),
    type: normalizeType(payload.type || type),
    title: String(payload.title || title || "").trim(),
    duration: Number.isFinite(Number(payload.duration))
      ? Number(payload.duration)
      : Number.isFinite(Number(duration))
        ? Number(duration)
        : DEFAULT_DURATION,
  };
};

const DoctorToastViewport = ({ toasts, onDismiss }) => {
  if (typeof document === "undefined") return null;

  return createPortal(
    <>
      <style>
        {`
          @keyframes doctor-toast-progress {
            from { width: 100%; }
            to { width: 0%; }
          }
        `}
      </style>
      <div className="fixed top-[12px] right-4 sm:right-[32px] z-[9999] flex flex-col gap-2">
        {toasts.map((toast) => {
          const meta = VARIANT_META[toast.type] || VARIANT_META.success;
          const Icon = meta.icon;

          return (
            <div
              key={toast.id}
              className={`relative flex flex-col w-[calc(100vw-2rem)] max-w-[260px] bg-white/90 dark:bg-[#1a1a1a]/90 backdrop-blur-md rounded-xl shadow-lg border-l-[3px] overflow-hidden transition-all animate-in fade-in slide-in-from-right-4 duration-300 ${meta.accentClass}`}
            >
              <div className="flex items-center px-3.5 py-2.5 space-x-3">
                <div className={`shrink-0 h-5 w-5 rounded-full flex items-center justify-center ${meta.iconWrapClass}`}>
                  <Icon className={`h-3.5 w-3.5 ${meta.iconClass}`} />
                </div>

                <p className="flex-1 text-[12px] font-bold text-gray-800 dark:text-white leading-none truncate">
                  {toast.message}
                </p>

                <button
                  type="button"
                  onClick={() => onDismiss(toast.id)}
                  className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>

              <div className="h-[2px] w-full bg-black/5 dark:bg-white/5">
                <div
                  className={`h-full ${meta.progressClass}`}
                  style={{
                    animation: `doctor-toast-progress ${toast.duration}ms linear forwards`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </>,
    document.body
  );
};

export const DoctorToastProvider = ({ children }) => {
  const { user } = useAuth();
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef(new Map());

  const storedRole = typeof window !== "undefined" ? window.localStorage.getItem("role") : "";
  const currentRole = String(user?.role || storedRole || "").toLowerCase();
  const isDoctor = currentRole === "doctor";

  const dismissDoctorToast = useCallback((id) => {
    if (!id) return;
    setToasts((prev) => prev.filter((item) => item.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const clearDoctorToasts = useCallback(() => {
    setToasts([]);
    timersRef.current.forEach((timer) => clearTimeout(timer));
    timersRef.current.clear();
  }, []);

  const showDoctorToast = useCallback(
    (input, type = "success", title = "", duration) => {
      if (!isDoctor) return null;
      const payload = normalizePayload(input, type, title, duration);
      if (!payload.message) return null;

      const id = `doctor-toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const toast = {
        id,
        message: payload.message,
        title: payload.title,
        type: payload.type,
        duration: Math.max(1200, payload.duration),
      };

      setToasts((prev) => [...prev, toast].slice(-MAX_TOASTS));

      const timer = setTimeout(() => {
        dismissDoctorToast(id);
      }, toast.duration);
      timersRef.current.set(id, timer);
      return id;
    },
    [dismissDoctorToast, isDoctor]
  );

  useEffect(() => {
    if (isDoctor) return;
    clearDoctorToasts();
  }, [clearDoctorToasts, isDoctor]);

  useEffect(
    () => () => {
      timersRef.current.forEach((timer) => clearTimeout(timer));
      timersRef.current.clear();
    },
    []
  );

  const value = useMemo(
    () => ({
      showDoctorToast,
      dismissDoctorToast,
      clearDoctorToasts,
    }),
    [showDoctorToast, dismissDoctorToast, clearDoctorToasts]
  );

  return (
    <DoctorToastContext.Provider value={value}>
      {children}
      {isDoctor ? <DoctorToastViewport toasts={toasts} onDismiss={dismissDoctorToast} /> : null}
    </DoctorToastContext.Provider>
  );
};

export const useDoctorToast = () => useContext(DoctorToastContext);

