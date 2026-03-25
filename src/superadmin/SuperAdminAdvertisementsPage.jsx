import React, { useEffect, useState } from "react";

import {
  AD_PLACEMENTS,
  GEO_SCOPES,
  createAdvertisement,
  deleteAdvertisement,
  fetchAdvertisements,
  uploadAdvertisementImage,
  updateAdvertisement,
} from "./api";
import {
  ErrorBanner,
  InlineLoader,
  Panel,
  Table,
  formatDateTime,
} from "./ui";
import { formatDateInputValueInSelectedTimeZone } from "../utils/timezone";

const emptyAdForm = {
  title: "",
  imageUrl: "",
  imageKey: "",
  redirectUrl: "",
  placements: ["APP_DASHBOARD"],
  geoScope: "GLOBAL",
  targetCountries: "",
  targetStates: "",
  targetRegions: "",
  isActive: true,
  startDate: "",
  endDate: "",
};

const toInputDate = (value) => {
  if (!value) return "";
  return formatDateInputValueInSelectedTimeZone(value, { fallback: "" });
};

const AdvertisementFormModal = ({
  mode,
  form,
  setForm,
  onClose,
  onSubmit,
  isSubmitting,
  isUploadingImage,
  onUploadImage,
}) => (
  <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
    <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-slate-900">
          {mode === "edit" ? "Edit Advertisement" : "Create Advertisement"}
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
        >
          Close
        </button>
      </div>

      <form onSubmit={onSubmit} className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <label className="block md:col-span-2">
          <span className="mb-1 block text-sm font-medium text-slate-700">Title</span>
          <input
            type="text"
            value={form.title}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, title: event.target.value }))
            }
            className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-cyan-500"
            required
          />
        </label>
        <label className="block md:col-span-2">
          <span className="mb-1 block text-sm font-medium text-slate-700">
            Image URL
          </span>
          <input
            type="text"
            value={form.imageUrl}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, imageUrl: event.target.value }))
            }
            className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-cyan-500"
            placeholder="Paste image URL or upload below"
          />
        </label>
        <label className="block md:col-span-2">
          <span className="mb-1 block text-sm font-medium text-slate-700">
            Upload Image (S3)
          </span>
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-300 p-3">
            <input
              type="file"
              accept="image/*"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) onUploadImage(file);
                event.target.value = "";
              }}
              className="block text-xs text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-cyan-600 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:bg-cyan-700"
            />
            <span className="text-xs text-slate-500">
              {isUploadingImage
                ? "Uploading image..."
                : "Supports JPG, PNG, WEBP up to 8 MB."}
            </span>
          </div>
          {form.imageUrl ? (
            <div className="mt-2 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
              <img
                src={form.imageUrl}
                alt="Ad preview"
                className="h-36 w-full object-cover"
              />
            </div>
          ) : null}
        </label>
        <label className="block md:col-span-2">
          <span className="mb-1 block text-sm font-medium text-slate-700">
            Redirect URL
          </span>
          <input
            type="url"
            value={form.redirectUrl}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, redirectUrl: event.target.value }))
            }
            className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-cyan-500"
            required
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">
            Availability Scope
          </span>
          <select
            value={form.geoScope || "GLOBAL"}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                geoScope: event.target.value,
                ...(event.target.value === "GLOBAL"
                  ? {
                      targetCountries: "",
                      targetStates: "",
                      targetRegions: "",
                    }
                  : {}),
              }))
            }
            className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-cyan-500"
          >
            {GEO_SCOPES.map((scope) => (
              <option key={scope} value={scope}>
                {scope}
              </option>
            ))}
          </select>
        </label>
        <div className="block md:col-span-2">
          <span className="mb-1 block text-sm font-medium text-slate-700">
            Placements
          </span>
          <div className="rounded-lg border border-slate-300 p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs text-slate-500">
                Select one or more surfaces.
              </p>
              <button
                type="button"
                onClick={() =>
                  setForm((prev) => {
                    const current = Array.isArray(prev.placements)
                      ? prev.placements
                      : [];
                    const allSelected = AD_PLACEMENTS.every((placement) =>
                      current.includes(placement)
                    );
                    return {
                      ...prev,
                      placements: allSelected ? [] : [...AD_PLACEMENTS],
                    };
                  })
                }
                className="rounded-md border border-slate-300 px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100"
              >
                Toggle All
              </button>
            </div>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
              {AD_PLACEMENTS.map((placement) => {
                const selected =
                  Array.isArray(form.placements) &&
                  form.placements.includes(placement);
                return (
                  <button
                    key={placement}
                    type="button"
                    onClick={() =>
                      setForm((prev) => {
                        const current = Array.isArray(prev.placements)
                          ? prev.placements
                          : [];
                        const next = current.includes(placement)
                          ? current.filter((item) => item !== placement)
                          : [...current, placement];
                        return {
                          ...prev,
                          placements: next,
                        };
                      })
                    }
                    className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                      selected
                        ? "border-cyan-500 bg-cyan-50 text-cyan-700"
                        : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    {placement}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        {form.geoScope === "TARGETED" ? (
          <>
            <label className="block md:col-span-2">
              <span className="mb-1 block text-sm font-medium text-slate-700">
                Countries (comma separated)
              </span>
              <input
                type="text"
                value={form.targetCountries || ""}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    targetCountries: event.target.value,
                  }))
                }
                className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm uppercase outline-none focus:border-cyan-500"
                placeholder="IN, US, AE"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">
                States (comma separated)
              </span>
              <input
                type="text"
                value={form.targetStates || ""}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    targetStates: event.target.value,
                  }))
                }
                className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm uppercase outline-none focus:border-cyan-500"
                placeholder="MAHARASHTRA, CALIFORNIA"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">
                Regions (comma separated)
              </span>
              <input
                type="text"
                value={form.targetRegions || ""}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    targetRegions: event.target.value,
                  }))
                }
                className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm uppercase outline-none focus:border-cyan-500"
                placeholder="WEST, NORTH"
              />
            </label>
          </>
        ) : null}
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">
            Active
          </span>
          <select
            value={form.isActive ? "true" : "false"}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                isActive: event.target.value === "true",
              }))
            }
            className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-cyan-500"
          >
            <option value="true">Active</option>
            <option value="false">Disabled</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">
            Start Date
          </span>
          <input
            type="date"
            value={form.startDate}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, startDate: event.target.value }))
            }
            className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-cyan-500"
            required
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">
            End Date
          </span>
          <input
            type="date"
            value={form.endDate}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, endDate: event.target.value }))
            }
            className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-cyan-500"
            required
          />
        </label>

        <div className="md:col-span-2 flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || isUploadingImage}
            className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Saving..." : mode === "edit" ? "Update Ad" : "Create Ad"}
          </button>
        </div>
      </form>
    </div>
  </div>
);

