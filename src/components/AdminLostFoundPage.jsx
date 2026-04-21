import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  BellRing,
  CheckCircle2,
  Copy,
  Eye,
  ImageOff,
  Loader2,
  PhoneCall,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  X,
} from "lucide-react";
import { API_BASE } from "../constants/api";

const STATUS_META = {
  open: {
    label: "Open",
    className: "border-amber-200 bg-amber-50 text-amber-700",
  },
  under_review: {
    label: "Under Review",
    className: "border-sky-200 bg-sky-50 text-sky-700",
  },
  matched: {
    label: "Matched",
    className: "border-violet-200 bg-violet-50 text-violet-700",
  },
  found: {
    label: "Found",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  resolved: {
    label: "Resolved",
    className: "border-teal-200 bg-teal-50 text-teal-700",
  },
  closed: {
    label: "Closed",
    className: "border-slate-200 bg-slate-100 text-slate-700",
  },
};

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "open", label: "Open" },
  { value: "under_review", label: "Under Review" },
  { value: "matched", label: "Matched" },
  { value: "found", label: "Found" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

const REPORT_TYPE_OPTIONS = [
  { value: "all", label: "All Types" },
  { value: "medicalvault_profile", label: "MedicalVault Profile" },
  { value: "family_friend", label: "Family or Friend" },
];

const EMPTY_SUMMARY = {
  totalLostReports: 0,
  openReports: 0,
  foundResolvedReports: 0,
  notificationsSent: 0,
  suggestedMatches: 0,
};

const asText = (value) => {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value).trim();
  return "";
};

const asNumberText = (value) => {
  if (value === null || value === undefined || value === "") return "";
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  const text = asText(value);
  if (!text) return "";
  const parsed = Number(text);
  return Number.isFinite(parsed) ? String(parsed) : text;
};

const asPhotoUrl = (value) => {
  const text = asText(value);
  if (!text) return "";
  return text === "[object Object]" ? "" : text;
};

const cleanDisplayValue = (value) => {
  const text = asText(value);
  if (!text) return "";

  const lower = text.toLowerCase();
  if (lower === "null" || lower === "undefined" || text === "[object Object]") {
    return "";
  }

  if ((text.startsWith("{") && text.endsWith("}")) || (text.startsWith("[") && text.endsWith("]"))) {
    return "";
  }

  return text;
};

const normalizePhoneValue = (value) => {
  const text = cleanDisplayValue(value);
  if (!text) return "";

  const cleaned = text.replace(/[^0-9+()\-\s]/g, "").replace(/\s+/g, " ").trim();
  if (cleaned.length >= 7) return cleaned;
  return "";
};

const normalizeEmailValue = (value) => {
  const text = cleanDisplayValue(value).toLowerCase();
  if (!text) return "";
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text) ? text : "";
};

const normalizeStatus = (value) => {
  const raw = asText(value).toLowerCase().replace(/\s+/g, "_");
  if (!raw) return "open";

  if (raw === "underreview" || raw === "review") return "under_review";
  if (raw === "close") return "closed";
  if (raw === "notification_sent") return "open";
  if (raw === "match_confirmed") return "matched";
  if (raw === "match_rejected") return "under_review";

  return STATUS_META[raw] ? raw : "open";
};

const normalizeReportType = (value, hasLinkedProfile) => {
  const raw = asText(value).toLowerCase().replace(/\s+/g, "_");
  if (["medicalvault_profile", "medical_vault_profile", "medicalvault", "profile"].includes(raw)) {
    return "medicalvault_profile";
  }
  if (["family_friend", "family", "friend"].includes(raw)) {
    return "family_friend";
  }
  return hasLinkedProfile ? "medicalvault_profile" : "family_friend";
};

const reportTypeLabel = (value) =>
  value === "medicalvault_profile" ? "MedicalVault Profile" : "Family or Friend";

