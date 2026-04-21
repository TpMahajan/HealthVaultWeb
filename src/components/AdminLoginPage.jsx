import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Shield, Mail, Lock } from 'lucide-react';
import { API_BASE } from '../constants/api';
import { clearSuperAdminSession, setSuperAdminSession } from '../superadmin/api';
import { setAdminSession } from '../context/AdminAuthContext';


const AdminLoginPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    try {
      const notice = window.sessionStorage.getItem('forced_logout_notice');
      if (notice) {
        setError(notice);
        window.sessionStorage.removeItem('forced_logout_notice');
      }
    } catch {
      // Ignore sessionStorage errors.
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const payload = {
        email: String(email || '').trim().toLowerCase(),
        password: String(password || ''),
      };
      const adminRes = await fetch(`${API_BASE}/admin/login`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const adminData = await adminRes.json().catch(() => ({}));
      if (adminRes.ok && adminData?.success && adminData?.token) {
        clearSuperAdminSession();
        setAdminSession({ token: adminData.token, admin: adminData.admin || null });
        navigate('/admin/dashboard');
        return;
      }

      const shouldTrySuperAdmin = adminRes.status === 401;
      if (!shouldTrySuperAdmin) {
        setError(adminData?.message || 'Login failed');
        return;
      }

      const superRes = await fetch(`${API_BASE}/superadmin/auth/login`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const superData = await superRes.json().catch(() => ({}));
      if (superRes.ok && superData?.success && superData?.token) {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('mv_admin_auth');
        window.dispatchEvent(new Event('mv-admin-auth-sync'));
        setSuperAdminSession(superData.token, superData.user || {});
        navigate('/superadmin', { replace: true });
        return;
      }

      setError(superData?.message || adminData?.message || 'Invalid email or password');
    } catch (e) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
      className="min-h-screen relative flex flex-col justify-center items-center p-4 overflow-hidden bg-gradient-to-br from-[#F8FAFC] via-[#F0F9FF] to-[#ECFEFF] dark:from-[#0f172a] dark:via-[#111827] dark:to-[#0b1120]"
    >
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

      {/* Back Button */}
      <motion.button
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        onClick={() => navigate('/')}
        className="group absolute top-8 left-8 flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-[#0EA5A4] transition-all duration-300 font-bold z-20"
      >
        <div className="bg-white/60 dark:bg-white/5 backdrop-blur-md p-2.5 rounded-full border border-slate-200 dark:border-white/10 group-hover:bg-[#0EA5A4]/10 group-hover:border-[#0EA5A4]/20 transition-all duration-300 shadow-sm">
          <ArrowLeft className="w-4 h-4" />
        </div>
        <span className="text-sm">Back to Home</span>
      </motion.button>

      {/* Admin Glow Overlay */}
      <div className="absolute inset-0 bg-[#0EA5A4]/[0.02] dark:bg-[#22D3EE]/[0.03] pointer-events-none z-[0]" />

      {/* Soft floating glow behind card */}
      <motion.div
        animate={{ scale: [1, 1.05, 1], opacity: [0.3, 0.4, 0.3] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="absolute w-[500px] h-[500px] bg-[#0EA5A4]/10 dark:bg-[#22D3EE]/10 rounded-full blur-[80px] pointer-events-none z-[0]"
      />

      <div className="w-full max-w-[420px] relative z-10 flex flex-col items-center">

        {/* Branding Section */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-center mb-8 flex flex-col items-center"
        >
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#0EA5A4]/10 dark:bg-white/5 border border-[#0EA5A4]/20 dark:border-white/10 mb-6 mx-auto backdrop-blur-sm">
            <Shield className="w-3.5 h-3.5 text-[#0EA5A4] dark:text-[#67E8F9]" />
            <span className="text-[11px] font-black uppercase tracking-[0.1em] text-[#0EA5A4] dark:text-[#67E8F9]">Admin Secure Access</span>
          </div>

          <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white mb-2">
            Admin <span className="bg-gradient-to-r from-[#0EA5A4] to-[#22D3EE] bg-clip-text text-transparent">Login</span>
          </h2>
          <p className="text-[15px] text-slate-500 dark:text-slate-400 font-bold">
            Enter Admin or SuperAdmin credentials to continue.
          </p>
        </motion.div>

        {/* Login Form Card */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: "easeOut", delay: 0.2 }}
          className="bg-white/85 dark:bg-white/5 backdrop-blur-[14px] border border-slate-200 dark:border-white/10 shadow-[0_30px_70px_rgba(15,23,42,0.15)] rounded-[24px] p-8 md:p-10 w-full"
        >
          {/* Role Selection */}
          <div className="flex p-1 gap-1 bg-slate-100 dark:bg-white/5 rounded-[14px] mb-8">
            <button
              onClick={() => navigate('/login')}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-[11px] font-black text-[14px] text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/5 transition-colors duration-200"
            >
              <Mail className="w-4 h-4" />
              Doctor
            </button>
            <button
              onClick={() => navigate('/admin/login')}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-[11px] font-black text-[14px] bg-gradient-to-r from-[#0EA5A4] to-[#0891B2] text-white shadow-[0_10px_24px_rgba(14,165,164,0.22)] transition-colors duration-200"
            >
              <Shield className="w-4 h-4" />
              Admin
            </button>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-[13px] font-black text-slate-700 dark:text-slate-300 mb-1.5 ml-1">
                Admin Email
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Mail className="h-[18px] w-[18px] text-slate-400 transition-colors group-focus-within:text-[#0EA5A4]" />
                </div>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-[40px] pr-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-[12px] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#0EA5A4] focus:ring-[4px] focus:ring-[#0EA5A4]/15 transition-all duration-300 font-bold"
                  placeholder="admin@medicalvault.com"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-[13px] font-black text-slate-700 dark:text-slate-300 mb-1.5 ml-1">
                Password
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock className="h-[18px] w-[18px] text-slate-400 transition-colors group-focus-within:text-[#0EA5A4]" />
                </div>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-[40px] pr-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-[12px] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#0EA5A4] focus:ring-[4px] focus:ring-[#0EA5A4]/15 transition-all duration-300 font-bold"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="bg-red-50 border border-red-200/60 rounded-[12px] p-3 text-center">
                <p className="text-[13px] font-medium text-red-600">{error}</p>
              </motion.div>
            )}

            {/* Submit Button */}
            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ y: -3 }}
              whileTap={{ scale: 0.98 }}
              className="w-full flex justify-center items-center py-4 px-4 rounded-[12px] text-white bg-gradient-to-r from-[#0EA5A4] to-[#0891B2] shadow-[0_12px_32px_rgba(14,165,164,0.35)] hover:shadow-[0_16px_36px_rgba(14,165,164,0.4)] transition-all duration-300 font-black text-[15px] disabled:opacity-70 disabled:cursor-not-allowed mt-2 uppercase tracking-widest"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                'Login to Panel'
              )}
            </motion.button>
          </form>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default AdminLoginPage;


