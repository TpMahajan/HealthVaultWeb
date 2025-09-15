import React from "react";
import { useNavigate } from "react-router-dom";
import { Shield } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import Footer from "./Footer";

const WelcomePage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex flex-col justify-center items-center p-4">
      <div className="text-center max-w-lg">
        {/* Logo */}
        <div className="mx-auto h-20 w-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
          <Shield className="h-10 w-10 text-white" />
        </div>
        <h1 className="mt-6 text-4xl font-bold text-gray-900 dark:text-gray-100 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Welcome to HealthVault
        </h1>
        <p className="mt-3 text-gray-600 dark:text-gray-300 text-sm">
          Secure platform for doctors to manage patient health records safely.
        </p>

        {isAuthenticated ? (
          /* Logged in state */
          <div className="mt-10">
            <p className="text-lg text-gray-700 dark:text-gray-300 mb-6">
              Welcome back, <span className="font-semibold text-blue-600 dark:text-blue-400">{user?.name}</span>!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => navigate("/dashboard")}
                className="px-6 py-3 text-white text-sm font-medium rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg transition-all"
              >
                Go to Dashboard
              </button>
              <button
                onClick={() => navigate("/scan")}
                className="px-6 py-3 text-blue-600 text-sm font-medium rounded-xl border border-blue-600 bg-white hover:bg-blue-50 shadow transition-all"
              >
                Scan QR Code
              </button>
            </div>
          </div>
        ) : (
          /* Not logged in state */
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate("/login")}
              className="px-6 py-3 text-white text-sm font-medium rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg transition-all"
            >
              Login
            </button>
            <button
              onClick={() => navigate("/signup")}
              className="px-6 py-3 text-blue-600 text-sm font-medium rounded-xl border border-blue-600 bg-white hover:bg-blue-50 shadow transition-all"
            >
              Signup
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default WelcomePage;