const formatDateTime = (value) => {
  if (!value) return "Not provided";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Not provided";

  return parsed.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const formatDateOnly = (value) => {
  if (!value) return "Not provided";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Not provided";

  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const mapSummary = (raw) => ({
  totalLostReports: Number(raw?.totalLostReports ?? raw?.total ?? 0),
  openReports: Number(raw?.openReports ?? raw?.openLostCount ?? 0),
  foundResolvedReports: Number(raw?.foundResolvedReports ?? raw?.resolved ?? 0),
  notificationsSent: Number(raw?.notificationsSent ?? raw?.notifiedCount ?? 0),
  suggestedMatches: Number(raw?.suggestedMatches ?? raw?.suggestedMatchesCount ?? 0),
});

const buildAddressText = (address) => {
  const lines = [
    cleanDisplayValue(address.address),
    cleanDisplayValue(address.area),
    cleanDisplayValue(address.landmark),
    [cleanDisplayValue(address.city), cleanDisplayValue(address.state), cleanDisplayValue(address.pincode)]
      .filter(Boolean)
      .join(", "),
  ].filter(Boolean);

  return lines.join(", ");
};

const mapReport = (raw) => {
  const reporterBlock = raw && typeof raw.reporter === "object" ? raw.reporter || {} : {};
  const reporterUser =
    raw && typeof raw.reportedByUserId === "object" ? raw.reportedByUserId || {} : {};
  const addressBlock = raw && typeof raw.address === "object" ? raw.address || {} : {};
  const linkedProfile = raw && typeof raw.lostPersonUserId === "object" ? raw.lostPersonUserId || {} : {};

  const reportId = asText(raw?.reportId || raw?._id || raw?.id);
  const hasLinkedProfile = Boolean(asText(linkedProfile?._id || linkedProfile?.id || linkedProfile?.name));

  const reportType = normalizeReportType(
    raw?.normalizedReportType || raw?.reportForType || raw?.photoSource,
    hasLinkedProfile
  );

  const coordinates = Array.isArray(raw?.lastSeenLocation?.coordinates)
    ? raw.lastSeenLocation.coordinates
    : [];
  const coordinateText =
    coordinates.length === 2
      ? `${Number(coordinates[1]).toFixed(5)}, ${Number(coordinates[0]).toFixed(5)}`
      : "";

  const emergencyPhone = asText(reporterUser?.emergencyContact?.phone);

  const address = {
    address: cleanDisplayValue(addressBlock?.address || raw?.address),
    area: cleanDisplayValue(addressBlock?.area || raw?.area),
    city: cleanDisplayValue(addressBlock?.city || raw?.city),
    state: cleanDisplayValue(addressBlock?.state || raw?.state),
    pincode: cleanDisplayValue(addressBlock?.pincode || raw?.pincode),
    landmark: cleanDisplayValue(addressBlock?.landmark || raw?.landmark),
    fullAddress: cleanDisplayValue(addressBlock?.fullAddress),
  };

  const personName =
    cleanDisplayValue(raw?.personName) ||
    cleanDisplayValue(raw?.selectedProfileName) ||
    cleanDisplayValue(linkedProfile?.name) ||
    "Not provided";

  return {
    id: reportId,
    reportId,
    status: normalizeStatus(raw?.normalizedStatus || raw?.status),
    reportType,
    reportTypeLabel: reportTypeLabel(reportType),
    whoIsBeingReportedFor: reportTypeLabel(reportType),
    selectedProfileName: cleanDisplayValue(raw?.selectedProfileName),
    linkedProfileName: cleanDisplayValue(linkedProfile?.name),
    personName,
    approxAge: asNumberText(raw?.approxAge ?? linkedProfile?.age),
    gender: cleanDisplayValue(raw?.gender || linkedProfile?.gender) || "Unknown",
    description: cleanDisplayValue(raw?.description),
    medicalNotes: cleanDisplayValue(raw?.medicalNotes),
    photoUrl: asPhotoUrl(raw?.photoUrl || linkedProfile?.profilePicture),
    reporter: {
      name: cleanDisplayValue(reporterBlock?.name) || cleanDisplayValue(raw?.reporterName) || cleanDisplayValue(reporterUser?.name) || "Not provided",
      phone: normalizePhoneValue(reporterBlock?.phone) || normalizePhoneValue(raw?.reporterPhone) || normalizePhoneValue(reporterUser?.mobile) || normalizePhoneValue(emergencyPhone),
      alternateContact: normalizePhoneValue(reporterBlock?.alternateContact) || normalizePhoneValue(raw?.alternateContact) || normalizePhoneValue(emergencyPhone),
      relationshipToPerson:
        cleanDisplayValue(reporterBlock?.relationshipToPerson) || cleanDisplayValue(raw?.relationshipToPerson),
      email:
        normalizeEmailValue(reporterBlock?.email) ||
        normalizeEmailValue(raw?.reporterEmail) ||
        normalizeEmailValue(reporterUser?.email),
    },
    address,
    lastSeenLocation: cleanDisplayValue(addressBlock?.lastSeenLocationText) || cleanDisplayValue(raw?.lastSeenLocationText) || cleanDisplayValue(raw?.lastSeenLocation) || coordinateText,
    lastSeenTime: raw?.lastSeenTime || null,
    createdAt: raw?.createdAt || null,
    notificationStatus: {
      sent: Boolean(raw?.notificationStatus?.sent),
      lastSentAt: raw?.notificationStatus?.lastSentAt || null,
    },
    internalNotes: cleanDisplayValue(raw?.internalNotes),
    foundLocation: cleanDisplayValue(raw?.foundLocation),
  };
};

const getStatusMeta = (status) => STATUS_META[normalizeStatus(status)] || STATUS_META.open;

const adminHeaders = (token) => ({
  "Content-Type": "application/json",
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
});

const valueWithFallback = (value, fallback = "Not provided") => {
  const text = asText(value);
  return text || fallback;
};

const StatusBadge = ({ status }) => {
  const meta = getStatusMeta(status);
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.1em] ${meta.className}`}
    >
      {meta.label}
    </span>
  );
};

const ReportPhoto = ({ report, large = false }) => {
  const [failed, setFailed] = useState(false);
  const sizeClass = large ? "h-20 w-20 rounded-2xl" : "h-12 w-12 rounded-xl";

  if (report.photoUrl && !failed) {
    return (
      <img
        src={report.photoUrl}
        alt={report.personName || "Reported person"}
        className={`${sizeClass} border border-slate-200 bg-slate-100 object-cover`}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} flex items-center justify-center border border-slate-200 bg-slate-100 text-slate-500`}
    >
      {large ? <ImageOff size={20} /> : <span className="text-xs font-bold">N/A</span>}
    </div>
  );
};

