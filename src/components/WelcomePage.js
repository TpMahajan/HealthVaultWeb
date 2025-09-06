import React from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { Shield } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const WelcomePage = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  // ✅ Already logged in → go directly to Dashboard
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex flex-col justify-center items-center p-4">
      <div className="text-center max-w-lg">
        {/* Logo */}
        <div className="mx-auto h-20 w-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
          <Shield className="h-10 w-10 text-white" />
        </div>
        <h1 className="mt-6 text-4xl font-bold text-gray-900 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Welcome to MediVault
        </h1>
        <p className="mt-3 text-gray-600 text-sm">
          Secure platform for doctors to manage patient health records safely.
        </p>

        {/* Buttons */}
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
      </div>

      {/* Footer */}
      <footer className="w-full py-6 border-t border-gray-200 flex items-center justify-center mt-16">
        <img src="/AiAllyLogo.png" alt="Ai Ally Logo" className="h-6 mr-2" />
        <span className="text-sm text-gray-500">Powered by Ai Ally</span>
      </footer>
    </div>
  );
};

export default WelcomePage;
