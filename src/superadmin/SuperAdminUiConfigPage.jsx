import React, { useEffect, useState } from "react";

import {
  CARD_STYLES,
  THEME_MODES,
  fetchUiConfig,
  updateUiConfig,
} from "./api";
import { ErrorBanner, InlineLoader, Panel } from "./ui";

const defaultForm = {
  buttonColor: "#0F9D94",
  iconColor: "#14B8A6",
  cardStyle: "ROUNDED",
  themeMode: "SYSTEM",
  qrActionsJson: "[]",
  dashboardCardsJson: "[]",
};

const parseJsonArray = (value, fieldName) => {
  let parsed;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error(`${fieldName} must be valid JSON.`);
  }
  if (!Array.isArray(parsed)) {
    throw new Error(`${fieldName} must be a JSON array.`);
  }
  return parsed;
};

const SuperAdminUiConfigPage = () => {
  const [form, setForm] = useState(defaultForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadConfig = async () => {
    setIsLoading(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetchUiConfig();
      const config = response?.config || {};
      setForm({
        buttonColor: config.buttonColor || defaultForm.buttonColor,
        iconColor: config.iconColor || defaultForm.iconColor,
        cardStyle: config.cardStyle || defaultForm.cardStyle,
        themeMode: config.themeMode || defaultForm.themeMode,
        qrActionsJson: JSON.stringify(config.qrActions || [], null, 2),
        dashboardCardsJson: JSON.stringify(config.dashboardCards || [], null, 2),
      });
    } catch (err) {
      setError(err.message || "Failed to load UI config.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const qrActions = parseJsonArray(form.qrActionsJson, "QR Actions");
      const dashboardCards = parseJsonArray(
        form.dashboardCardsJson,
        "Dashboard Cards"
      );

      await updateUiConfig({
        buttonColor: form.buttonColor.trim(),
        iconColor: form.iconColor.trim(),
        cardStyle: form.cardStyle,
        themeMode: form.themeMode,
        qrActions,
        dashboardCards,
      });

      setSuccess("UI configuration saved successfully.");
      await loadConfig();
    } catch (err) {
      setError(err.message || "Failed to save UI configuration.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Panel
        title="UI Control Panel"
        subtitle="Control Flutter app theme and dynamic dashboard/QR UI from backend."
        action={
          <button
            type="button"
            onClick={loadConfig}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Refresh
          </button>
        }
      >
        {isLoading ? (
          <InlineLoader label="Loading UI config..." />
        ) : (
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">
                  Button Color
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form.buttonColor}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, buttonColor: event.target.value }))
                    }
                    className="h-10 w-12 rounded border border-slate-300 bg-white p-1"
                  />
                  <input
                    type="text"
                    value={form.buttonColor}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, buttonColor: event.target.value }))
                    }
                    className="h-10 flex-1 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-cyan-500"
                  />
                </div>
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">
                  Icon Color
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form.iconColor}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, iconColor: event.target.value }))
                    }
                    className="h-10 w-12 rounded border border-slate-300 bg-white p-1"
                  />
                  <input
                    type="text"
                    value={form.iconColor}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, iconColor: event.target.value }))
                    }
                    className="h-10 flex-1 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-cyan-500"
                  />
                </div>
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">
                  Card Style
                </span>
                <select
                  value={form.cardStyle}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, cardStyle: event.target.value }))
                  }
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-cyan-500"
                >
                  {CARD_STYLES.map((style) => (
                    <option key={style} value={style}>
                      {style}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">
                  Theme Mode
                </span>
                <select
                  value={form.themeMode}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, themeMode: event.target.value }))
                  }
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-cyan-500"
                >
                  {THEME_MODES.map((mode) => (
                    <option key={mode} value={mode}>
                      {mode}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">
                QR Actions JSON
              </span>
              <p className="mb-2 text-xs text-slate-500">
                Example item:{" "}
                <code>{`{"label":"Chat with Doctor","icon":"chat","actionUrl":"https://..." ,"isActive":true}`}</code>
              </p>
              <textarea
                value={form.qrActionsJson}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, qrActionsJson: event.target.value }))
                }
                className="min-h-[170px] w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono outline-none focus:border-cyan-500"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">
                Dashboard Cards JSON
              </span>
              <p className="mb-2 text-xs text-slate-500">
                Example item:{" "}
                <code>{`{"title":"Book Lab Test","subtitle":"Get reports online","redirectUrl":"https://...","isActive":true}`}</code>
              </p>
              <textarea
                value={form.dashboardCardsJson}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    dashboardCardsJson: event.target.value,
                  }))
                }
                className="min-h-[170px] w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono outline-none focus:border-cyan-500"
              />
            </label>

            <ErrorBanner message={error} />
            {success ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {success}
              </div>
            ) : null}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Saving..." : "Save UI Config"}
              </button>
            </div>
          </form>
        )}
      </Panel>
    </div>
  );
};

export default SuperAdminUiConfigPage;
