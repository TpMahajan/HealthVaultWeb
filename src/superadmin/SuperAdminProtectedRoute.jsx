import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import {
  clearSuperAdminSession,
  hasValidSuperAdminSession,
  superAdminMe,
} from "./api";

const LoadingScreen = () => (
  <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
    <div className="max-w-sm w-full rounded-2xl bg-white border border-slate-200 shadow-sm p-6 text-center">
      <div className="mx-auto h-10 w-10 rounded-full border-2 border-slate-300 border-t-cyan-600 animate-spin" />
      <h2 className="mt-4 text-lg font-semibold text-slate-900">
        Verifying SuperAdmin Session
      </h2>
      <p className="mt-1 text-sm text-slate-600">
        Please wait while we secure your dashboard.
      </p>
    </div>
  </div>
);

const SuperAdminProtectedRoute = ({ children }) => {
  const [isChecking, setIsChecking] = useState(true);
  const [isAllowed, setIsAllowed] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const validate = async () => {
      if (!hasValidSuperAdminSession()) {
        clearSuperAdminSession();
        if (!isMounted) return;
        setIsAllowed(false);
        setIsChecking(false);
        return;
      }

      try {
        await superAdminMe();
        if (!isMounted) return;
        setIsAllowed(true);
      } catch {
        clearSuperAdminSession();
        if (!isMounted) return;
        setIsAllowed(false);
      } finally {
        if (isMounted) setIsChecking(false);
      }
    };

    validate();

    return () => {
      isMounted = false;
    };
  }, []);

  if (isChecking) return <LoadingScreen />;
  if (!isAllowed) return <Navigate to="/superadmin/login" replace />;
  return children;
};

export default SuperAdminProtectedRoute;
