import React, { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { HeartPulse, Lock, Mail } from "lucide-react";

import { hasValidSuperAdminSession, superAdminLogin } from "./api";

const SuperAdminLoginPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      const notice = window.sessionStorage.getItem("forced_logout_notice");
      if (notice) {
        setError(notice);
        window.sessionStorage.removeItem("forced_logout_notice");
      }
    } catch {
      // Ignore sessionStorage errors.
    }
  }, []);

  if (hasValidSuperAdminSession()) {
    return <Navigate to="/superadmin" replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      await superAdminLogin(email, password);
      navigate("/superadmin", { replace: true });
    } catch (err) {
      setError(err.message || "Unable to sign in as SuperAdmin.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-cyan-900 px-4 py-10">
      <div className="mx-auto flex min-h-[85vh] w-full max-w-5xl items-center justify-center">
        <div className="grid w-full overflow-hidden rounded-3xl border border-white/20 bg-white/10 shadow-2xl backdrop-blur-xl md:grid-cols-2">
          <div className="hidden bg-gradient-to-br from-cyan-600 to-cyan-400 p-8 text-white md:block">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20">
              <HeartPulse className="h-7 w-7" />
            </div>
            <h1 className="mt-6 text-3xl font-extrabold leading-tight">
              Medical Vault SuperAdmin
            </h1>
            <p className="mt-3 text-sm text-cyan-50/90">
              Securely manage users, ads, products, and app UI controls from a
              single dashboard.
            </p>
          </div>

          <div className="bg-white p-8 md:p-10">
            <h2 className="text-2xl font-bold text-slate-900">
              Sign in to continue
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Use your SuperAdmin credentials.
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">
                  Email
                </span>
                <div className="flex items-center gap-2 rounded-xl border border-slate-300 bg-slate-50 px-3">
                  <Mail className="h-4 w-4 text-slate-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="h-11 w-full bg-transparent text-sm text-slate-900 outline-none"
                    placeholder="superadmin@example.com"
                    required
                  />
                </div>
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">
                  Password
                </span>
                <div className="flex items-center gap-2 rounded-xl border border-slate-300 bg-slate-50 px-3">
                  <Lock className="h-4 w-4 text-slate-500" />
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="h-11 w-full bg-transparent text-sm text-slate-900 outline-none"
                    placeholder="Enter password"
                    required
                  />
                </div>
              </label>

              {error ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-cyan-600 px-4 text-sm font-semibold text-white hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Signing in..." : "Sign In"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminLoginPage;