const SuperAdminAdvertisementsPage = () => {
  const [ads, setAds] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(emptyAdForm);
  const [modalMode, setModalMode] = useState(null);
  const [editingId, setEditingId] = useState(null);

  const parseCsvList = (value) =>
    String(value || "")
      .split(",")
      .map((entry) => entry.trim().toUpperCase())
      .filter(Boolean);

  const loadAds = async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await fetchAdvertisements();
      setAds(response?.advertisements || []);
    } catch (err) {
      setError(err.message || "Failed to fetch advertisements.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAds();
  }, []);

  const openCreateModal = () => {
    setModalMode("create");
    setEditingId(null);
    setForm(emptyAdForm);
  };

  const openEditModal = (ad) => {
    const normalizedPlacements =
      Array.isArray(ad.placements) && ad.placements.length > 0
        ? ad.placements
        : ad.placement
          ? [ad.placement]
          : ["APP_DASHBOARD"];
    setModalMode("edit");
    setEditingId(ad._id);
    setForm({
      title: ad.title || "",
      imageUrl: ad.imageUrl || "",
      imageKey: ad.imageKey || "",
      redirectUrl: ad.redirectUrl || "",
      placements: normalizedPlacements,
      geoScope: ad.geoScope || "GLOBAL",
      targetCountries: Array.isArray(ad.targetCountries)
        ? ad.targetCountries.join(", ")
        : "",
      targetStates: Array.isArray(ad.targetStates)
        ? ad.targetStates.join(", ")
        : "",
      targetRegions: Array.isArray(ad.targetRegions)
        ? ad.targetRegions.join(", ")
        : "",
      isActive: ad.isActive !== false,
      startDate: toInputDate(ad.startDate),
      endDate: toInputDate(ad.endDate),
    });
  };

  const closeModal = () => {
    setModalMode(null);
    setEditingId(null);
    setForm(emptyAdForm);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");
    try {
      const placements = Array.isArray(form.placements)
        ? form.placements.filter((entry) => AD_PLACEMENTS.includes(entry))
        : [];
      if (placements.length === 0) {
        throw new Error("Select at least one placement.");
      }
      const payload = {
        ...form,
        title: form.title.trim(),
        imageUrl: form.imageUrl.trim(),
        imageKey: (form.imageKey || "").trim(),
        redirectUrl: form.redirectUrl.trim(),
        placements,
        geoScope: form.geoScope || "GLOBAL",
        targetCountries:
          form.geoScope === "TARGETED" ? parseCsvList(form.targetCountries) : [],
        targetStates:
          form.geoScope === "TARGETED" ? parseCsvList(form.targetStates) : [],
        targetRegions:
          form.geoScope === "TARGETED" ? parseCsvList(form.targetRegions) : [],
        startDate: form.startDate,
        endDate: form.endDate,
      };
      if (!payload.imageUrl && !payload.imageKey) {
        throw new Error("Provide an image URL or upload an image.");
      }
      if (modalMode === "edit" && editingId) {
        await updateAdvertisement(editingId, payload);
      } else {
        await createAdvertisement(payload);
      }
      closeModal();
      await loadAds();
    } catch (err) {
      setError(err.message || "Failed to save advertisement.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUploadImage = async (file) => {
    setError("");
    setIsUploadingImage(true);
    try {
      const response = await uploadAdvertisementImage(file);
      setForm((prev) => ({
        ...prev,
        imageUrl: response?.imageUrl || prev.imageUrl,
        imageKey: response?.imageKey || prev.imageKey,
      }));
    } catch (err) {
      setError(err.message || "Failed to upload advertisement image.");
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleDelete = async (ad) => {
    const confirmed = window.confirm(
      `Delete advertisement "${ad.title || "Untitled"}"?`
    );
    if (!confirmed) return;
    setError("");
    try {
      await deleteAdvertisement(ad._id);
      await loadAds();
    } catch (err) {
      setError(err.message || "Failed to delete advertisement.");
    }
  };

  return (
    <div className="space-y-6">
      <Panel
        title="Advertisement Management"
        subtitle="Manage app/web banners, schedule duration, and placement."
        action={
          <div className="flex gap-2">
            <button
              type="button"
              onClick={loadAds}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Refresh
            </button>
            <button
              type="button"
              onClick={openCreateModal}
              className="rounded-lg bg-cyan-600 px-3 py-2 text-sm font-semibold text-white hover:bg-cyan-700"
            >
              Add Advertisement
            </button>
          </div>
        }
      >
        <ErrorBanner message={error} className="mb-4" />

        {isLoading ? (
          <InlineLoader label="Loading advertisements..." />
        ) : (
          <Table
            columns={[
              {
                key: "title",
                title: "Title",
                render: (row) => (
                  <div>
                    <p className="font-semibold text-slate-900">{row.title || "-"}</p>
                    <p className="text-xs text-slate-500">
                      {Array.isArray(row.placements) && row.placements.length > 0
                        ? row.placements.join(", ")
                        : row.placement || "-"}
                    </p>
                  </div>
                ),
              },
              {
                key: "imageUrl",
                title: "Preview",
                render: (row) => (
                  row.imageUrl ? (
                    <a
                      href={row.imageUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2"
                    >
                      <img
                        src={row.imageUrl}
                        alt={row.title || "Ad image"}
                        className="h-10 w-16 rounded-md border border-slate-200 object-cover"
                      />
                      <span className="text-xs text-cyan-700 underline">Open</span>
                    </a>
                  ) : (
                    "-"
                  )
                ),
              },
              {
                key: "geo",
                title: "Geo Availability",
                render: (row) => {
                  const scope = row.geoScope || "GLOBAL";
                  if (scope !== "TARGETED") {
                    return (
                      <span className="text-xs font-semibold text-emerald-700">
                        GLOBAL
                      </span>
                    );
                  }
                  const countries = Array.isArray(row.targetCountries)
                    ? row.targetCountries
                    : [];
                  const states = Array.isArray(row.targetStates)
                    ? row.targetStates
                    : [];
                  const regions = Array.isArray(row.targetRegions)
                    ? row.targetRegions
                    : [];
                  return (
                    <div className="text-xs text-slate-600">
                      <p>C: {countries.length > 0 ? countries.join(", ") : "-"}</p>
                      <p>S: {states.length > 0 ? states.join(", ") : "-"}</p>
                      <p>R: {regions.length > 0 ? regions.join(", ") : "-"}</p>
                    </div>
                  );
                },
              },
              {
                key: "redirectUrl",
                title: "Redirect",
                render: (row) => (
                  <a
                    href={row.redirectUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-cyan-700 underline"
                  >
                    Open Link
                  </a>
                ),
              },
              {
                key: "schedule",
                title: "Schedule",
                render: (row) => (
                  <div className="text-xs text-slate-600">
                    <p>Start: {formatDateTime(row.startDate)}</p>
                    <p>End: {formatDateTime(row.endDate)}</p>
                  </div>
                ),
              },
              {
                key: "isActive",
                title: "Status",
                render: (row) => (
                  <span
                    className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${
                      row.isActive
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-slate-300 bg-slate-100 text-slate-600"
                    }`}
                  >
                    {row.isActive ? "ACTIVE" : "DISABLED"}
                  </span>
                ),
              },
              {
                key: "actions",
                title: "Actions",
                render: (row) => (
                  <div className="flex flex-wrap gap-1">
                    <button
                      type="button"
                      onClick={() => openEditModal(row)}
                      className="rounded border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(row)}
                      className="rounded border border-rose-300 px-2 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50"
                    >
                      Delete
                    </button>
                  </div>
                ),
              },
            ]}
            rows={ads}
            emptyMessage="No advertisements found."
          />
        )}
      </Panel>

      {modalMode ? (
        <AdvertisementFormModal
          mode={modalMode}
          form={form}
          setForm={setForm}
          onClose={closeModal}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          isUploadingImage={isUploadingImage}
          onUploadImage={handleUploadImage}
        />
      ) : null}
    </div>
  );
};

export default SuperAdminAdvertisementsPage;
