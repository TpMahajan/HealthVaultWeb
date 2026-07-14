import React, { useEffect, useState } from "react";
import {
  fetchAiSettings,
  fetchAiUsageSummary,
  fetchAiUsageUsers,
  updateAiSettings,
} from "./api";
import { ErrorBanner, InlineLoader, Panel, Table } from "./ui";

const defaultSettings = {
  patientDailyMessageLimit: 10,
  doctorDailyMessageLimit: 25,
  adminDailyMessageLimit: 50,
  maxInputTokensPerRequest: 1500,
  maxOutputTokensPerRequest: 700,
  maxInputChars: 6000,
  maxChatHistoryMessages: 6,
  maxDocumentsPerRequest: 3,
  allowedModels: ["gpt-4o-mini"],
  defaultModel: "gpt-4o-mini",
  documentVerificationAiEnabled: true,
  aiAssistantEnabled: true,
  hardDailyTokenBudget: 100000,
  hardDailyCostBudget: 10,
};

const numberFields = [
  ["patientDailyMessageLimit", "Patient daily messages"],
  ["doctorDailyMessageLimit", "Doctor daily messages"],
  ["adminDailyMessageLimit", "Admin daily messages"],
  ["maxInputTokensPerRequest", "Max input tokens/request"],
  ["maxOutputTokensPerRequest", "Max output tokens/request"],
  ["maxInputChars", "Max input chars/request"],
  ["maxChatHistoryMessages", "Max chat history messages"],
  ["maxDocumentsPerRequest", "Max documents/request"],
  ["hardDailyTokenBudget", "Daily token budget"],
  ["hardDailyCostBudget", "Daily cost budget"],
];

const SuperAdminAiControlsPage = () => {
  const [settings, setSettings] = useState(defaultSettings);
  const [summary, setSummary] = useState(null);
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = async () => {
    setIsLoading(true);
    setError("");
    setSuccess("");
    try {
      const [settingsResponse, summaryResponse, usersResponse] =
        await Promise.all([
          fetchAiSettings(),
          fetchAiUsageSummary(),
          fetchAiUsageUsers(),
        ]);
      setSettings({ ...defaultSettings, ...(settingsResponse.settings || {}) });
      setSummary(summaryResponse.totals || null);
      setUsers(usersResponse.users || []);
    } catch (err) {
      setError(err.message || "Failed to load AI controls.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const updateField = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const save = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setError("");
    setSuccess("");
    try {
      const payload = {
        ...settings,
        allowedModels: String(settings.allowedModels || "")
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
      };
      await updateAiSettings(payload);
      setSuccess("AI controls saved.");
      await load();
    } catch (err) {
      setError(err.message || "Failed to save AI controls.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <InlineLoader label="Loading AI controls..." />;
  }

  return (
    <div className="space-y-6">
      <Panel
        title="AI Controls"
        subtitle="Manage assistant limits, document AI, and daily budgets."
        action={
          <button
            type="button"
            onClick={load}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Refresh
          </button>
        }
      >
        <form onSubmit={save} className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-3">
              <input
                type="checkbox"
                checked={Boolean(settings.aiAssistantEnabled)}
                onChange={(event) =>
                  updateField("aiAssistantEnabled", event.target.checked)
                }
              />
              <span className="text-sm font-medium text-slate-800">
                AI assistant enabled
              </span>
            </label>
            <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-3">
              <input
                type="checkbox"
                checked={Boolean(settings.documentVerificationAiEnabled)}
                onChange={(event) =>
                  updateField(
                    "documentVerificationAiEnabled",
                    event.target.checked
                  )
                }
              />
              <span className="text-sm font-medium text-slate-800">
                Document AI verification enabled
              </span>
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {numberFields.map(([key, label]) => (
              <label key={key} className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">
                  {label}
                </span>
                <input
                  type="number"
                  min="0"
                  value={settings[key] ?? 0}
                  onChange={(event) => updateField(key, Number(event.target.value))}
                  className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-cyan-500"
                />
              </label>
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">
                Default model
              </span>
              <input
                type="text"
                value={settings.defaultModel || ""}
                onChange={(event) => updateField("defaultModel", event.target.value)}
                className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-cyan-500"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">
                Allowed models
              </span>
              <input
                type="text"
                value={Array.isArray(settings.allowedModels)
                  ? settings.allowedModels.join(", ")
                  : settings.allowedModels || ""}
                onChange={(event) => updateField("allowedModels", event.target.value)}
                className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-cyan-500"
              />
            </label>
          </div>

          <ErrorBanner message={error} />
          {success ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {success}
            </div>
          ) : null}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-700 disabled:opacity-60"
            >
              {isSaving ? "Saving..." : "Save AI Controls"}
            </button>
          </div>
        </form>
      </Panel>

      <Panel title="Today Usage" subtitle="Current daily AI usage summary.">
        <div className="grid gap-3 md:grid-cols-4">
          {[
            ["Messages", summary?.messages || 0],
            ["Input tokens", summary?.inputTokens || 0],
            ["Output tokens", summary?.outputTokens || 0],
            ["Estimated cost", `$${Number(summary?.estimatedCost || 0).toFixed(4)}`],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-slate-200 p-4">
              <p className="text-xs font-medium uppercase text-slate-500">
                {label}
              </p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">
                {value}
              </p>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Top Users" subtitle="Highest AI usage today.">
        <Table
          columns={[
            { key: "userId", title: "User" },
            { key: "role", title: "Role" },
            { key: "messages", title: "Messages" },
            { key: "inputTokens", title: "Input tokens" },
            { key: "outputTokens", title: "Output tokens" },
            {
              key: "estimatedCost",
              title: "Cost",
              render: (row) => `$${Number(row.estimatedCost || 0).toFixed(4)}`,
            },
          ]}
          rows={users}
          emptyMessage="No AI usage logged today."
        />
      </Panel>
    </div>
  );
};

export default SuperAdminAiControlsPage;
