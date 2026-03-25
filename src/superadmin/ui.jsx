import React from "react";
import { formatDateTimeInSelectedTimeZone } from "../utils/timezone";

export const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return formatDateTimeInSelectedTimeZone(date);
};

export const InlineLoader = ({ label = "Loading..." }) => (
  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
    {label}
  </div>
);

export const ErrorBanner = ({ message, className = "" }) =>
  message ? (
    <div
      className={`rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 ${className}`}
    >
      {message}
    </div>
  ) : null;

export const Panel = ({ title, subtitle, action, children, className = "" }) => (
  <section
    className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}
  >
    {(title || subtitle || action) && (
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          {title ? (
            <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          ) : null}
          {subtitle ? (
            <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
          ) : null}
        </div>
        {action ? <div>{action}</div> : null}
      </header>
    )}
    {children}
  </section>
);

export const StatusBadge = ({ value }) => {
  const normalized = String(value || "").toUpperCase();
  const className =
    normalized === "ACTIVE"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : "border-rose-200 bg-rose-50 text-rose-700";
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${className}`}
    >
      {normalized || "-"}
    </span>
  );
};

export const Table = ({ columns, rows, emptyMessage = "No data found." }) => (
  <div className="overflow-hidden rounded-xl border border-slate-200">
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
              >
                {column.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {rows.length === 0 ? (
            <tr>
              <td
                className="px-3 py-6 text-center text-sm text-slate-500"
                colSpan={columns.length}
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row, rowIndex) => (
              <tr key={row.id || row._id || rowIndex}>
                {columns.map((column) => (
                  <td key={column.key} className="px-3 py-2 text-sm text-slate-700">
                    {column.render ? column.render(row) : row[column.key] ?? "-"}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  </div>
);
