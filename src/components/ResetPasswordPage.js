import React, { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

const API_BASE = process.env.REACT_APP_API_BASE || "https://backend-medicalvault.onrender.com";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = useMemo(() => searchParams.get("token") || "", [searchParams]);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setIsError(false);

    if (!token) {
      setIsError(true);
      setMessage("Invalid reset link. Please request a new one.");
      return;
    }
    if (password.length < 6) {
      setIsError(true);
      setMessage("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setIsError(true);
      setMessage("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
      });
      const data = await res.json();
      if (data?.success) {
        setMessage("Password reset successful. Redirecting to login...");
        setTimeout(() => navigate("/login", { replace: true }), 1200);
      } else {
        setIsError(true);
        setMessage(data?.message || "Failed to reset password.");
      }
    } catch (err) {
      setIsError(true);
      setMessage("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-slate-900 shadow-xl rounded-xl p-6 sm:p-8 border border-slate-200/60 dark:border-slate-800/60">
          <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-white">Reset your password</h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400 text-sm">
            Enter a new password for your account.
          </p>

          {!token && (
            <div className="mt-4 text-sm text-rose-600 dark:text-rose-400">
              Invalid reset link. Please request a new one.
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">New password</label>
              <input
                type="password"
                className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Confirm password</label>
              <input
                type="password"
                className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                minLength={6}
                required
              />
            </div>

            <button
              type="submit"
              disabled={submitting || !token}
              className="w-full inline-flex items-center justify-center rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium h-11 transition-colors"
            >
              {submitting ? "Saving..." : "Set new password"}
            </button>
          </form>

          {message && (
            <div className={`mt-4 text-sm ${isError ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}`}>
              {message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


