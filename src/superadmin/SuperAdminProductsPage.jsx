import React, { useEffect, useMemo, useState } from "react";

import {
  GEO_SCOPES,
  createProduct,
  deleteProduct,
  fetchPublicProducts,
  fetchProducts,
  updateProduct,
} from "./api";
import {
  ErrorBanner,
  InlineLoader,
  Panel,
  Table,
  formatDateTime,
} from "./ui";

const emptyProductForm = {
  name: "",
  shortDescription: "",
  fullDescription: "",
  mrp: "",
  sellingPrice: "",
  imageUrl: "",
  imageKey: "",
  thumbnail: "",
  imagesCsv: "",
  video: "",
  category: "",
  subCategory: "",
  tags: "",
  stock: "",
  availability: "IN_STOCK",
  brand: "",
  sku: "",
  expiryDate: "",
  prescriptionRequired: false,
  customFieldsJson: "[]",
  geoScope: "GLOBAL",
  targetCountries: "",
  targetStates: "",
  targetRegions: "",
  isActive: true,
};

const ProductFormModal = ({
  mode,
  form,
  setForm,
  onClose,
  onSubmit,
  isSubmitting,
}) => (
  <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
    <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-slate-900">
          {mode === "edit" ? "Edit Product" : "Add Product"}
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
        <div className="md:col-span-2 mt-1 text-xs font-semibold uppercase tracking-wide text-cyan-700">
          Basic info
        </div>
        <label className="block md:col-span-2">
          <span className="mb-1 block text-sm font-medium text-slate-700">Product Name</span>
          <input
            type="text"
            value={form.name}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, name: event.target.value }))
            }
            className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-cyan-500"
            required
          />
        </label>
        <label className="block md:col-span-2">
          <span className="mb-1 block text-sm font-medium text-slate-700">
            Short Description
          </span>
          <textarea
            value={form.shortDescription}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, shortDescription: event.target.value }))
            }
            className="min-h-[72px] w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500"
            maxLength={400}
          />
        </label>
        <label className="block md:col-span-2">
          <span className="mb-1 block text-sm font-medium text-slate-700">
            Full Description (rich text/html)
          </span>
          <textarea
            value={form.fullDescription}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, fullDescription: event.target.value }))
            }
            className="min-h-[130px] w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs outline-none focus:border-cyan-500"
          />
        </label>
        <div className="md:col-span-2 mt-2 text-xs font-semibold uppercase tracking-wide text-cyan-700">
          Media
        </div>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Price</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.mrp}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, mrp: event.target.value }))
            }
            className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-cyan-500"
            required
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">
            Selling Price
          </span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.sellingPrice}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, sellingPrice: event.target.value }))
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
            type="url"
            value={form.imageUrl}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, imageUrl: event.target.value }))
            }
            className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-cyan-500"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">
            Thumbnail URL
          </span>
          <input
            type="url"
            value={form.thumbnail}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, thumbnail: event.target.value }))
            }
            className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-cyan-500"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">
            Video URL (optional)
          </span>
          <input
            type="url"
            value={form.video}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, video: event.target.value }))
            }
            className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-cyan-500"
          />
        </label>
        <label className="block md:col-span-2">
          <span className="mb-1 block text-sm font-medium text-slate-700">
            Additional Image URLs (comma separated)
          </span>
          <textarea
            value={form.imagesCsv}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, imagesCsv: event.target.value }))
            }
            className="min-h-[72px] w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500"
            placeholder="https://.../img1.jpg, https://.../img2.jpg"
          />
        </label>
        <div className="md:col-span-2 mt-2 text-xs font-semibold uppercase tracking-wide text-cyan-700">
          Category & inventory
        </div>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">
            Category
          </span>
          <input
            type="text"
            value={form.category}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, category: event.target.value }))
            }
            className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-cyan-500"
            required
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">
            Sub Category
          </span>
          <input
            type="text"
            value={form.subCategory}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, subCategory: event.target.value }))
            }
            className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-cyan-500"
          />
        </label>
        <label className="block md:col-span-2">
          <span className="mb-1 block text-sm font-medium text-slate-700">
            Tags (comma separated)
          </span>
          <input
            type="text"
            value={form.tags}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, tags: event.target.value }))
            }
            className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-cyan-500"
            placeholder="health, wearable, emergency"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Stock</span>
          <input
            type="number"
            min="0"
            value={form.stock}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, stock: event.target.value }))
            }
            className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-cyan-500"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">
            Availability
          </span>
          <select
            value={form.availability}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, availability: event.target.value }))
            }
            className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-cyan-500"
          >
            {["IN_STOCK", "LOW_STOCK", "OUT_OF_STOCK", "PREORDER"].map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </label>
        <div className="md:col-span-2 mt-2 text-xs font-semibold uppercase tracking-wide text-cyan-700">
          Extra info
        </div>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Brand</span>
          <input
            type="text"
            value={form.brand}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, brand: event.target.value }))
            }
            className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-cyan-500"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">SKU</span>
          <input
            type="text"
            value={form.sku}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, sku: event.target.value }))
            }
            className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm uppercase outline-none focus:border-cyan-500"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">
            Expiry Date
          </span>
          <input
            type="date"
            value={form.expiryDate}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, expiryDate: event.target.value }))
            }
            className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-cyan-500"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">
            Prescription Required
          </span>
          <select
            value={form.prescriptionRequired ? "true" : "false"}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                prescriptionRequired: event.target.value === "true",
              }))
            }
            className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-cyan-500"
          >
            <option value="false">No</option>
            <option value="true">Yes</option>
          </select>
        </label>
        <label className="block md:col-span-2">
          <span className="mb-1 block text-sm font-medium text-slate-700">
            Custom Fields (JSON array of {`{ key, value }`})
          </span>
          <textarea
            value={form.customFieldsJson}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, customFieldsJson: event.target.value }))
            }
            className="min-h-[90px] w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs outline-none focus:border-cyan-500"
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
                placeholder="IN, US"
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
                placeholder="MAHARASHTRA, TEXAS"
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
        <label className="block md:col-span-2">
          <span className="mb-1 block text-sm font-medium text-slate-700">
            Status
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
            <option value="false">Inactive</option>
          </select>
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
            disabled={isSubmitting}
            className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Saving..." : mode === "edit" ? "Update Product" : "Create Product"}
          </button>
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="fixed bottom-6 right-6 rounded-full bg-cyan-600 px-5 py-3 text-sm font-semibold text-white shadow-xl hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Saving..." : "Save Product"}
        </button>
      </form>
    </div>
  </div>
);