const SummaryCard = ({ title, value, helper, icon: Icon, iconClass }) => (
  <div className="rounded-2xl border border-white/60 bg-white/75 p-4 shadow-[0_10px_26px_rgba(15,23,42,0.08)] backdrop-blur-md">
    <div className="flex items-center justify-between gap-3">
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">{title}</p>
      <span className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${iconClass}`}>
        <Icon size={16} />
      </span>
    </div>
    <p className="mt-2 text-2xl font-black text-slate-900">{value}</p>
    <p className="mt-1 text-xs text-slate-500">{helper}</p>
  </div>
);

const DetailSection = ({ title, children }) => (
  <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-3.5">
    <h4 className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">{title}</h4>
    <div className="mt-2">{children}</div>
  </section>
);

const InfoRow = ({ label, value, fallback = "Not provided" }) => (
  <div className="min-w-0">
    <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">{label}</p>
    <p className="mt-1 break-words whitespace-pre-wrap text-[13px] font-medium leading-relaxed text-slate-800 sm:text-sm">
      {valueWithFallback(value, fallback)}
    </p>
  </div>
);

const LoadingRows = () => (
  <>
    {Array.from({ length: 6 }).map((_, index) => (
      <tr key={index} className="border-b border-slate-100">
        <td className="px-4 py-4">
          <div className="h-12 w-12 animate-pulse rounded-xl bg-slate-200" />
        </td>
        <td className="px-4 py-4">
          <div className="h-4 w-44 animate-pulse rounded bg-slate-200" />
          <div className="mt-2 h-3 w-28 animate-pulse rounded bg-slate-100" />
        </td>
        <td className="px-4 py-4">
          <div className="h-4 w-10 animate-pulse rounded bg-slate-200" />
        </td>
        <td className="px-4 py-4">
          <div className="h-4 w-14 animate-pulse rounded bg-slate-200" />
        </td>
        <td className="px-4 py-4">
          <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
        </td>
        <td className="px-4 py-4">
          <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
        </td>
        <td className="px-4 py-4">
          <div className="h-4 w-28 animate-pulse rounded bg-slate-200" />
        </td>
        <td className="px-4 py-4">
          <div className="h-6 w-24 animate-pulse rounded-full bg-slate-200" />
        </td>
        <td className="px-4 py-4">
          <div className="h-9 w-24 animate-pulse rounded-lg bg-slate-200" />
        </td>
      </tr>
    ))}
  </>
);

export default function AdminLostFoundPage() {
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [reports, setReports] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [reportTypeFilter, setReportTypeFilter] = useState("all");
  const [submittedDate, setSubmittedDate] = useState("");

  const [selectedReportId, setSelectedReportId] = useState("");
  const [busyActionKey, setBusyActionKey] = useState("");

  const [foundDialogOpen, setFoundDialogOpen] = useState(false);
  const [foundLocationInput, setFoundLocationInput] = useState("");
  const [foundNoteInput, setFoundNoteInput] = useState("");
  const [notifyAfterFound, setNotifyAfterFound] = useState(true);

  const [notifyDialogOpen, setNotifyDialogOpen] = useState(false);
  const [notifyMessageInput, setNotifyMessageInput] = useState("");
  const [notifyLocationInput, setNotifyLocationInput] = useState("");

  const [internalNotesDraft, setInternalNotesDraft] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
    }, 280);

    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(""), 3000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const requestJson = useCallback(async (url, options = {}) => {
    const token = localStorage.getItem("adminToken");

    const response = await fetch(url, {
      credentials: "include",
      ...options,
      headers: {
        ...(options.headers || {}),
        ...adminHeaders(token),
      },
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload?.success === false) {
      throw new Error(asText(payload?.message) || `Request failed (${response.status})`);
    }

    return payload;
  }, []);

  const reportQuery = useMemo(() => {
    const params = new URLSearchParams();
    params.set("page", "1");
    params.set("limit", "200");
    params.set("sort", "latest");

    if (search) params.set("search", search);
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (reportTypeFilter !== "all") params.set("reportType", reportTypeFilter);

    if (submittedDate) {
      params.set("from", submittedDate);
      params.set("to", submittedDate);
    }

    return params.toString();
  }, [search, statusFilter, reportTypeFilter, submittedDate]);

  const loadLostFoundData = useCallback(
    async ({ silent = false } = {}) => {
      if (silent) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError("");

      const summaryPromise = requestJson(`${API_BASE}/admin/lost-found/summary`);
      const reportsPromise = requestJson(`${API_BASE}/admin/lost-found/reports?${reportQuery}`);

      const [summaryResult, reportsResult] = await Promise.allSettled([
        summaryPromise,
        reportsPromise,
      ]);

      if (summaryResult.status === "fulfilled") {
        const rawSummary = summaryResult.value?.summary || summaryResult.value?.data || {};
        setSummary(mapSummary(rawSummary));
      } else {
        setSummary(EMPTY_SUMMARY);
      }

      if (reportsResult.status === "fulfilled") {
        const rawReports =
          reportsResult.value?.data?.reports ||
          reportsResult.value?.reports ||
          reportsResult.value?.data ||
          [];

        const mapped = Array.isArray(rawReports) ? rawReports.map(mapReport) : [];
        setReports(mapped.filter((entry) => entry.id));
      } else {
        setReports([]);
        setError(asText(reportsResult.reason?.message) || "Unable to load reports");
      }

      if (silent) {
        setIsRefreshing(false);
      } else {
        setIsLoading(false);
      }
    },
    [reportQuery, requestJson]
  );

  useEffect(() => {
    loadLostFoundData();
  }, [loadLostFoundData]);

  const selectedReport = useMemo(
    () => reports.find((report) => report.id === selectedReportId) || null,
    [reports, selectedReportId]
  );

  useEffect(() => {
    if (!selectedReportId) return;
    if (!reports.some((entry) => entry.id === selectedReportId)) {
      setSelectedReportId("");
    }
  }, [reports, selectedReportId]);

  useEffect(() => {
    if (!selectedReport) return;

    setInternalNotesDraft(selectedReport.internalNotes || "");
    setFoundLocationInput(selectedReport.foundLocation || "");
    setFoundNoteInput("");
    setNotifyAfterFound(true);
    setNotifyLocationInput(selectedReport.foundLocation || "");
    setNotifyMessageInput("");
  }, [selectedReport]);

  useEffect(() => {
    const isAnyModalOpen = Boolean(selectedReportId || foundDialogOpen || notifyDialogOpen);
    if (!isAnyModalOpen) return undefined;

    const prevOverflow = document.body.style.overflow;
    const prevPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPaddingRight;
    };
  }, [selectedReportId, foundDialogOpen, notifyDialogOpen]);

  const isBusy = (key) => busyActionKey === key;

  const updateReportStatus = useCallback(
    async ({ reportId, status, payload = {}, successMessage, actionKey }) => {
      const key = actionKey || `${reportId}:${status}`;
      setBusyActionKey(key);

      try {
        await requestJson(`${API_BASE}/admin/lost-found/reports/${encodeURIComponent(reportId)}/status`, {
          method: "PATCH",
          body: JSON.stringify({ status, ...payload }),
        });

        await loadLostFoundData({ silent: true });
        setToast(successMessage || "Report updated");
      } catch (err) {
        setToast(asText(err?.message) || "Unable to update report");
      } finally {
        setBusyActionKey("");
      }
    },
    [loadLostFoundData, requestJson]
  );

  const handleSaveInternalNotes = useCallback(async () => {
    if (!selectedReport) return;

    await updateReportStatus({
      reportId: selectedReport.id,
      status: selectedReport.status,
      payload: { internalNotes: internalNotesDraft },
      successMessage: "Internal notes saved",
      actionKey: `${selectedReport.id}:notes`,
    });
  }, [internalNotesDraft, selectedReport, updateReportStatus]);

  const handleConfirmFound = useCallback(async () => {
    if (!selectedReport) return;

    const actionKey = `${selectedReport.id}:found`;
    setBusyActionKey(actionKey);

    try {
      await requestJson(`${API_BASE}/admin/lost-found/reports/${encodeURIComponent(selectedReport.id)}/status`, {
        method: "PATCH",
        body: JSON.stringify({
          status: "found",
          foundLocation: asText(foundLocationInput),
          note: asText(foundNoteInput),
        }),
      });

      if (notifyAfterFound) {
        await requestJson(`${API_BASE}/admin/lost-found/reports/${encodeURIComponent(selectedReport.id)}/notify`, {
          method: "POST",
          body: JSON.stringify({
            foundLocation: asText(foundLocationInput),
          }),
        });
      }

      await loadLostFoundData({ silent: true });
      setFoundDialogOpen(false);
      setToast(notifyAfterFound ? "Marked as found and notification sent" : "Marked as found");
    } catch (err) {
      setToast(asText(err?.message) || "Unable to mark as found");
    } finally {
      setBusyActionKey("");
    }
  }, [
    foundLocationInput,
    foundNoteInput,
    loadLostFoundData,
    notifyAfterFound,
    requestJson,
    selectedReport,
  ]);

  const handleSendNotification = useCallback(async () => {
    if (!selectedReport) return;

    const actionKey = `${selectedReport.id}:notify`;
    setBusyActionKey(actionKey);

    try {
      await requestJson(`${API_BASE}/admin/lost-found/reports/${encodeURIComponent(selectedReport.id)}/notify`, {
        method: "POST",
        body: JSON.stringify({
          message: asText(notifyMessageInput),
          foundLocation: asText(notifyLocationInput),
        }),
      });

      await loadLostFoundData({ silent: true });
      setNotifyDialogOpen(false);
      setToast("Notification sent to reporter");
    } catch (err) {
      setToast(asText(err?.message) || "Unable to send notification");
    } finally {
      setBusyActionKey("");
    }
  }, [loadLostFoundData, notifyLocationInput, notifyMessageInput, requestJson, selectedReport]);

  const hasActiveFilters =
    Boolean(searchInput.trim()) ||
    statusFilter !== "all" ||
    reportTypeFilter !== "all" ||
    Boolean(submittedDate);

  const clearFilters = () => {
    setSearchInput("");
    setSearch("");
    setStatusFilter("all");
    setReportTypeFilter("all");
    setSubmittedDate("");
  };

  const handleCopy = async (value) => {
    const text = asText(value);
    if (!text) {
      setToast("No contact to copy");
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      setToast("Contact copied");
    } catch {
      setToast("Copy failed");
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(236,253,245,0.85),_rgba(241,245,249,0.96)_44%,_rgba(248,250,252,1)_100%)] p-4 md:p-6">
      <div className="mx-auto max-w-[1380px] space-y-5">
        <header className="rounded-2xl border border-white/60 bg-white/75 p-5 shadow-[0_14px_32px_rgba(15,23,42,0.08)] backdrop-blur-md">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-black text-slate-900">Lost &amp; Found</h2>
              <p className="mt-1 text-sm font-medium text-slate-600">SOS-linked missing person reports</p>
              <p className="mt-1 text-xs text-slate-500">
                Only patient submitted lost-person report data is shown here.
              </p>
            </div>
            <button
              type="button"
              onClick={() => loadLostFoundData({ silent: true })}
              disabled={isLoading || isRefreshing}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              {isLoading || isRefreshing ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <RefreshCw size={16} />
              )}
              Refresh
            </button>
          </div>
        </header>

        <section
          className={`grid grid-cols-1 gap-3 sm:grid-cols-2 ${
            summary.suggestedMatches > 0 ? "xl:grid-cols-5" : "xl:grid-cols-4"
          }`}
        >
          <SummaryCard
            title="Total Reports"
            value={summary.totalLostReports}
            helper="All missing-person reports"
            icon={ShieldAlert}
            iconClass="bg-slate-100 text-slate-700"
          />
          <SummaryCard
            title="Open Reports"
            value={summary.openReports}
            helper="Open, under review, and matched"
            icon={AlertCircle}
            iconClass="bg-amber-100 text-amber-700"
          />
          <SummaryCard
            title="Found / Resolved"
            value={summary.foundResolvedReports}
            helper="Cases already located"
            icon={ShieldCheck}
            iconClass="bg-emerald-100 text-emerald-700"
          />
          <SummaryCard
            title="Notifications Sent"
            value={summary.notificationsSent}
            helper="Reporter updates delivered"
            icon={BellRing}
            iconClass="bg-teal-100 text-teal-700"
          />
          {summary.suggestedMatches > 0 ? (
            <SummaryCard
              title="Suggested Matches"
              value={summary.suggestedMatches}
              helper="Only shown when data exists"
              icon={CheckCircle2}
              iconClass="bg-violet-100 text-violet-700"
            />
          ) : null}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-2.5 shadow-sm sm:p-3">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-[minmax(0,2.1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.95fr)_auto] md:items-center">
            <label className="relative block">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search by name, report ID, or phone"
                className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm font-medium text-slate-700 outline-none placeholder:text-slate-400 focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
              />
            </label>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-sm font-medium text-slate-700 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <select
              value={reportTypeFilter}
              onChange={(event) => setReportTypeFilter(event.target.value)}
              className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-sm font-medium text-slate-700 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
            >
              {REPORT_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <input
              type="date"
              value={submittedDate}
              onChange={(event) => setSubmittedDate(event.target.value)}
              className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-sm font-medium text-slate-700 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
            />

            <button
              type="button"
              onClick={clearFilters}
              disabled={!hasActiveFilters}
              title="Clear filters"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45"
            >
              <X size={14} />
            </button>
          </div>

          <div className="mt-2 flex items-center justify-between gap-2">
            <p className="text-xs text-slate-500">Showing {reports.length} reports</p>
          </div>
        </section>

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50/90 p-4 text-rose-700 shadow-[0_8px_22px_rgba(244,63,94,0.12)]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-2">
                <AlertCircle size={16} className="mt-[2px]" />
                <div>
                  <p className="text-sm font-bold">Unable to load reports right now.</p>
                  <p className="text-xs opacity-85">Please try again in a moment.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => loadLostFoundData({ silent: true })}
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-rose-200 bg-white px-3 text-sm font-semibold text-rose-700 hover:bg-rose-100"
              >
                <RefreshCw size={14} />
                Retry
              </button>
            </div>
          </div>
        ) : null}

        <section className="rounded-2xl border border-white/60 bg-white/80 shadow-[0_12px_30px_rgba(15,23,42,0.09)] backdrop-blur-md">
          <div className="overflow-x-auto">
            <table className="min-w-[980px] w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-white/90 text-left text-[11px] uppercase tracking-[0.12em] text-slate-500">
                  <th className="px-4 py-3 font-black">Photo</th>
                  <th className="px-4 py-3 font-black">Person Name</th>
                  <th className="px-4 py-3 font-black">Approx Age</th>
                  <th className="px-4 py-3 font-black">Gender</th>
                  <th className="px-4 py-3 font-black">Reporter</th>
                  <th className="px-4 py-3 font-black">Phone</th>
                  <th className="px-4 py-3 font-black">Submitted On</th>
                  <th className="px-4 py-3 font-black">Status</th>
                  <th className="px-4 py-3 font-black">Action</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <LoadingRows />
                ) : reports.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center">
                      <p className="text-lg font-bold text-slate-800">No reports found</p>
                      <p className="mt-1 text-sm text-slate-500">
                        Try adjusting your filters or refresh to fetch the latest reports.
                      </p>
                    </td>
                  </tr>
                ) : (
                  reports.map((report) => (
                    <tr key={report.id} className="border-b border-slate-100 hover:bg-teal-50/35">
                      <td className="px-4 py-3">
                        <ReportPhoto report={report} />
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-900">{report.personName}</p>
                        <p className="text-xs text-slate-500">Report ID: {valueWithFallback(report.reportId)}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{valueWithFallback(report.approxAge, "-")}</td>
                      <td className="px-4 py-3 text-slate-700">{valueWithFallback(report.gender, "-")}</td>
                      <td className="px-4 py-3 text-slate-700">{valueWithFallback(report.reporter.name, "-")}</td>
                      <td className="px-4 py-3 text-slate-700">{valueWithFallback(report.reporter.phone, "-")}</td>
                      <td className="px-4 py-3 text-slate-700">{formatDateOnly(report.createdAt)}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={report.status} />
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => setSelectedReportId(report.id)}
                          className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-50"
                        >
                          <Eye size={13} />
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {toast ? (
        <div className="fixed bottom-5 right-5 z-[130] rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-lg">
          {toast}
        </div>
      ) : null}

      {selectedReport ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close details"
            onClick={() => setSelectedReportId("")}
            className="absolute inset-0 bg-slate-900/55"
          />

          <div
            className="relative flex w-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_22px_50px_rgba(15,23,42,0.22)]"
            style={{
              width: "min(800px, calc(100vw - 40px))",
              maxHeight: "min(88dvh, 820px)",
            }}
          >
            <div className="border-b border-slate-200 bg-white px-3.5 py-3 sm:px-4 sm:py-3.5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
                    Report Details
                  </p>
                  <h3 className="mt-1 break-words text-lg font-black text-slate-900 sm:text-xl">
                    {selectedReport.personName}
                  </h3>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <code className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                      Report ID: {valueWithFallback(selectedReport.reportId)}
                    </code>
                    <StatusBadge status={selectedReport.status} />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedReportId("")}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-100"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:px-3.5 sm:py-3">
              <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-2.5 shadow-sm">
                <p className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">Quick Actions</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                    updateReportStatus({
                      reportId: selectedReport.id,
                      status: "under_review",
                      successMessage: "Report moved to under review",
                    })
                  }
                  disabled={isBusy(`${selectedReport.id}:under_review`)}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-2.5 text-[11px] font-bold text-sky-700 hover:bg-sky-100 disabled:opacity-60"
                >
                  {isBusy(`${selectedReport.id}:under_review`) ? (
                    <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <ShieldAlert size={13} />
                    )}
                    Mark Under Review
                  </button>

                  <button
                    type="button"
                    onClick={() => setFoundDialogOpen(true)}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100"
                  >
                    <CheckCircle2 size={13} />
                    Mark Found
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                    updateReportStatus({
                      reportId: selectedReport.id,
                      status: "resolved",
                      successMessage: "Report marked as resolved",
                    })
                  }
                  disabled={isBusy(`${selectedReport.id}:resolved`)}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-teal-200 bg-teal-50 px-2.5 text-[11px] font-bold text-teal-700 hover:bg-teal-100 disabled:opacity-60"
                >
                  {isBusy(`${selectedReport.id}:resolved`) ? (
                    <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <ShieldCheck size={13} />
                    )}
                    Mark Resolved
                  </button>

                  <button
                    type="button"
                    onClick={() => setNotifyDialogOpen(true)}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 text-[11px] font-bold text-indigo-700 hover:bg-indigo-100"
                  >
                    <BellRing size={13} />
                    Send Notification
                  </button>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-slate-200/80 pt-2">
                  {asText(selectedReport.reporter.phone) ? (
                    <a
                      href={`tel:${selectedReport.reporter.phone}`}
                      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <PhoneCall size={13} />
                      Call Reporter
                    </a>
                  ) : null}

                  {asText(selectedReport.reporter.phone) ? (
                    <button
                      type="button"
                      onClick={() => handleCopy(selectedReport.reporter.phone)}
                      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <Copy size={13} />
                      Copy Contact
                    </button>
                  ) : null}

                  {asText(selectedReport.photoUrl) ? (
                    <button
                      type="button"
                      onClick={() => window.open(selectedReport.photoUrl, "_blank", "noopener,noreferrer")}
                      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <Eye size={13} />
                      View Full Photo
                    </button>
                  ) : null}
                </div>
              </section>

              <div className="mt-2.5 space-y-2.5">
                <DetailSection title="Person Details">
                  <div className="grid gap-3 lg:grid-cols-[auto,1fr]">
                    <ReportPhoto report={selectedReport} large />

                    <div className="grid gap-x-4 gap-y-2.5 sm:grid-cols-2">
                      <InfoRow label="Name" value={selectedReport.personName} />
                      <InfoRow label="Approx Age" value={selectedReport.approxAge} />
                      <InfoRow label="Gender" value={selectedReport.gender} />
                      <InfoRow label="Who Is Being Reported For" value={selectedReport.whoIsBeingReportedFor} />
                      <InfoRow label="Report Type" value={selectedReport.reportTypeLabel} />
                      {asText(selectedReport.selectedProfileName) ? (
                        <InfoRow label="Selected Profile" value={selectedReport.selectedProfileName} />
                      ) : null}
                      {asText(selectedReport.linkedProfileName) ? (
                        <InfoRow label="Linked MedicalVault Profile" value={selectedReport.linkedProfileName} />
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-2.5 grid gap-x-4 gap-y-2.5 sm:grid-cols-2">
                    <InfoRow label="Description" value={selectedReport.description} />
                    <InfoRow label="Medical Notes" value={selectedReport.medicalNotes} />
                  </div>
                </DetailSection>

                <DetailSection title="Reporter Details">
                  <div className="grid gap-x-4 gap-y-2.5 sm:grid-cols-2">
                    <InfoRow label="Reporter Name" value={selectedReport.reporter.name} />
                    <InfoRow label="Phone" value={selectedReport.reporter.phone} />
                    <InfoRow label="Alternate Contact" value={selectedReport.reporter.alternateContact} />
                    <InfoRow label="Relationship" value={selectedReport.reporter.relationshipToPerson} />
                    <InfoRow label="Email" value={selectedReport.reporter.email} />
                  </div>
                </DetailSection>

                <DetailSection title="Address / Last Seen">
                  <div className="grid gap-x-4 gap-y-2.5 sm:grid-cols-2">
                    <InfoRow
                      label="Full Address"
                      value={selectedReport.address.fullAddress || buildAddressText(selectedReport.address)}
                    />
                    {asText(selectedReport.address.city) ? (
                      <InfoRow label="City" value={selectedReport.address.city} />
                    ) : null}
                    {asText(selectedReport.address.state) ? (
                      <InfoRow label="State" value={selectedReport.address.state} />
                    ) : null}
                    {asText(selectedReport.address.pincode) ? (
                      <InfoRow label="Pincode" value={selectedReport.address.pincode} />
                    ) : null}
                    {asText(selectedReport.address.landmark) ? (
                      <InfoRow label="Landmark" value={selectedReport.address.landmark} />
                    ) : null}
                    <InfoRow label="Last Seen Location" value={selectedReport.lastSeenLocation} />
                    <InfoRow label="Last Seen Date and Time" value={formatDateTime(selectedReport.lastSeenTime)} />
                  </div>
                </DetailSection>

                <DetailSection title="Report Info">
                  <div className="grid gap-x-4 gap-y-2.5 sm:grid-cols-2">
                    <InfoRow label="Report ID" value={selectedReport.reportId} />
                    <InfoRow label="Submitted On" value={formatDateTime(selectedReport.createdAt)} />
                    <InfoRow label="Current Status" value={getStatusMeta(selectedReport.status).label} />
                    <InfoRow
                      label="Notification Status"
                      value={
                        selectedReport.notificationStatus.sent
                          ? `Sent on ${formatDateTime(selectedReport.notificationStatus.lastSentAt)}`
                          : "Not sent"
                      }
                      fallback="Not sent"
                    />
                  </div>
                </DetailSection>

                <DetailSection title="Internal Notes">
                  <textarea
                    value={internalNotesDraft}
                    onChange={(event) => setInternalNotesDraft(event.target.value)}
                    rows={3}
                    placeholder="Add internal follow-up notes"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                  />

                  <div className="mt-3 flex justify-end">
                    <button
                      type="button"
                      onClick={handleSaveInternalNotes}
                      disabled={isBusy(`${selectedReport.id}:notes`)}
                      className="inline-flex h-9 items-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-3 text-xs font-bold text-teal-700 hover:bg-teal-100 disabled:opacity-60"
                    >
                      {isBusy(`${selectedReport.id}:notes`) ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <CheckCircle2 size={13} />
                      )}
                      Save Notes
                    </button>
                  </div>
                </DetailSection>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {foundDialogOpen && selectedReport ? (
        <div className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-900/45 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-white/60 bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="text-lg font-black text-slate-900">Mark Person as Found</h4>
                <p className="mt-1 text-sm text-slate-600">
                  Confirm found status and optionally add a short note.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFoundDialogOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
              >
                <X size={14} />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                  Found Location (optional)
                </label>
                <input
                  type="text"
                  value={foundLocationInput}
                  onChange={(event) => setFoundLocationInput(event.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-700 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                  placeholder="Hospital, area, police station"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                  Short Note (optional)
                </label>
                <textarea
                  value={foundNoteInput}
                  onChange={(event) => setFoundNoteInput(event.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                  placeholder="Any additional internal note"
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={notifyAfterFound}
                  onChange={(event) => setNotifyAfterFound(event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                Send notification to reporter after marking found
              </label>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setFoundDialogOpen(false)}
                className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmFound}
                disabled={isBusy(`${selectedReport.id}:found`)}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-bold text-emerald-700 hover:bg-emerald-100 disabled:opacity-60"
              >
                {isBusy(`${selectedReport.id}:found`) ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <CheckCircle2 size={14} />
                )}
                Confirm Found
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {notifyDialogOpen && selectedReport ? (
        <div className="fixed inset-0 z-[145] flex items-center justify-center bg-slate-900/45 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-white/60 bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="text-lg font-black text-slate-900">Send Notification</h4>
                <p className="mt-1 text-sm text-slate-600">
                  Send an update to the reporter linked to this report.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setNotifyDialogOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
              >
                <X size={14} />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                  Message (optional)
                </label>
                <textarea
                  value={notifyMessageInput}
                  onChange={(event) => setNotifyMessageInput(event.target.value)}
                  rows={4}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  placeholder="Leave blank to use default status message"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                  Found Location (optional)
                </label>
                <input
                  type="text"
                  value={notifyLocationInput}
                  onChange={(event) => setNotifyLocationInput(event.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  placeholder="Add location context if available"
                />
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setNotifyDialogOpen(false)}
                className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendNotification}
                disabled={isBusy(`${selectedReport.id}:notify`)}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 text-sm font-bold text-indigo-700 hover:bg-indigo-100 disabled:opacity-60"
              >
                {isBusy(`${selectedReport.id}:notify`) ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <BellRing size={14} />
                )}
                Send Notification
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
