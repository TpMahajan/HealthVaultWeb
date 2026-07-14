import React, { useEffect, useState } from "react";
import { AlertTriangle, Save, ShieldCheck } from "lucide-react";

import {
  fetchFamilyCareConfig,
  searchFamilyCareEntitlements,
  updateFamilyCareEntitlement,
  updateFamilyCareConfig,
} from "./api";
import { ErrorBanner, InlineLoader, Panel, formatDateTime } from "./ui";

const defaults = {
  enabled: false,
  developmentAutoEntitle: false,
  features: {
    medicationV2: false,
    caregiverAlerts: false,
    insights: false,
    emergencyCardV2: false,
    vaccination: false,
    insurance: false,
  },
  limits: {
    maxManagedProfiles: 5,
    maxCaregiversPerProfile: 5,
  },
  invitations: {
    windowMinutes: 60,
    maxPerWindow: 10,
  },
};

const mergeConfig = (config = {}) => ({
  ...defaults,
  ...config,
  features: { ...defaults.features, ...(config.features || {}) },
  limits: { ...defaults.limits, ...(config.limits || {}) },
  invitations: { ...defaults.invitations, ...(config.invitations || {}) },
});

const dateInputValue = (value) => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
};

const featureRows = [
  ["medicationV2", "Medication V2", "Orders, schedules, dose events, and adherence."],
  ["caregiverAlerts", "Caregiver alerts", "Escalation notifications for configured care events."],
  ["insights", "Health insights", "Structured and AI-assisted informational insights."],
  ["emergencyCardV2", "Emergency Card V2", "Restricted profile-specific emergency information."],
  ["vaccination", "Vaccinations", "Vaccination records and due-date tracking."],
  ["insurance", "Insurance", "Policy tracking and expiry reminders."],
];

const Toggle = ({ checked, onChange, title, description, disabled = false }) => (
  <label className={`flex items-start justify-between gap-4 rounded-xl border border-slate-200 p-4 ${disabled ? "bg-slate-50 opacity-70" : "bg-white"}`}>
    <span>
      <span className="block text-sm font-semibold text-slate-900">{title}</span>
      {description ? <span className="mt-1 block text-xs leading-5 text-slate-600">{description}</span> : null}
    </span>
    <input
      type="checkbox"
      checked={Boolean(checked)}
      disabled={disabled}
      onChange={(event) => onChange(event.target.checked)}
      className="mt-1 h-5 w-5 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
    />
  </label>
);

const NumberField = ({ label, description, value, min, max, onChange }) => (
  <label className="block rounded-xl border border-slate-200 p-4">
    <span className="block text-sm font-semibold text-slate-900">{label}</span>
    <span className="mt-1 block min-h-10 text-xs leading-5 text-slate-600">{description}</span>
    <input
      type="number"
      min={min}
      max={max}
      value={value}
      onChange={(event) => onChange(Number(event.target.value))}
      className="mt-3 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
    />
    <span className="mt-1 block text-[11px] text-slate-500">Allowed: {min}–{max}</span>
  </label>
);