const SuperAdminProductsPage = () => {
  const [products, setProducts] = useState([]);
  const [publicProducts, setPublicProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPublicLoading, setIsPublicLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [form, setForm] = useState(emptyProductForm);
  const [modalMode, setModalMode] = useState(null);
  const [editingId, setEditingId] = useState(null);

  const parseCsvList = (value) =>
    String(value || "")
      .split(",")
      .map((entry) => entry.trim().toUpperCase())
      .filter(Boolean);

  const sanitizeRichText = (value) =>
    String(value || "")
      .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
      .replace(/\son\w+\s*=\s*(['"]).*?\1/gi, "")
      .replace(/javascript:/gi, "")
      .trim();

  const loadProducts = async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await fetchProducts(categoryFilter.trim());
      setProducts(response?.products || []);
    } catch (err) {
      setError(err.message || "Failed to fetch products.");
    } finally {
      setIsLoading(false);
    }
  };

  const loadPublicProducts = async () => {
    setIsPublicLoading(true);
    try {
      const response = await fetchPublicProducts({});
      setPublicProducts(response?.products || []);
    } catch {
      setPublicProducts([]);
    } finally {
      setIsPublicLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
    loadPublicProducts();
  }, []);

  const openCreateModal = () => {
    setModalMode("create");
    setEditingId(null);
    setForm(emptyProductForm);
  };

  const openEditModal = (product) => {
    setModalMode("edit");
    setEditingId(product._id);
    setForm({
      name: product.name || "",
      shortDescription: product.shortDescription || product.description || "",
      fullDescription: product.fullDescription || "",
      mrp: product.mrp ?? product.price ?? "",
      sellingPrice: product.sellingPrice ?? product.price ?? "",
      imageUrl: product.imageUrl || "",
      imageKey: product.imageKey || "",
      thumbnail: product.media?.thumbnail || "",
      imagesCsv: Array.isArray(product.media?.images)
        ? product.media.images.join(", ")
        : "",
      video: product.media?.video || "",
      category: product.category || "",
      subCategory: product.subCategory || "",
      tags: Array.isArray(product.tags) ? product.tags.join(", ") : "",
      stock: product.inventory?.stock ?? "",
      availability: product.inventory?.availability || "IN_STOCK",
      brand: product.brand || "",
      sku: product.sku || "",
      expiryDate: product.expiryDate
        ? new Date(product.expiryDate).toISOString().slice(0, 10)
        : "",
      prescriptionRequired: product.prescriptionRequired === true,
      customFieldsJson: JSON.stringify(product.customFields || [], null, 2),
      geoScope: product.geoScope || "GLOBAL",
      targetCountries: Array.isArray(product.targetCountries)
        ? product.targetCountries.join(", ")
        : "",
      targetStates: Array.isArray(product.targetStates)
        ? product.targetStates.join(", ")
        : "",
      targetRegions: Array.isArray(product.targetRegions)
        ? product.targetRegions.join(", ")
        : "",
      isActive: product.isActive !== false,
    });
  };

  const closeModal = () => {
    setModalMode(null);
    setEditingId(null);
    setForm(emptyProductForm);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");
    try {
      let customFields = [];
      try {
        customFields = JSON.parse(form.customFieldsJson || "[]");
        if (!Array.isArray(customFields)) customFields = [];
      } catch {
        throw new Error("Custom fields must be valid JSON array.");
      }
      const payload = {
        ...form,
        name: form.name.trim(),
        shortDescription: (form.shortDescription || "").trim(),
        fullDescription: sanitizeRichText(form.fullDescription || ""),
        description: (form.shortDescription || "").trim(),
        category: form.category.trim(),
        subCategory: (form.subCategory || "").trim(),
        tags: String(form.tags || "")
          .split(",")
          .map((entry) => entry.trim())
          .filter(Boolean),
        imageUrl: form.imageUrl.trim(),
        imageKey: (form.imageKey || "").trim(),
        media: {
          thumbnail: (form.thumbnail || "").trim(),
          images: String(form.imagesCsv || "")
            .split(",")
            .map((entry) => entry.trim())
            .filter(Boolean),
          video: (form.video || "").trim(),
        },
        geoScope: form.geoScope || "GLOBAL",
        targetCountries:
          form.geoScope === "TARGETED" ? parseCsvList(form.targetCountries) : [],
        targetStates:
          form.geoScope === "TARGETED" ? parseCsvList(form.targetStates) : [],
        targetRegions:
          form.geoScope === "TARGETED" ? parseCsvList(form.targetRegions) : [],
        mrp: Number(form.mrp || 0),
        sellingPrice: Number(form.sellingPrice || 0),
        stock: Number(form.stock || 0),
        availability: form.availability || "IN_STOCK",
        brand: (form.brand || "").trim(),
        sku: (form.sku || "").trim().toUpperCase(),
        expiryDate: form.expiryDate || null,
        prescriptionRequired: form.prescriptionRequired === true,
        customFields,
      };
      if (payload.sellingPrice > payload.mrp && payload.mrp > 0) {
        throw new Error("Selling price cannot be greater than MRP.");
      }
      if (modalMode === "edit" && editingId) {
        await updateProduct(editingId, payload);
      } else {
        await createProduct(payload);
      }
      closeModal();
      await loadProducts();
      await loadPublicProducts();
    } catch (err) {
      setError(err.message || "Failed to save product.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (product) => {
    const confirmed = window.confirm(
      `Delete product "${product.name || "Untitled"}"?`
    );
    if (!confirmed) return;
    setError("");
    try {
      await deleteProduct(product._id);
      await loadProducts();
    } catch (err) {
      setError(err.message || "Failed to delete product.");
    }
  };

  const uniqueCategories = useMemo(() => {
    const categories = new Set();
    products.forEach((product) => {
      if (product.category) categories.add(product.category);
    });
    return Array.from(categories).sort();
  }, [products]);

  return (
    <div className="space-y-6">
      <Panel
        title="Product Management"
        subtitle="Manage dynamic products shown on the /products public page."
        action={
          <div className="flex gap-2">
            <button
              type="button"
              onClick={loadProducts}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Refresh
            </button>
            <button
              type="button"
              onClick={openCreateModal}
              className="rounded-lg bg-cyan-600 px-3 py-2 text-sm font-semibold text-white hover:bg-cyan-700"
            >
              Add Product
            </button>
          </div>
        }
      >
        <div className="mb-4 grid grid-cols-1 gap-2 md:grid-cols-[1fr_auto_auto]">
          <input
            type="text"
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
            placeholder="Filter by category"
            className="h-10 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-cyan-500"
          />
          <button
            type="button"
            onClick={loadProducts}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Apply Filter
          </button>
          <button
            type="button"
            onClick={() => {
              setCategoryFilter("");
              loadProducts();
            }}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Clear
          </button>
        </div>

        {uniqueCategories.length > 0 ? (
          <div className="mb-4 flex flex-wrap gap-2">
            {uniqueCategories.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => {
                  setCategoryFilter(category);
                  setTimeout(() => loadProducts(), 0);
                }}
                className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                {category}
              </button>
            ))}
          </div>
        ) : null}

        <ErrorBanner message={error} className="mb-4" />

        {isLoading ? (
          <InlineLoader label="Loading products..." />
        ) : (
          <Table
            columns={[
              {
                key: "name",
                title: "Product",
                render: (row) => (
                  <div>
                    <p className="font-semibold text-slate-900">{row.name || "-"}</p>
                    <p className="text-xs text-slate-500">{row.category || "-"}</p>
                  </div>
                ),
              },
              {
                key: "price",
                title: "Price",
                render: (row) =>
                  `₹ ${Number(row.sellingPrice ?? row.price ?? 0).toFixed(
                    2
                  )} / MRP ₹ ${Number(row.mrp || 0).toFixed(2)}`,
              },
              {
                key: "imageUrl",
                title: "Image",
                render: (row) =>
                  row.imageUrl ? (
                    <a
                      href={row.imageUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-cyan-700 underline"
                    >
                      View
                    </a>
                  ) : (
                    "-"
                  ),
              },
              {
                key: "geo",
                title: "Availability",
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
                    {row.isActive ? "ACTIVE" : "INACTIVE"}
                  </span>
                ),
              },
              {
                key: "updatedAt",
                title: "Updated",
                render: (row) => (
                  <span className="text-xs text-slate-600">
                    {formatDateTime(row.updatedAt)}
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
            rows={products}
            emptyMessage="No products found."
          />
        )}
      </Panel>

      <Panel
        title="Public Catalog Preview"
        subtitle="These products are currently visible on the public /products page."
      >
        <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Managed</p>
            <p className="mt-1 text-xl font-bold text-slate-900">{products.length}</p>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">Public Active</p>
            <p className="mt-1 text-xl font-bold text-emerald-700">{publicProducts.length}</p>
          </div>
          <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-cyan-600">Categories</p>
            <p className="mt-1 text-xl font-bold text-cyan-700">{uniqueCategories.length}</p>
          </div>
          <div className="rounded-xl border border-violet-200 bg-violet-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-violet-600">Avg Price</p>
            <p className="mt-1 text-xl font-bold text-violet-700">
              ₹{" "}
              {publicProducts.length > 0
                ? (
                    publicProducts.reduce(
                      (sum, item) => sum + Number(item.price || 0),
                      0
                    ) / publicProducts.length
                  ).toFixed(2)
                : "0.00"}
            </p>
          </div>
        </div>

        {isPublicLoading ? (
          <InlineLoader label="Loading public catalog..." />
        ) : publicProducts.length === 0 ? (
          <p className="text-sm text-slate-600">
            No active products are live yet. Activate products to make them visible on `/products`.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {publicProducts.map((product) => (
              <div
                key={product._id}
                className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
              >
                <div className="h-36 w-full bg-slate-100">
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.name || "Product image"}
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </div>
                <div className="space-y-2 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="truncate text-sm font-semibold text-slate-900">
                      {product.name || "Untitled"}
                    </h4>
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                      ₹ {Number(product.sellingPrice ?? product.price ?? 0).toFixed(2)}
                    </span>
                  </div>
                  <p className="line-clamp-2 text-xs text-slate-600">
                    {product.shortDescription ||
                      product.description ||
                      "No description"}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    <span className="rounded-full bg-cyan-50 px-2 py-0.5 text-[11px] font-semibold text-cyan-700">
                      {product.category || "General"}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        product.geoScope === "TARGETED"
                          ? "bg-amber-50 text-amber-700"
                          : "bg-emerald-50 text-emerald-700"
                      }`}
                    >
                      {product.geoScope || "GLOBAL"}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      {modalMode ? (
        <ProductFormModal
          mode={modalMode}
          form={form}
          setForm={setForm}
          onClose={closeModal}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
        />
      ) : null}
    </div>
  );
};

export default SuperAdminProductsPage;
