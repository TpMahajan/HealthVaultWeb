/* eslint-disable jsx-a11y/anchor-is-valid */
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, Shield, Mail, Lock, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { login, loginWithGoogle } = useAuth(); // ✅ from AuthContext
  const navigate = useNavigate(); // ✅ router navigation
  const googleBtnRef = useRef(null);

  // ✅ Handle form submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      console.log("🚀 LoginPage: Starting login process");
      const result = await login(email, password);
      console.log("📋 LoginPage: Login result:", result);

      if (result.success) {
        console.log("✅ LoginPage: Login successful, navigating to dashboard");
        navigate('/dashboard'); // ✅ redirect to Dashboard
      } else {
        console.log("❌ LoginPage: Login failed:", result.error);
        setError(result.error || 'Invalid email or password');
      }
    } catch (err) {
      console.error("💥 LoginPage: Login error:", err);
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Initialize Google Identity Services button
  useEffect(() => {
    if (!window.google) return;
    try {
      const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID || window.__GOOGLE_CLIENT_ID__;
      if (!clientId) {
        console.warn('Google Client ID not configured');
        return;
      }
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async (response) => {
          const idToken = response.credential;
          const result = await loginWithGoogle(idToken);
          if (result.success) {
            navigate('/');
          } else {
            alert(result.error || 'Google sign-in failed');
          }
        },
        auto_select: false,
        cancel_on_tap_outside: true,
        context: 'signin'
      });
      if (googleBtnRef.current) {
        window.google.accounts.id.renderButton(googleBtnRef.current, {
          theme: 'outline',
          size: 'large',
          type: 'standard',
          shape: 'pill',
          text: 'continue_with',
          logo_alignment: 'left'
        });
      }
    } catch (e) {
      console.warn('Google init failed', e);
    }
  }, [loginWithGoogle, navigate]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
      className="min-h-screen relative flex flex-col justify-center items-center p-4 overflow-hidden"
      style={{
        background: `radial-gradient(circle at 80% 20%, rgba(13,148,136,0.12), transparent 50%), linear-gradient(135deg, #F8FAFC 0%, #E6FFFA 100%)`
      }}
    >
      {/* Back Button */}
      <motion.button
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        onClick={() => navigate('/')}
        className="group absolute top-8 left-8 flex items-center gap-2 text-[#64748B] hover:text-[#0D9488] transition-all duration-300 font-semibold z-20"
      >
        <div className="bg-white/60 backdrop-blur-md p-2.5 rounded-full border border-[#E2E8F0] group-hover:bg-[#0D9488]/10 group-hover:border-[#0D9488]/20 transition-all duration-300 shadow-sm">
          <ArrowLeft className="w-4 h-4" />
        </div>
        <span className="text-sm">Back to Home</span>
      </motion.button>

      {/* Background Grid Pattern */}
      <div
        className="absolute inset-0 z-[0] opacity-[0.03] pointer-events-none mix-blend-multiply"
        style={{
          backgroundImage: `
            linear-gradient(to right, #0EA5A4 1px, transparent 1px),
            linear-gradient(to bottom, #0EA5A4 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px'
        }}
      />

      {/* Soft floating glow behind card */}
      <motion.div
        animate={{ scale: [1, 1.05, 1], opacity: [0.3, 0.4, 0.3] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="absolute w-[500px] h-[500px] bg-[#0EA5A4]/10 rounded-full blur-[80px] pointer-events-none z-[0]"
      />

      <div className="w-full max-w-[420px] relative z-10 flex flex-col items-center">



        {/* Logo and Header */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-center mb-8 flex flex-col items-center"
        >
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#0EA5A4]/10 border border-[#0EA5A4]/20 mb-6 mx-auto">
            <Shield className="w-3.5 h-3.5 text-[#0EA5A4]" />
            <span className="text-[11px] font-[800] uppercase tracking-[0.1em] text-[#0EA5A4]">Secure Access Portal</span>
          </div>

          <h2 className="text-3xl font-[900] tracking-tight text-[#0F172A] mb-2">
            Medical <span className="bg-gradient-to-r from-[#0D9488] to-[#0EA5E9] bg-clip-text text-transparent">Vault</span>
          </h2>
          <p className="text-[15px] text-[#475569] font-medium">
            Secure Doctor Portal Access
          </p>
        </motion.div>

        {/* Login Form Card */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: "easeOut", delay: 0.2 }}
          className="bg-white/80 backdrop-blur-[12px] border border-[#E2E8F0]/80 shadow-[0_25px_60px_rgba(15,23,42,0.12)] rounded-[24px] p-8 md:p-10 w-full"
        >
          {/* Role Selection */}
          <div className="flex p-1 gap-1 bg-[#F1F5F9] rounded-[14px] mb-8">
            <button
              onClick={() => navigate('/login')}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-[11px] font-[700] text-[14px] bg-[#0D9488] text-white shadow-[0_4px_12px_rgba(13,148,136,0.2)] transition-colors duration-200"
            >
              <Mail className="w-4 h-4" />
              Doctor
            </button>
            <button
              onClick={() => navigate('/admin/login')}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-[11px] font-[700] text-[14px] text-[#475569] hover:bg-[#E2E8F0] transition-colors duration-200"
            >
              <Shield className="w-4 h-4" />
              Admin
            </button>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-[13px] font-[600] text-[#475569] mb-1.5 ml-1">
                Email Address
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Mail className="h-[18px] w-[18px] text-[#94A3B8] transition-colors group-focus-within:text-[#0D9488]" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-[40px] pr-4 py-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-[12px] text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#0D9488] focus:ring-[4px] focus:ring-[#0EA5A4]/15 transition-all duration-300 font-medium"
                  placeholder="Enter your email"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-[13px] font-[600] text-[#475569] mb-1.5 ml-1">
                Password
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock className="h-[18px] w-[18px] text-[#94A3B8] transition-colors group-focus-within:text-[#0D9488]" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-[40px] pr-12 py-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-[12px] text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#0D9488] focus:ring-[4px] focus:ring-[#0EA5A4]/15 transition-all duration-300 font-medium"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center outline-none"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-[18px] w-[18px] text-[#94A3B8] hover:text-[#0D9488] transition-colors" />
                  ) : (
                    <Eye className="h-[18px] w-[18px] text-[#94A3B8] hover:text-[#0D9488] transition-colors" />
                  )}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="bg-red-50 border border-red-200/60 rounded-[12px] p-3 text-center">
                <p className="text-[13px] font-medium text-red-600">{error}</p>
              </motion.div>
            )}

            {/* Remember + Forgot */}
            <div className="flex items-center justify-between pt-1 pb-1">
              <div className="flex items-center cursor-pointer">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-[#0EA5A4] focus:ring-[#0EA5A4] border-[#E2E8F0] rounded cursor-pointer transition-colors"
                />
                <label htmlFor="remember-me" className="ml-2 block text-[13px] font-medium text-[#475569] cursor-pointer">
                  Remember me
                </label>
              </div>
              <div className="text-[13px]">
                <Link to="/forgot-password" className="font-[600] text-[#0D9488] hover:text-[#0F766E] transition-colors">
                  Forgot password?
                </Link>
              </div>
            </div>

            {/* Submit Button */}
            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ y: -3 }}
              whileTap={{ scale: 0.98 }}
              className="w-full flex justify-center items-center py-3.5 px-4 rounded-[12px] text-white bg-[#0D9488] hover:bg-[#0F766E] shadow-[0_10px_25px_rgba(13,148,136,0.25)] transition-colors duration-300 font-[700] text-[15px] disabled:opacity-70 disabled:cursor-not-allowed mt-2"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                'Sign In'
              )}
            </motion.button>
          </form>

          {/* Divider */}
          <div className="mt-7 flex items-center">
            <div className="flex-1 border-t border-[#E2E8F0]"></div>
            <span className="px-3 text-[12px] font-medium text-[#94A3B8] uppercase tracking-wider">Or</span>
            <div className="flex-1 border-t border-[#E2E8F0]"></div>
          </div>

          {/* Google Sign-In */}
          <div className="mt-6 flex justify-center">
            <div ref={googleBtnRef} />
          </div>

          {/* Signup Link */}
          <div className="mt-8 text-center">
            <p className="text-[14px] text-[#64748B] font-medium">
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => navigate('/signup')}
                className="font-[700] text-[#0D9488] hover:text-[#0F766E] transition-colors ml-1"
              >
                Sign up
              </button>
            </p>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default LoginPage;
