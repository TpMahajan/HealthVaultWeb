import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import {
  Loader2,
  MessageCircle,
  SendHorizontal,
  UserCircle2,
} from "lucide-react";
import { API_BASE } from "../constants/api";
import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../context/NotificationContext";

const fetchJson = async (url, options = {}) => {
  const token = localStorage.getItem("token");
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

const Messages = () => {
  const { user } = useAuth();
  const { notifications } = useNotifications();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const counterpartFromQuery = (searchParams.get("counterpart") || "").trim();

  const currentRole = useMemo(
    () => String(user?.role || localStorage.getItem("role") || "").trim().toLowerCase(),
    [user]
  );

  const [threads, setThreads] = useState([]);
  const [selectedCounterpartId, setSelectedCounterpartId] = useState("");
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const listEndRef = useRef(null);
  const notificationCountRef = useRef(notifications.length);

  const selectedThread = useMemo(
    () => threads.find((entry) => entry.counterpartId === selectedCounterpartId) || null,
    [threads, selectedCounterpartId]
  );

  const loadThreads = useCallback(async () => {
    try {
      setLoadingThreads(true);
      setError("");
      const data = await fetchJson(`${API_BASE}/sessions/chat/threads`);
      const nextThreads = Array.isArray(data?.threads) ? data.threads : [];
      setThreads(nextThreads);

      if (counterpartFromQuery) {
        const exists = nextThreads.some((entry) => entry.counterpartId === counterpartFromQuery);
        if (exists) {
          setSelectedCounterpartId(counterpartFromQuery);
          return;
        }
      }

      if (!selectedCounterpartId && nextThreads.length > 0) {
        setSelectedCounterpartId(nextThreads[0].counterpartId);
        return;
      }

      if (
        selectedCounterpartId &&
        !nextThreads.some((entry) => entry.counterpartId === selectedCounterpartId)
      ) {
        setSelectedCounterpartId(nextThreads[0]?.counterpartId || "");
      }
    } catch (loadError) {
      setError(loadError.message || "Failed to load conversations");
    } finally {
      setLoadingThreads(false);
    }
  }, [counterpartFromQuery, selectedCounterpartId]);

  const loadMessages = useCallback(async (counterpartId, { silent = false } = {}) => {
    if (!counterpartId) {
      setMessages([]);
      return;
    }
    try {
      if (!silent) {
        setLoadingMessages(true);
      }
      const data = await fetchJson(
        `${API_BASE}/sessions/chat/messages/${encodeURIComponent(counterpartId)}?limit=300`
      );
      setMessages(Array.isArray(data?.messages) ? data.messages : []);
    } catch (loadError) {
      if (!silent) {
        setError(loadError.message || "Failed to load messages");
      }
    } finally {
      if (!silent) {
        setLoadingMessages(false);
      }
    }
  }, []);

  useEffect(() => {
    loadThreads();
  }, [loadThreads, location.key]);

  useEffect(() => {
    if (!selectedCounterpartId) {
      setMessages([]);
      return;
    }
    loadMessages(selectedCounterpartId);
  }, [loadMessages, selectedCounterpartId]);

  useEffect(() => {
    if (!selectedCounterpartId) return undefined;
    const timer = window.setInterval(() => {
      loadMessages(selectedCounterpartId, { silent: true });
      loadThreads();
    }, 4000);
    return () => window.clearInterval(timer);
  }, [loadMessages, loadThreads, selectedCounterpartId]);

  useEffect(() => {
    if (notifications.length === notificationCountRef.current) return;
    notificationCountRef.current = notifications.length;
    const hasDirectMessage = notifications.some((notification) => {
      const type = String(
        notification?.data?.type || notification?.type || ""
      ).toLowerCase();
      return type === "direct_message";
    });
    if (!hasDirectMessage) return;
    loadThreads();
    if (selectedCounterpartId) {
      loadMessages(selectedCounterpartId, { silent: true });
    }
  }, [loadMessages, loadThreads, notifications, selectedCounterpartId]);

  useEffect(() => {
    if (!listEndRef.current) return;
    listEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

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
        body: JSON.stringify({
          counterpartId: selectedThread.counterpartId,
          message: text,
        }),
      });

      const chatMessage = data?.chatMessage || null;
      if (chatMessage) {
        setMessages((prev) =>
          prev.map((entry) =>
            entry.id === temporaryId
              ? {
                  ...entry,
                  ...chatMessage,
                  pending: false,
                }
              : entry
          )
        );
      } else {
        await loadMessages(selectedThread.counterpartId, { silent: true });
      }

      await loadThreads();
    } catch (sendError) {
      setMessages((prev) => prev.filter((entry) => entry.id !== temporaryId));
      setError(sendError.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const onComposerKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  if (!["doctor", "patient"].includes(currentRole)) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm font-medium text-slate-600 dark:border-white/10 dark:bg-[#1A1C23] dark:text-slate-300">
        Chat is available only for authenticated doctor/patient accounts.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#13151B]">
      <div className="grid min-h-[70vh] grid-cols-1 lg:grid-cols-[320px_1fr]">
        <aside className="border-b border-slate-200 bg-slate-50/60 dark:border-white/10 dark:bg-[#0F1117] lg:border-b-0 lg:border-r">
          <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-4 dark:border-white/10">
            <MessageCircle className="h-4 w-4 text-cyan-600" />
            <h2 className="text-sm font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">
              Conversations
            </h2>
          </div>

          <div className="max-h-[70vh] overflow-y-auto">
            {loadingThreads ? (
              <div className="flex items-center justify-center py-8 text-slate-500 dark:text-slate-300">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading chats...
              </div>
            ) : threads.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                No conversations yet.
              </div>
            ) : (
              threads.map((thread) => {
                const isSelected = thread.counterpartId === selectedCounterpartId;
                return (
                  <button
                    key={thread.counterpartId}
                    type="button"
                    onClick={() => setSelectedCounterpartId(thread.counterpartId)}
                    className={`w-full border-b border-slate-100 px-4 py-3 text-left transition ${
                      isSelected
                        ? "bg-cyan-50/80 dark:bg-cyan-900/20"
                        : "hover:bg-slate-100/70 dark:hover:bg-white/5"
                    } dark:border-white/5`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                        {thread.counterpartAvatar ? (
                          <img
                            src={thread.counterpartAvatar}
                            alt={thread.counterpartName || "User"}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <UserCircle2 className="h-5 w-5 text-slate-500 dark:text-slate-300" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-bold text-slate-800 dark:text-slate-100">
                            {thread.counterpartName || "Unknown"}
                          </p>
                          {thread.unreadCount > 0 && (
                            <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-black text-white">
                              {thread.unreadCount}
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                          {thread.lastMessage || "No messages yet"}
                        </p>
                        <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                          {formatMessageTime(thread.lastAt)}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <section className="flex min-h-[70vh] flex-col">
          {selectedThread ? (
            <>
              <div className="border-b border-slate-200 px-5 py-4 dark:border-white/10">
                <p className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {selectedThread.counterpartName || "Conversation"}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {selectedThread.counterpartRole === "doctor" ? "Doctor" : "Patient"} chat
                </p>
              </div>

              <div className="flex-1 overflow-y-auto bg-slate-50/30 px-4 py-4 dark:bg-[#11141A]">
                {loadingMessages ? (
                  <div className="flex items-center justify-center py-10 text-slate-500 dark:text-slate-300">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading messages...
                  </div>
                ) : (
                  <div className="space-y-3">
                    {messages.map((message) => {
                      const mine =
                        String(message.senderRole || "").toLowerCase() === currentRole;
                      return (
                        <div
                          key={message.id}
                          className={`flex ${mine ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm shadow-sm md:max-w-[70%] ${
                              mine
                                ? "bg-cyan-600 text-white"
                                : "bg-white text-slate-800 dark:bg-[#1E2230] dark:text-slate-100"
                            }`}
                          >
                            <p className="whitespace-pre-wrap break-words">{message.message}</p>
                            <p
                              className={`mt-1 text-[10px] font-semibold ${
                                mine ? "text-cyan-100" : "text-slate-400"
                              }`}
                            >
                              {formatMessageTime(message.createdAt)}
                              {message.pending ? " • sending..." : ""}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={listEndRef} />
                  </div>
                )}
              </div>

              <div className="border-t border-slate-200 p-4 dark:border-white/10">
                <div className="flex items-end gap-3">
                  <textarea
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={onComposerKeyDown}
                    placeholder="Type your message..."
                    rows={2}
                    className="min-h-[48px] flex-1 resize-none rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 focus:border-cyan-500 focus:outline-none dark:border-slate-700 dark:bg-[#151924] dark:text-slate-100"
                  />
                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={sending || !draft.trim()}
                    className="inline-flex h-12 items-center justify-center rounded-2xl bg-cyan-600 px-4 text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {sending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <SendHorizontal className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center px-6 text-center">
              <div>
                <MessageCircle className="mx-auto mb-3 h-10 w-10 text-slate-300 dark:text-slate-600" />
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                  Select a conversation to start chatting
                </p>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default Messages;
