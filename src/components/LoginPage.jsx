/* eslint-disable jsx-a11y/anchor-is-valid */
import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, Shield, Mail, Lock, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { GOOGLE_CLIENT_ID } from '../constants/api';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const googleBtnRef = useRef(null);
  const gsiInitializedRef = useRef(false);

  const resolvePostLoginPath = () => {
    const params = new URLSearchParams(location.search || '');
    const rawNext = String(params.get('next') || '').trim();
    if (!rawNext.startsWith('/') || rawNext.startsWith('//')) {
      return '/dashboard';
    }
    return rawNext;
  };

  useEffect(() => {
    try {
      const notice = window.sessionStorage.getItem('forced_logout_notice');
      if (notice) {
        setError(notice);
        window.sessionStorage.removeItem('forced_logout_notice');
      }
    } catch {
      // Ignore unavailable sessionStorage.
    }
  }, []);

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
        navigate(resolvePostLoginPath());
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
    if (gsiInitializedRef.current) return;
    try {
      const clientId = GOOGLE_CLIENT_ID;
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
            navigate(resolvePostLoginPath());
          } else {
            alert(result.error || 'Google sign-in failed');
          }
        },
        auto_select: false,
        cancel_on_tap_outside: true,
        context: 'signin'
      });
      gsiInitializedRef.current = true;
      if (googleBtnRef.current) {
        googleBtnRef.current.innerHTML = '';
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
  }, [location.search, loginWithGoogle, navigate]);

  return (
    // ✅ Force light mode — this wrapper prevents the global `dark` class on <html>
    // from affecting dark: variants. The login page always stays in light mode.
    <div style={{ colorScheme: 'light', backgroundColor: 'transparent' }}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        style={{ colorScheme: 'light' }}
        className="min-h-screen relative flex flex-col justify-center items-center p-4 overflow-hidden"
        data-theme="light"
      >
        {/* Solid light background — not affected by dark mode */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(135deg, #F8FAFC 0%, #F0F9FF 50%, #ECFEFF 100%)',
            zIndex: 0,
          }}
        />

        {/* Background Grid Pattern */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 1,
            opacity: 0.03,
            pointerEvents: 'none',
            backgroundImage: `
              linear-gradient(to right, #0EA5A4 1px, transparent 1px),
              linear-gradient(to bottom, #0EA5A4 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px',
          }}
        />

        {/* Soft floating glow behind card */}
        <motion.div
          animate={{ scale: [1, 1.05, 1], opacity: [0.3, 0.4, 0.3] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            position: 'absolute',
            width: 500,
            height: 500,
            background: 'rgba(14, 165, 164, 0.10)',
            borderRadius: '50%',
            filter: 'blur(80px)',
            pointerEvents: 'none',
            zIndex: 1,
          }}
        />

        {/* Back Button */}
        <motion.button
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          onClick={() => navigate('/')}
          style={{
            position: 'absolute',
            top: 32,
            left: 32,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            color: '#64748B',
            fontWeight: 700,
            zIndex: 20,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
          }}
        >
          <div
            style={{
              background: 'rgba(255,255,255,0.6)',
              backdropFilter: 'blur(8px)',
              padding: '10px',
              borderRadius: '50%',
              border: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              transition: 'all 0.3s',
            }}
          >
            <ArrowLeft style={{ width: 16, height: 16 }} />
          </div>
          <span style={{ fontSize: 14 }}>Back to Home</span>
        </motion.button>

        <div style={{ width: '100%', maxWidth: 420, position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

          {/* Logo and Header */}
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            style={{ textAlign: 'center', marginBottom: 32, display: 'flex', flexDirection: 'column', alignItems: 'center' }}
          >
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 14px',
                borderRadius: 9999,
                background: 'rgba(14, 165, 164, 0.10)',
                border: '1px solid rgba(14, 165, 164, 0.20)',
                marginBottom: 24,
              }}
            >
              <Shield style={{ width: 14, height: 14, color: '#0EA5A4' }} />
              <span style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#0EA5A4' }}>
                Secure Access Portal
              </span>
            </div>

            <h2 style={{ fontSize: 30, fontWeight: 900, letterSpacing: '-0.02em', color: '#0F172A', marginBottom: 8 }}>
              Medical{' '}
              <span style={{ background: 'linear-gradient(to right, #0EA5A4, #22D3EE)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Vault
              </span>
            </h2>
            <p style={{ fontSize: 15, color: '#64748B', fontWeight: 700 }}>
              Secure Doctor Portal Access
            </p>
          </motion.div>

          {/* Login Form Card */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, ease: 'easeOut', delay: 0.2 }}
            style={{
              background: 'rgba(255,255,255,0.85)',
              backdropFilter: 'blur(12px)',
              border: '1px solid #E2E8F0',
              boxShadow: '0 25px 60px rgba(15,23,42,0.12)',
              borderRadius: 24,
              padding: '40px',
              width: '100%',
            }}
          >
            {/* Role Selection */}
            <div
              style={{
                display: 'flex',
                padding: 4,
                gap: 4,
                background: '#F1F5F9',
                borderRadius: 14,
                marginBottom: 32,
              }}
            >
              <button
                onClick={() => navigate('/login')}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: '10px 0',
                  borderRadius: 11,
                  fontWeight: 900,
                  fontSize: 14,
                  background: 'linear-gradient(to right, #0EA5A4, #0891B2)',
                  color: '#fff',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 10px 24px rgba(14,165,164,0.22)',
                }}
              >
                <Mail style={{ width: 16, height: 16 }} />
                Doctor
              </button>
              <button
                onClick={() => navigate('/admin/login')}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: '10px 0',
                  borderRadius: 11,
                  fontWeight: 900,
                  fontSize: 14,
                  color: '#64748B',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                <Shield style={{ width: 16, height: 16 }} />
                Admin
              </button>
            </div>

            <form style={{ display: 'flex', flexDirection: 'column', gap: 20 }} onSubmit={handleSubmit}>

              {/* Email */}
              <div>
                <label htmlFor="email" style={{ display: 'block', fontSize: 13, fontWeight: 900, color: '#334155', marginBottom: 6, marginLeft: 4 }}>
                  Email Address
                </label>
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, paddingLeft: 14, display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
                    <Mail style={{ height: 18, width: 18, color: '#94A3B8' }} />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{
                      display: 'block',
                      width: '100%',
                      paddingLeft: 40,
                      paddingRight: 16,
                      paddingTop: 12,
                      paddingBottom: 12,
                      background: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      borderRadius: 12,
                      color: '#0F172A',
                      fontSize: 14,
                      fontWeight: 700,
                      outline: 'none',
                      boxSizing: 'border-box',
                      transition: 'border-color 0.3s, box-shadow 0.3s',
                    }}
                    placeholder="Enter your email"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" style={{ display: 'block', fontSize: 13, fontWeight: 900, color: '#334155', marginBottom: 6, marginLeft: 4 }}>
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, paddingLeft: 14, display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
                    <Lock style={{ height: 18, width: 18, color: '#94A3B8' }} />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{
                      display: 'block',
                      width: '100%',
                      paddingLeft: 40,
                      paddingRight: 48,
                      paddingTop: 12,
                      paddingBottom: 12,
                      background: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      borderRadius: 12,
                      color: '#0F172A',
                      fontSize: 14,
                      fontWeight: 700,
                      outline: 'none',
                      boxSizing: 'border-box',
                      transition: 'border-color 0.3s, box-shadow 0.3s',
                    }}
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    style={{ position: 'absolute', top: 0, bottom: 0, right: 0, paddingRight: 14, display: 'flex', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer' }}
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff style={{ height: 18, width: 18, color: '#94A3B8' }} />
                    ) : (
                      <Eye style={{ height: 18, width: 18, color: '#94A3B8' }} />
                    )}
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{ background: '#FEF2F2', border: '1px solid rgba(254,202,202,0.6)', borderRadius: 12, padding: '12px 16px', textAlign: 'center' }}
                >
                  <p style={{ fontSize: 13, fontWeight: 500, color: '#DC2626' }}>{error}</p>
                </motion.div>
              )}

              {/* Remember + Forgot */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    style={{ height: 16, width: 16, accentColor: '#0EA5A4', borderRadius: 4, cursor: 'pointer' }}
                  />
                  <label htmlFor="remember-me" style={{ marginLeft: 8, fontSize: 13, fontWeight: 700, color: '#64748B', cursor: 'pointer' }}>
                    Remember me
                  </label>
                </div>
                <div>
                  <Link to="/forgot-password" style={{ fontSize: 13, fontWeight: 900, color: '#0EA5A4', textDecoration: 'none' }}>
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
                style={{
                  width: '100%',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  padding: '16px',
                  borderRadius: 12,
                  color: '#fff',
                  background: 'linear-gradient(to right, #0EA5A4, #0891B2)',
                  boxShadow: '0 12px 32px rgba(14,165,164,0.35)',
                  border: 'none',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontWeight: 900,
                  fontSize: 15,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  marginTop: 8,
                  opacity: loading ? 0.7 : 1,
                  transition: 'all 0.3s',
                }}
              >
                {loading ? (
                  <div style={{ width: 20, height: 20, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                ) : (
                  'Login'
                )}
              </motion.button>
            </form>

            {/* Divider */}
            <div style={{ marginTop: 28, display: 'flex', alignItems: 'center' }}>
              <div style={{ flex: 1, borderTop: '1px solid #E2E8F0' }} />
              <span style={{ padding: '0 12px', fontSize: 12, fontWeight: 500, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Or</span>
              <div style={{ flex: 1, borderTop: '1px solid #E2E8F0' }} />
            </div>

            {/* Google Sign-In */}
            <div style={{ marginTop: 24, display: 'flex', justifyContent: 'center' }}>
              <div ref={googleBtnRef} />
            </div>

            {/* Signup Link */}
            <div style={{ marginTop: 32, textAlign: 'center' }}>
              <p style={{ fontSize: 14, color: '#64748B', fontWeight: 500 }}>
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => navigate('/signup')}
                  style={{ fontWeight: 700, color: '#0D9488', background: 'none', border: 'none', cursor: 'pointer', marginLeft: 4, fontSize: 14 }}
                >
                  Sign up
                </button>
              </p>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export default LoginPage;