const SuperAdminFamilyCarePage = () => {
  const [config, setConfig] = useState(defaults);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [accountSearch, setAccountSearch] = useState("");
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [entitlement, setEntitlement] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isSavingEntitlement, setIsSavingEntitlement] = useState(false);
  const [entitlementMessage, setEntitlementMessage] = useState("");

  const load = async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await fetchFamilyCareConfig();
      setConfig(mergeConfig(response.config));
    } catch (err) {
      setError(err.message || "Failed to load Family Care configuration.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const updateRoot = (key, value) => {
    setConfig((previous) => ({ ...previous, [key]: value }));
    setSuccess("");
  };

  const updateNested = (group, key, value) => {
    setConfig((previous) => ({
      ...previous,
      [group]: { ...previous[group], [key]: value },
    }));
    setSuccess("");
  };

  const save = async (event) => {
    event.preventDefault();
    if (config.enabled && !window.confirm(
      "Enable Family Care platform access? Individual accounts still require an active entitlement."
    )) {
      return;
    }
    setIsSaving(true);
    setError("");
    setSuccess("");
    try {
      const response = await updateFamilyCareConfig({
        enabled: Boolean(config.enabled),
        developmentAutoEntitle: Boolean(config.developmentAutoEntitle),
        features: config.features,
        limits: config.limits,
        invitations: config.invitations,
      });
      setConfig(mergeConfig(response.config));
      setSuccess("Family Care configuration saved. Backend instances refresh within 15 seconds.");
    } catch (err) {
      setError(err.message || "Failed to save Family Care configuration.");
    } finally {
      setIsSaving(false);
    }
  };

  const selectAccount = (account) => {
    const current = account?.entitlements?.familyCare || {};
    setSelectedAccount(account);
    setEntitlement({
      enabled: Boolean(current.enabled),
      status: current.status || "expired",
      planCode: current.planCode || "family-care",
      trialEndsAt: dateInputValue(current.trialEndsAt),
      subscriptionEndsAt: dateInputValue(current.subscriptionEndsAt),
      limits: {
        maxManagedProfiles: Number(current.limits?.maxManagedProfiles ?? config.limits.maxManagedProfiles),
        maxCaregiversPerProfile: Number(current.limits?.maxCaregiversPerProfile ?? config.limits.maxCaregiversPerProfile),
      },
    });
    setEntitlementMessage("");
  };

  const searchAccounts = async () => {
    if (accountSearch.trim().length < 2) {
      setEntitlementMessage("Enter at least 2 characters.");
      return;
    }
    setIsSearching(true);
    setEntitlementMessage("");
    try {
      const response = await searchFamilyCareEntitlements(accountSearch.trim());
      setAccounts(response.users || []);
      setSelectedAccount(null);
      setEntitlement(null);
      if (!(response.users || []).length) setEntitlementMessage("No patient accounts found.");
    } catch (err) {
      setEntitlementMessage(err.message || "Account search failed.");
    } finally {
      setIsSearching(false);
    }
  };

  const saveEntitlement = async () => {
    if (!selectedAccount || !entitlement) return;
    setIsSavingEntitlement(true);
    setEntitlementMessage("");
    try {
      const response = await updateFamilyCareEntitlement(selectedAccount._id, entitlement);
      setSelectedAccount(response.user);
      selectAccount(response.user);
      setAccounts((previous) => previous.map((account) =>
        account._id === response.user._id ? response.user : account
      ));
      setEntitlementMessage("Account entitlement saved.");
    } catch (err) {
      setEntitlementMessage(err.message || "Failed to save account entitlement.");
    } finally {
      setIsSavingEntitlement(false);
    }
  };

  if (isLoading) return <InlineLoader label="Loading Family Care configuration..." />;

  return (
    <form onSubmit={save} className="space-y-6">
      <Panel
        title="Family Care Control Center"
        subtitle="Persisted platform settings for access, feature rollout, limits, and invitation protection."
        action={
          <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${config.enabled ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-600"}`}>
            <span className={`h-2 w-2 rounded-full ${config.enabled ? "bg-emerald-500" : "bg-slate-400"}`} />
            {config.enabled ? "Platform enabled" : "Platform disabled"}
          </div>
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Toggle
            checked={config.enabled}
            onChange={(value) => updateRoot("enabled", value)}
            title="Enable Family Care"
            description="Master server-side switch. User entitlements are still enforced independently."
          />
          <Toggle
            checked={config.developmentAutoEntitle}
            onChange={(value) => updateRoot("developmentAutoEntitle", value)}
            title="Auto-entitle development users"
            description="Works only when the backend is not running in production. Keep off for realistic entitlement testing."
          />
        </div>
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <p>Sub-feature switches are rollout controls. Enable a switch only after its API, authorization, UI, migration, and test slice is production-ready.</p>
        </div>
      </Panel>

      <Panel title="Feature rollout" subtitle="Control Family Care modules independently.">
        <div className="grid gap-3 md:grid-cols-2">
          {featureRows.map(([key, title, description]) => (
            <Toggle
              key={key}
              checked={config.features[key]}
              onChange={(value) => updateNested("features", key, value)}
              title={title}
              description={description}
            />
          ))}
        </div>
      </Panel>

      <Panel title="Family limits" subtitle="Platform-wide hard caps. A user plan may set lower limits, never higher ones.">
        <div className="grid gap-4 md:grid-cols-2">
          <NumberField
            label="Managed profiles per account"
            description="Maximum child, parent, spouse, or dependent profiles one owner can create."
            value={config.limits.maxManagedProfiles}
            min={0}
            max={50}
            onChange={(value) => updateNested("limits", "maxManagedProfiles", value)}
          />
          <NumberField
            label="Caregivers per profile"
            description="Maximum active or invited caregivers, excluding the profile owner."
            value={config.limits.maxCaregiversPerProfile}
            min={0}
            max={50}
            onChange={(value) => updateNested("limits", "maxCaregiversPerProfile", value)}
          />
        </div>
      </Panel>

      <Panel title="Invitation protection" subtitle="Mongo-backed throttling shared across backend instances.">
        <div className="grid gap-4 md:grid-cols-2">
          <NumberField
            label="Rate-limit window (minutes)"
            description="Time window used to count caregiver invitation attempts per authenticated actor."
            value={config.invitations.windowMinutes}
            min={1}
            max={1440}
            onChange={(value) => updateNested("invitations", "windowMinutes", value)}
          />
          <NumberField
            label="Invitations per window"
            description="Maximum invitation attempts permitted during the configured window."
            value={config.invitations.maxPerWindow}
            min={1}
            max={1000}
            onChange={(value) => updateNested("invitations", "maxPerWindow", value)}
          />
        </div>
      </Panel>

      <Panel
        title="Account entitlements"
        subtitle="Grant or revoke premium Family Care access for an individual patient account."
      >
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            type="search"
            value={accountSearch}
            onChange={(event) => setAccountSearch(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                searchAccounts();
              }
            }}
            placeholder="Search patient name or email"
            className="h-11 flex-1 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-cyan-500"
          />
          <button
            type="button"
            onClick={searchAccounts}
            disabled={isSearching}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            {isSearching ? "Searching..." : "Find account"}
          </button>
        </div>

        {accounts.length ? (
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {accounts.map((account) => (
              <button
                type="button"
                key={account._id}
                onClick={() => selectAccount(account)}
                className={`rounded-xl border p-3 text-left ${selectedAccount?._id === account._id ? "border-cyan-500 bg-cyan-50" : "border-slate-200 hover:bg-slate-50"}`}
              >
                <span className="block text-sm font-semibold text-slate-900">{account.name}</span>
                <span className="block text-xs text-slate-600">{account.email}</span>
              </button>
            ))}
          </div>
        ) : null}

        {selectedAccount && entitlement ? (
          <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-semibold text-slate-900">{selectedAccount.name}</p>
                <p className="text-xs text-slate-600">{selectedAccount.email}</p>
              </div>
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <input
                  type="checkbox"
                  checked={entitlement.enabled}
                  onChange={(event) => setEntitlement((previous) => ({ ...previous, enabled: event.target.checked }))}
                />
                Premium access enabled
              </label>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <label className="block text-sm font-medium text-slate-700">
                Status
                <select
                  value={entitlement.status}
                  onChange={(event) => setEntitlement((previous) => ({ ...previous, status: event.target.value }))}
                  className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3"
                >
                  <option value="trial">Trial</option>
                  <option value="active">Active</option>
                  <option value="expired">Expired</option>
                  <option value="suspended">Suspended</option>
                </select>
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Plan code
                <input
                  value={entitlement.planCode}
                  onChange={(event) => setEntitlement((previous) => ({ ...previous, planCode: event.target.value }))}
                  className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3"
                />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Trial ends
                <input
                  type="date"
                  value={entitlement.trialEndsAt}
                  onChange={(event) => setEntitlement((previous) => ({ ...previous, trialEndsAt: event.target.value }))}
                  className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3"
                />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Subscription ends
                <input
                  type="date"
                  value={entitlement.subscriptionEndsAt}
                  onChange={(event) => setEntitlement((previous) => ({ ...previous, subscriptionEndsAt: event.target.value }))}
                  className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3"
                />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Managed profiles
                <input
                  type="number"
                  min="0"
                  max={config.limits.maxManagedProfiles}
                  value={entitlement.limits.maxManagedProfiles}
                  onChange={(event) => setEntitlement((previous) => ({ ...previous, limits: { ...previous.limits, maxManagedProfiles: Number(event.target.value) } }))}
                  className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3"
                />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Caregivers per profile
                <input
                  type="number"
                  min="0"
                  max={config.limits.maxCaregiversPerProfile}
                  value={entitlement.limits.maxCaregiversPerProfile}
                  onChange={(event) => setEntitlement((previous) => ({ ...previous, limits: { ...previous.limits, maxCaregiversPerProfile: Number(event.target.value) } }))}
                  className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3"
                />
              </label>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={saveEntitlement}
                disabled={isSavingEntitlement}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
              >
                {isSavingEntitlement ? "Saving..." : "Save account entitlement"}
              </button>
            </div>
          </div>
        ) : null}

        {entitlementMessage ? (
          <p className="mt-3 text-sm text-slate-700">{entitlementMessage}</p>
        ) : null}
      </Panel>

      <ErrorBanner message={error} />
      {success ? (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
          <span>{success}</span>
        </div>
      ) : null}

      <div className="sticky bottom-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur">
        <p className="text-xs text-slate-500">
          Last updated: {formatDateTime(config.updatedAt)} {config.updatedBy ? `by ${config.updatedBy}` : ""}
        </p>
        <button
          type="submit"
          disabled={isSaving}
          className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Save className="h-4 w-4" />
          {isSaving ? "Saving..." : "Save Family Care Settings"}
        </button>
      </div>
    </form>
  );
};

export default SuperAdminFamilyCarePage;
