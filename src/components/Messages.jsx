import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import {
  Loader2,
  MessageCircle,
  SendHorizontal,
  Search,
  Smile,
  Paperclip,
  CheckCheck,
  Clock,
  InboxIcon,
} from "lucide-react";
import { API_BASE } from "../constants/api";
import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../context/NotificationContext";
import { getSecureItem } from "../utils/secureAuthStorage";

/* ─────────────────────────────────────────────────────────────────────────
   Helpers  (zero logic changes)
───────────────────────────────────────────────────────────────────────── */
const fetchJson = async (url, options = {}) => {
  const token = getSecureItem("token");
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data?.success === false) {
    throw new Error(data?.message || `Request failed with status ${response.status}`);
  }
  return data;
};

const formatMessageTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const formatThreadTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "now";
  if (diffMins < 60) return `${diffMins}m`;
  const diffH = Math.floor(diffMins / 60);
  if (diffH < 24) return `${diffH}h`;
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
};

const resolvePatientProfileImage = (patient) => {
  const rawProfileImage = String(patient?.profileImage || "").trim();
  if (!rawProfileImage) return null;
  if (/^(https?:)?\/\//i.test(rawProfileImage) || rawProfileImage.startsWith("data:")) {
    return rawProfileImage;
  }
  if (rawProfileImage.startsWith("/uploads/")) return `http://localhost:5000${rawProfileImage}`;
  if (rawProfileImage.startsWith("uploads/")) return `http://localhost:5000/${rawProfileImage}`;
  if (rawProfileImage.startsWith("/")) return `http://localhost:5000${rawProfileImage}`;
  return `http://localhost:5000/uploads/${rawProfileImage}`;
};

const normalizePatientThreadEntry = (patient) => {
  const counterpartId = String(patient?.id || patient?._id || "").trim();
  if (!counterpartId) return null;

  const profileImage =
    patient?.profilePictureUrl ||
    patient?.profilePicture ||
    patient?.profileImage ||
    null;

  return {
    counterpartId,
    counterpartRole: "patient",
    counterpartName: String(patient?.name || "Patient").trim() || "Patient",
    counterpartEmail: String(patient?.email || "").trim(),
    counterpartMobile: String(patient?.mobile || patient?.phone || "").trim(),
    counterpartAvatar: profileImage,
    lastMessage: "",
    lastSenderRole: "",
    lastAt: null,
    unreadCount: 0,
    patient: { profileImage },
    isPlaceholderThread: true,
  };
};

/* ─────────────────────────────────────────────────────────────────────────
   Reusable Avatar
───────────────────────────────────────────────────────────────────────── */
const Avatar = ({ src, name, size = "md", accentStyle }) => {
  const sizes = { sm: "h-7 w-7 text-[10px]", md: "h-9 w-9 text-xs", lg: "h-10 w-10 text-sm" };
  const initials = (name || "?")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      className={`${sizes[size]} shrink-0 rounded-full overflow-hidden flex items-center justify-center font-bold text-white`}
      style={accentStyle || { background: "linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)" }}
    >
      {src ? (
        <>
          <img
            src={src}
            alt={name || "User"}
            className="h-full w-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = "none";
              const fallback = e.currentTarget.nextElementSibling;
              if (fallback) fallback.style.display = "flex";
            }}
          />
          <span className="h-full w-full items-center justify-center" style={{ display: "none" }}>
            {initials}
          </span>
        </>
      ) : (
        <span className="h-full w-full flex items-center justify-center">{initials}</span>
      )}
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────
   Component
