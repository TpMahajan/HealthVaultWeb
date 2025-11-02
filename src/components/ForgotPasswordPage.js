import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE = process.env.REACT_APP_API_BASE || "https://backend-medicalvault.onrender.com";

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setIsError(false);
    if (!email) {
      setIsError(true);
      setMessage("Please enter your email");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(data?.message || "If your email exists, a reset link has been sent.");
        setTimeout(() => navigate("/login", { replace: true }), 1200);
      } else {
        setIsError(true);
        setMessage(data?.message || "Failed to send reset email.");
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
          <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-white">Forgot password</h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400 text-sm">
            Enter your account email. We’ll send a reset link if it exists.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Email</label>
              <input
                type="email"
                className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full inline-flex items-center justify-center rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium h-11 transition-colors"
            >
              {submitting ? "Sending..." : "Send reset link"}
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


