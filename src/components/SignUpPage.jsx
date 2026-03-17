import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, Shield, User, Phone, Mail, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';


const SignUpPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    mobile: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { signup, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const googleBtnRef = useRef(null);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    try {
      const result = await signup(formData.name, formData.email, formData.mobile, formData.password);
      if (result.success) {
        navigate('/dashboard');
      } else {
        setError(result.error || 'Registration failed');
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!window.google) return;
    try {
      const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID || window.__GOOGLE_CLIENT_ID__;
      if (!clientId) return;
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async (response) => {
          const idToken = response.credential;
          const result = await loginWithGoogle(idToken);
          if (result.success) {
            navigate('/dashboard');
          } else {
            alert(result.error || 'Google signup failed');
          }
        },
        auto_select: false,
        cancel_on_tap_outside: true,
        context: 'signup'
      });
      if (googleBtnRef.current) {
        window.google.accounts.id.renderButton(googleBtnRef.current, {
          theme: 'outline',
          size: 'large',
          type: 'standard',
          shape: 'pill',
          text: 'signup_with',
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
        background: `radial-gradient(circle at 20% 30%, rgba(13,148,136,0.12), transparent 50%), linear-gradient(135deg, #F8FAFC 0%, #E6FFFA 100%)`
      }}
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
        className="group absolute top-8 left-8 flex items-center gap-2 text-[#64748B] hover:text-[#0D9488] transition-all duration-300 font-semibold z-20"
      >
        <div className="bg-white/60 backdrop-blur-md p-2.5 rounded-full border border-[#E2E8F0] group-hover:bg-[#0D9488]/10 group-hover:border-[#0D9488]/20 transition-all duration-300 shadow-sm">
          <ArrowLeft className="w-4 h-4" />
        </div>
        <span className="text-sm">Back to Home</span>
      </motion.button>

      {/* Soft floating glow behind card */}
      <motion.div
        animate={{ scale: [1, 1.1, 1], opacity: [0.2, 0.3, 0.2] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute w-[600px] h-[600px] bg-[#0EA5A4]/10 rounded-full blur-[100px] pointer-events-none z-[0]"
      />

      <div className="w-full max-w-[450px] relative z-10 flex flex-col items-center">

        {/* Branding Section */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-center mb-8 flex flex-col items-center"
        >
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#0EA5A4]/10 border border-[#0EA5A4]/20 mb-6 mx-auto">
            <Shield className="w-3.5 h-3.5 text-[#0EA5A4]" />
            <span className="text-[11px] font-[800] uppercase tracking-[0.1em] text-[#0EA5A4]">Create Doctor Account</span>
          </div>

          <h2 className="text-3xl font-[900] tracking-tight text-[#0F172A] mb-2">
            Medical <span className="bg-gradient-to-r from-[#0D9488] to-[#0EA5E9] bg-clip-text text-transparent">Vault</span>
          </h2>
          <p className="text-[15px] text-[#475569] font-medium">
            Create your secure doctor account
          </p>
        </motion.div>

        {/* Signup Form Card */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: "easeOut", delay: 0.2 }}
          className="bg-white/80 backdrop-blur-[12px] border border-[#E2E8F0]/80 shadow-[0_25px_60px_rgba(15,23,42,0.12)] rounded-[24px] p-8 md:p-10 w-full"
        >
          <form className="space-y-4" onSubmit={handleSubmit}>

            {/* Full Name */}
            <div>
              <label htmlFor="name" className="block text-[13px] font-[600] text-[#475569] mb-1.5 ml-1">
                Full Name
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <User className="h-[18px] w-[18px] text-[#94A3B8] transition-colors group-focus-within:text-[#0D9488]" />
                </div>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className="block w-full pl-[40px] pr-4 py-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-[12px] text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#0D9488] focus:ring-[4px] focus:ring-[#0EA5A4]/15 transition-all duration-300 font-medium"
                  placeholder="Dr. John Doe"
                />
              </div>
            </div>

            {/* Email Address */}
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
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="block w-full pl-[40px] pr-4 py-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-[12px] text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#0D9488] focus:ring-[4px] focus:ring-[#0EA5A4]/15 transition-all duration-300 font-medium"
                  placeholder="doctor@medicalvault.com"
                />
              </div>
            </div>

            {/* Mobile Number */}
            <div>
              <label htmlFor="mobile" className="block text-[13px] font-[600] text-[#475569] mb-1.5 ml-1">
                Mobile Number
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Phone className="h-[18px] w-[18px] text-[#94A3B8] transition-colors group-focus-within:text-[#0D9488]" />
                </div>
                <input
                  id="mobile"
                  name="mobile"
                  type="tel"
                  required
                  value={formData.mobile}
                  onChange={handleChange}
                  className="block w-full pl-[40px] pr-4 py-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-[12px] text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#0D9488] focus:ring-[4px] focus:ring-[#0EA5A4]/15 transition-all duration-300 font-medium"
                  placeholder="+1 (555) 000-0000"
                />
              </div>
            </div>

            {/* Password */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="password" className="block text-[13px] font-[600] text-[#475569] mb-1.5 ml-1">
                  Password
                </label>
                <div className="relative group">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={formData.password}
                    onChange={handleChange}
                    className="block w-full px-4 py-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-[12px] text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#0D9488] focus:ring-[4px] focus:ring-[#0EA5A4]/15 transition-all duration-300 font-medium"
                    placeholder="••••••••"
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
              <div>
                <label htmlFor="confirmPassword" className="block text-[13px] font-[600] text-[#475569] mb-1.5 ml-1">
                  Confirm
                </label>
                <div className="relative group">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="block w-full px-4 py-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-[12px] text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#0D9488] focus:ring-[4px] focus:ring-[#0EA5A4]/15 transition-all duration-300 font-medium"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center outline-none"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-[18px] w-[18px] text-[#94A3B8] hover:text-[#0D9488] transition-colors" />
                    ) : (
                      <Eye className="h-[18px] w-[18px] text-[#94A3B8] hover:text-[#0D9488] transition-colors" />
                    )}
                  </button>
                </div>
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
              className="w-full flex justify-center items-center py-3.5 px-4 rounded-[12px] text-white bg-[#0D9488] hover:bg-[#0F766E] shadow-[0_10px_25px_rgba(13,148,136,0.25)] transition-colors duration-300 font-[700] text-[15px] disabled:opacity-70 disabled:cursor-not-allowed mt-4"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                'Create Account'
              )}
            </motion.button>
          </form>

          {/* Divider */}
          <div className="mt-7 flex items-center">
            <div className="flex-1 border-t border-[#E2E8F0]"></div>
            <span className="px-3 text-[12px] font-medium text-[#94A3B8] uppercase tracking-wider">Or</span>
            <div className="flex-1 border-t border-[#E2E8F0]"></div>
          </div>

          {/* Google Sign-Up */}
          <div className="mt-6 flex justify-center">
            <div ref={googleBtnRef} />
          </div>

          {/* Login Link */}
          <div className="mt-8 text-center">
            <p className="text-[14px] text-[#475569] font-medium">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="font-[700] text-[#0D9488] hover:text-[#0F766E] transition-colors ml-1 hover:underline underline-offset-4"
              >
                Sign in
              </button>
            </p>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default SignUpPage;