───────────────────────────────────────────────────────────────────────── */
const Messages = () => {
  /* ── all state & refs are UNCHANGED ── */
  const { user } = useAuth();
  const { notifications } = useNotifications();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const counterpartFromQuery = (searchParams.get("counterpart") || "").trim();

  const currentRole = useMemo(
    () => String(user?.role || localStorage.getItem("role") || "").trim().toLowerCase(),
    [user]
  );
  const isDoctor = currentRole === "doctor";
  const doctorAvatarStyle = useMemo(
    () => (isDoctor ? { background: "var(--primary-gradient)" } : undefined),
    [isDoctor]
  );

  const [threads, setThreads] = useState([]);
  const [allPatients, setAllPatients] = useState([]);
  const [selectedCounterpartId, setSelectedCounterpartId] = useState("");
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [loadingPatients, setLoadingPatients] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const listEndRef = useRef(null);
  const notificationCountRef = useRef(notifications.length);
  const mergedThreads = useMemo(() => {
    if (!isDoctor) return threads;

    const byId = new Map();
    for (const thread of threads) {
      const counterpartId = String(thread?.counterpartId || "").trim();
      if (!counterpartId) continue;
      byId.set(counterpartId, { ...thread, isPlaceholderThread: false });
    }

    for (const patient of allPatients) {
      const normalized = normalizePatientThreadEntry(patient);
      if (!normalized) continue;
      const existing = byId.get(normalized.counterpartId);
      if (!existing) {
        byId.set(normalized.counterpartId, normalized);
        continue;
      }
      byId.set(normalized.counterpartId, {
        ...normalized,
        ...existing,
        counterpartName: existing.counterpartName || normalized.counterpartName,
        counterpartEmail: existing.counterpartEmail || normalized.counterpartEmail,
        counterpartMobile: existing.counterpartMobile || normalized.counterpartMobile,
        counterpartAvatar: existing.counterpartAvatar || normalized.counterpartAvatar,
        patient: {
          ...(normalized.patient || {}),
          ...(existing.patient || {}),
          profileImage:
            existing?.patient?.profileImage ||
            existing?.counterpartAvatar ||
            normalized?.patient?.profileImage ||
            null,
        },
        isPlaceholderThread: false,
      });
    }

    return Array.from(byId.values()).sort((a, b) => {
      const aTime = a?.lastAt ? new Date(a.lastAt).getTime() : 0;
      const bTime = b?.lastAt ? new Date(b.lastAt).getTime() : 0;
      if (aTime !== bTime) return bTime - aTime;
      return String(a?.counterpartName || "").localeCompare(String(b?.counterpartName || ""));
    });
  }, [allPatients, isDoctor, threads]);

  const selectedThread = useMemo(
    () => mergedThreads.find((e) => e.counterpartId === selectedCounterpartId) || null,
    [mergedThreads, selectedCounterpartId]
  );
  const selectedPatient = useMemo(
    () => ({
      name: selectedThread?.counterpartName || "",
      profileImage:
        selectedThread?.patient?.profileImage ??
        selectedThread?.profileImage ??
        selectedThread?.counterpartProfileImage ??
        selectedThread?.counterpartAvatar ??
        null,
    }),
    [selectedThread]
  );
  const selectedPatientProfileImage = useMemo(
    () => resolvePatientProfileImage(selectedPatient),
    [selectedPatient]
  );

  /* ── data loading UNCHANGED ── */
  const loadThreads = useCallback(async ({ initialLoad = false } = {}) => {
    try {
      // Only show the spinner on the very first load (no existing threads)
      if (initialLoad) setLoadingThreads(true);
      setError("");
      const data = await fetchJson(`${API_BASE}/sessions/chat/threads`);
      const nextThreads = Array.isArray(data?.threads) ? data.threads : [];
      setThreads(nextThreads);
    } catch (err) {
      setError(err.message || "Failed to load conversations");
    } finally {
      if (initialLoad) setLoadingThreads(false);
    }
  }, []);

  const loadAllPatients = useCallback(async ({ initialLoad = false } = {}) => {
    if (!isDoctor) {
      setAllPatients([]);
      setLoadingPatients(false);
      return;
    }
    try {
      if (initialLoad) setLoadingPatients(true);
      const data = await fetchJson(`${API_BASE}/doctors/patients`);
      const nextPatients = Array.isArray(data?.patients) ? data.patients : [];
      setAllPatients(nextPatients);
    } catch (err) {
      console.error("Failed to load doctor patients for chat list:", err);
      setAllPatients([]);
    } finally {
      if (initialLoad) setLoadingPatients(false);
    }
  }, [isDoctor]);

  const loadMessages = useCallback(async (counterpartId, { silent = false } = {}) => {
    if (!counterpartId) { setMessages([]); return; }
    try {
      if (!silent) setLoadingMessages(true);
      const data = await fetchJson(
        `${API_BASE}/sessions/chat/messages/${encodeURIComponent(counterpartId)}?limit=300`
      );
      setMessages(Array.isArray(data?.messages) ? data.messages : []);
    } catch (err) {
      if (!silent) setError(err.message || "Failed to load messages");
    } finally {
      if (!silent) setLoadingMessages(false);
    }
  }, []);

  // Initial load only — passes initialLoad flag to show spinner
  useEffect(() => {
    loadThreads({ initialLoad: true });
    loadAllPatients({ initialLoad: true });
  }, [loadAllPatients, loadThreads, location.key]);

  useEffect(() => {
    if (counterpartFromQuery) {
      const exists = mergedThreads.some((e) => e.counterpartId === counterpartFromQuery);
      if (exists && selectedCounterpartId !== counterpartFromQuery) {
        setSelectedCounterpartId(counterpartFromQuery);
        return;
      }
    }

    if (!selectedCounterpartId && mergedThreads.length > 0) {
      setSelectedCounterpartId(mergedThreads[0].counterpartId);
      return;
    }

    if (
      selectedCounterpartId &&
      !mergedThreads.some((e) => e.counterpartId === selectedCounterpartId)
    ) {
      setSelectedCounterpartId(mergedThreads[0]?.counterpartId || "");
    }
  }, [counterpartFromQuery, mergedThreads, selectedCounterpartId]);

  useEffect(() => {
    if (!selectedCounterpartId) { setMessages([]); return; }
    setMessages([]);
    loadMessages(selectedCounterpartId);
  }, [loadMessages, selectedCounterpartId]);

  useEffect(() => {
    if (!selectedCounterpartId) return undefined;
    const timer = window.setInterval(() => {
      // Silent poll — never shows spinner, never causes list flicker
      loadMessages(selectedCounterpartId, { silent: true });
      loadThreads(); // no initialLoad flag = silent
    }, 4000);
    return () => window.clearInterval(timer);
  }, [loadMessages, loadThreads, selectedCounterpartId]);

  useEffect(() => {
    if (notifications.length === notificationCountRef.current) return;
    notificationCountRef.current = notifications.length;
    const hasDM = notifications.some((n) =>
      String(n?.data?.type || n?.type || "").toLowerCase() === "direct_message"
    );
    if (!hasDM) return;
    loadThreads(); // silent — no initialLoad flag
    if (selectedCounterpartId) loadMessages(selectedCounterpartId, { silent: true });
  }, [loadMessages, loadThreads, notifications, selectedCounterpartId]);

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  /* ── send UNCHANGED ── */
  const handleSend = async () => {
    if (!selectedThread || !draft.trim() || sending) return;
    const text = draft.trim();
    const temporaryId = `tmp_${Date.now()}`;
    const optimistic = {
      id: temporaryId,
      senderRole: currentRole,
      message: text,
      createdAt: new Date().toISOString(),
      pending: true,
    };
    setDraft("");
    setMessages((prev) => [...prev, optimistic]);
    setSending(true);
    setError("");
    try {
      const data = await fetchJson(`${API_BASE}/sessions/chat/send`, {
        method: "POST",
        body: JSON.stringify({ counterpartId: selectedThread.counterpartId, message: text }),
      });
      const chatMessage = data?.chatMessage || null;
      if (chatMessage) {
        setMessages((prev) =>
          prev.map((e) => e.id === temporaryId ? { ...e, ...chatMessage, pending: false } : e)
        );
      } else {
        await loadMessages(selectedThread.counterpartId, { silent: true });
      }
      await loadThreads();
    } catch (err) {
      setMessages((prev) => prev.filter((e) => e.id !== temporaryId));
      setError(err.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const onComposerKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  /* ── role guard ── */
  if (!["doctor", "patient"].includes(currentRole)) {
    return (
      <div className="flex items-center justify-center h-40 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#141414] text-sm text-slate-500 dark:text-slate-400">
        Chat is available only for authenticated doctor or patient accounts.
      </div>
    );
  }

  const listItems = mergedThreads;
  const isListLoading = loadingThreads || (isDoctor && loadingPatients);

  /* ══════════════════════════════════════════════════════════════════════
     REDESIGNED JSX — minimal, premium, healthcare SaaS
  ══════════════════════════════════════════════════════════════════════ */
  return (
    <div
      className="flex overflow-hidden rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#141414] shadow-sm"
      style={{ height: "calc(100vh - 116px)", minHeight: "480px" }}
    >
      {/* ══════════════ LEFT — Conversation Panel ══════════════ */}
      <div className="flex w-[300px] shrink-0 flex-col border-r border-slate-100 dark:border-white/[0.06]">

        {/* Panel header */}
        <div className="px-5 pt-4 pb-4 shrink-0">
          <div className="flex items-center justify-between mb-5">
            <h1 className="text-[15px] font-bold text-slate-800 dark:text-white tracking-tight">
              Messages
            </h1>
            {!isListLoading && listItems.length > 0 && (
              <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 tabular-nums">
                {listItems.length}
              </span>
            )}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="Search"
              readOnly
              className={`w-full h-9 pl-9 pr-4 rounded-xl border-0 bg-slate-100 dark:bg-white/[0.06] text-[13px] text-slate-700 dark:text-slate-300 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 ${isDoctor ? "focus:ring-primary/20" : "focus:ring-sky-500/20"} transition-all`}
            />
          </div>
        </div>

        {/* Thread list */}
        <div className="flex-1 overflow-y-auto px-2 pt-2 pb-4 space-y-1">
          {isListLoading ? (
            <div className="flex flex-col items-center justify-center h-32 gap-2.5">
              <Loader2 className={`h-4 w-4 animate-spin ${isDoctor ? "text-primary" : "text-sky-500"}`} />
              <span className="text-[12px] text-slate-400 dark:text-slate-500">Loading…</span>
            </div>
          ) : listItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-3 px-4 text-center">
              <InboxIcon className="h-8 w-8 text-slate-200 dark:text-slate-700" />
              <p className="text-[12px] text-slate-400 dark:text-slate-500 leading-relaxed">
                No conversations yet.<br />They will appear here.
              </p>
            </div>
          ) : (
            listItems.map((thread) => {
              const active = thread.counterpartId === selectedCounterpartId;
              const patient = {
                name: thread?.counterpartName || "",
                profileImage:
                  thread?.patient?.profileImage ??
                  thread?.profileImage ??
                  thread?.counterpartProfileImage ??
                  thread?.counterpartAvatar ??
                  null,
              };
              const patientProfileImage = resolvePatientProfileImage(patient);
              return (
                <button
                  key={thread.counterpartId}
                  type="button"
                  onClick={() => setSelectedCounterpartId(thread.counterpartId)}
                  className={`w-full rounded-xl px-4 py-3.5 text-left group ${
                    active
                      ? (isDoctor
                        ? "bg-primary/10 dark:bg-primary/20 ring-1 ring-primary/20 dark:ring-primary/30"
                        : "bg-sky-50 dark:bg-sky-500/[0.08] ring-1 ring-sky-200 dark:ring-sky-500/[0.15]")
                      : "hover:bg-slate-50 dark:hover:bg-white/[0.04]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Avatar with static online dot */}
                    <div className="relative shrink-0">
                      <Avatar src={patientProfileImage} name={thread.counterpartName} size="md" accentStyle={doctorAvatarStyle} />
                      <span className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ${isDoctor ? "bg-primary" : "bg-emerald-400"} ring-[1.5px] ring-white dark:ring-[#141414]`} />
                    </div>

                    {/* Text section */}
                    <div className="min-w-0 flex-1">
                      {/* Row 1: Name + time */}
                      <div className="flex items-baseline justify-between gap-2">
                        <span className={`truncate text-[13px] font-semibold leading-none ${
                          active
                            ? (isDoctor ? "text-primary dark:text-primary" : "text-sky-700 dark:text-sky-400")
                            : "text-slate-800 dark:text-slate-100"
                        }`}>
                          {thread.counterpartName || "Unknown"}
                        </span>
                        <span className="shrink-0 text-[11px] text-slate-400 dark:text-slate-500 tabular-nums leading-none">
                          {formatThreadTime(thread.lastAt)}
                        </span>
                      </div>

                      {/* Row 2: Last message + unread badge */}
                      <div className="flex items-center justify-between mt-1.5 gap-2">
                        <span className="truncate text-[12px] text-slate-500 dark:text-slate-400 leading-none">
                          {thread.lastMessage || "No messages yet"}
                        </span>
                        {thread.unreadCount > 0 && (
                          <span className={`shrink-0 inline-flex items-center justify-center h-[18px] min-w-[18px] px-1.5 rounded-full ${isDoctor ? "bg-primary" : "bg-sky-500"} text-[9px] font-bold text-white tabular-nums leading-none`}>
                            {thread.unreadCount > 99 ? "99+" : thread.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ══════════════ RIGHT — Chat Area ══════════════ */}
      <div className="flex flex-1 flex-col min-w-0">
        {selectedThread ? (
          <>
            {/* ── Chat header ── */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-white/[0.06] shrink-0 bg-white dark:bg-[#141414]">
              <div className="flex items-center gap-3">
                {/* Avatar with static online dot */}
                <div className="relative shrink-0">
                  <Avatar src={selectedPatientProfileImage} name={selectedThread.counterpartName} size="lg" accentStyle={doctorAvatarStyle} />
                  <span className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ${isDoctor ? "bg-primary" : "bg-emerald-400"} ring-[1.5px] ring-white dark:ring-[#141414]`} />
                </div>

                {/* Name + status row */}
                <div className="flex flex-col justify-center gap-0.5">
                  <p className="text-[13.5px] font-bold text-slate-900 dark:text-white leading-none">
                    {selectedThread.counterpartName || "Conversation"}
                  </p>

                  {/* Status row — fully static, no animations */}
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 leading-none">
                      Online
                    </span>

                    {/* Separator */}
                    <span className="text-slate-300 dark:text-slate-600 text-[10px] leading-none select-none">·</span>

                    {/* Role badge — static pill, no transitions, no remount */}
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/[0.07] border border-slate-200 dark:border-white/[0.08] text-[10px] font-semibold text-slate-500 dark:text-slate-400 leading-none whitespace-nowrap">
                      {selectedThread.counterpartRole === "doctor" ? "Doctor" : "Patient"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Messages ── */}
            <div className="flex-1 overflow-y-auto px-6 py-6 bg-slate-50/40 dark:bg-transparent">
              {loadingMessages ? (
                <div className="flex flex-col items-center justify-center h-full gap-3">
                  <Loader2 className={`h-5 w-5 animate-spin ${isDoctor ? "text-primary" : "text-sky-500"}`} />
                  <span className="text-[12px] text-slate-400 dark:text-slate-500">Loading messages…</span>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
                  <div className={`h-14 w-14 rounded-2xl ${isDoctor ? "bg-primary/10 dark:bg-primary/20" : "bg-sky-50 dark:bg-sky-500/10"} flex items-center justify-center`}>
                    <MessageCircle className={`h-7 w-7 ${isDoctor ? "text-primary" : "text-sky-400"}`} />
                  </div>
                  <div>
                    <p className="text-[14px] font-semibold text-slate-600 dark:text-slate-300">No messages yet</p>
                    <p className="text-[12px] text-slate-400 dark:text-slate-500 mt-1">
                      Start the conversation below.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  {messages.map((msg, idx) => {
                    const mine = String(msg.senderRole || "").toLowerCase() === currentRole;
                    const prevMsg = messages[idx - 1];
                    const sameSenderAsPrev = prevMsg && prevMsg.senderRole === msg.senderRole;
                    return (
                      <div
                        key={msg.id}
                        className={`flex items-end gap-2.5 ${mine ? "justify-end" : "justify-start"}`}
                      >
                        {/* Received avatar — show only when sender changes */}
                        {!mine && (
                          <div className="shrink-0 w-7">
                            {!sameSenderAsPrev && (
                              <Avatar src={selectedPatientProfileImage} name={selectedThread.counterpartName} size="sm" accentStyle={doctorAvatarStyle} />
                            )}
                          </div>
                        )}

                        <div className={`flex flex-col gap-1 max-w-[58%] ${mine ? "items-end" : "items-start"}`}>
                          {/* Bubble */}
                          <div
                            className={`rounded-2xl px-4 py-2.5 text-[13.5px] leading-relaxed break-words whitespace-pre-wrap ${
                              mine
                                ? (isDoctor
                                  ? "bg-primary dark:bg-primary text-white rounded-br-sm shadow-sm shadow-primary/20"
                                  : "bg-sky-500 dark:bg-sky-600 text-white rounded-br-sm shadow-sm shadow-sky-500/20")
                                : "bg-white dark:bg-white/[0.06] text-slate-800 dark:text-slate-100 border border-slate-100 dark:border-white/[0.08] rounded-bl-sm shadow-sm"
                            } ${msg.pending ? "opacity-60" : ""}`}
                          >
                            {msg.message}
                          </div>

                          {/* Timestamp */}
                          <div className={`flex items-center gap-1.5 px-1 ${mine ? "flex-row-reverse" : ""}`}>
                            <Clock className="h-2.5 w-2.5 text-slate-300 dark:text-slate-600" />
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 tabular-nums">
                              {msg.pending ? "sending…" : formatMessageTime(msg.createdAt)}
                            </span>
                            {mine && !msg.pending && (
                              <CheckCheck className={`h-3 w-3 ${isDoctor ? "text-primary" : "text-sky-400"}`} />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={listEndRef} />
                </div>
              )}
            </div>

            {/* ── Composer ── */}
            <div className="px-5 py-4 border-t border-slate-100 dark:border-white/[0.06] bg-white dark:bg-[#141414] shrink-0">
              {error && (
                <p className="mb-2.5 px-3 py-2 rounded-lg bg-rose-50 dark:bg-rose-500/10 text-[12px] text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-500/20 font-medium">
                  {error}
                </p>
              )}
              <div className={`flex items-center gap-2 p-1.5 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.04] ${isDoctor ? "focus-within:border-primary dark:focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20" : "focus-within:border-sky-300 dark:focus-within:border-sky-500/40 focus-within:ring-2 focus-within:ring-sky-500/10"} transition-all duration-200`}>
                {/* Attachment */}
                <button
                  type="button"
                  className="h-8 w-8 shrink-0 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-white dark:hover:bg-white/[0.06] transition-all"
                >
                  <Paperclip className="h-4 w-4" />
                </button>

                {/* Textarea */}
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={onComposerKeyDown}
                  placeholder="Write a message…"
                  rows={1}
                  className="flex-1 resize-none bg-transparent text-[13.5px] text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none leading-relaxed py-1.5 px-1 max-h-28"
                />

                {/* Emoji */}
                <button
                  type="button"
                  className="h-8 w-8 shrink-0 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-white dark:hover:bg-white/[0.06] transition-all"
                >
                  <Smile className="h-4 w-4" />
                </button>

                {/* Send */}
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={sending || !draft.trim()}
                  className={`h-8 w-8 shrink-0 rounded-xl flex items-center justify-center ${isDoctor ? "bg-primary hover:opacity-90 shadow-primary/30" : "bg-sky-500 hover:bg-sky-600 shadow-sky-500/30"} text-white disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 hover:scale-105 transition-all duration-150 shadow-sm`}
                >
                  {sending
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <SendHorizontal className="h-3.5 w-3.5" />
                  }
                </button>
              </div>
            </div>
          </>
        ) : (
          /* ── Empty state ── */
          <div className="flex flex-1 flex-col items-center justify-center gap-5 px-10 text-center bg-slate-50/30 dark:bg-transparent">
            <div className={`h-16 w-16 rounded-3xl ${isDoctor ? "bg-primary/10 dark:bg-primary/20 border-primary/20 dark:border-primary/30" : "bg-sky-50 dark:bg-sky-500/[0.08] border border-sky-100 dark:border-sky-500/[0.12]"} flex items-center justify-center`}>
              <MessageCircle className={`h-8 w-8 ${isDoctor ? "text-primary" : "text-sky-400"}`} />
            </div>
            <div>
              <p className="text-[15px] font-semibold text-slate-700 dark:text-slate-200">
                Select a conversation
              </p>
              <p className="text-[13px] text-slate-400 dark:text-slate-500 mt-1.5 leading-relaxed">
                Choose a conversation from the left<br />to view messages.
              </p>
            </div>
            {isListLoading && (
              <div className="flex items-center gap-2 text-[12px] text-slate-400 dark:text-slate-500">
                <Loader2 className={`h-3.5 w-3.5 animate-spin ${isDoctor ? "text-primary" : "text-sky-500"}`} />
                Loading conversations…
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Messages;
