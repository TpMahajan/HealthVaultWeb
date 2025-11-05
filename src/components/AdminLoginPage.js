import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE } from '../constants/api';
import Footer from './Footer';

const AdminLoginPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (data.success && data.token) {
        localStorage.setItem('adminToken', data.token);
        navigate('/admin/dashboard');
      } else {
        setError(data.message || 'Login failed');
      }
    } catch (e) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col" style={{ backgroundImage: "url('/BGMast.png')", backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }}>
      <header className="flex items-center justify-between whitespace-nowrap px-4 md:px-10 py-4">
        <div className="flex items-center gap-4 text-\[\#263238\]">
          <div className="h-6 w-6">
            <img src="/app_icon.png" alt="Medical Vault" className="h-full w-full object-contain" />
          </div>
          <h2 className="text-\[\#263238\] text-xl font-bold leading-tight tracking-\[-0.015em\]">Medical Vault</h2>
        </div>
      </header>

      <main className="flex-grow flex items-center justify-center px-4 md:px-10 lg:px-20 xl:px-40 py-8">
        <div className="w-full max-w-md">
          <div className="flex flex-col gap-8 rounded-2xl bg-white/70 backdrop-blur-md p-8 shadow-lg border border-white/30">
            <div className="flex flex-col gap-2 text-center">
              <h1 className="text-2xl font-bold text-\[\#263238\] tracking-tight">Admin Login</h1>
              <p className="text-sm text-gray-500">Enter your credentials to access the admin panel.</p>
            </div>

            <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
              {error && <div className="text-red-600 text-sm">{error}</div>}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="email" className="text-sm font-medium text-\[\#263238\]">Email</label>
                <input
                  id="email"
                  type="email"
                  placeholder="admin@medicalvault.com"
                  className="block w-full rounded-lg border-gray-300 bg-gray-50 px-4 py-2.5 text-base text-\[\#263238\] focus:border-\[\#00796B\] focus:ring-\[\#00796B\]"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="password" className="text-sm font-medium text-\[\#263238\]">Password</label>
                <input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="block w-full rounded-lg border-gray-300 bg-gray-50 px-4 py-2.5 text-base text-\[\#263238\] focus:border-\[\#00796B\] focus:ring-\[\#00796B\]"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center justify-center overflow-hidden rounded-lg h-12 px-6 bg-gradient-to-r from-sky-500 to-sky-600 text-white text-base font-bold tracking-[0.015em] w-full hover:from-sky-600 hover:to-sky-700 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-sky-500 disabled:opacity-70"
              >
                {loading ? 'Logging in...' : 'Login'}
              </button>
            </form>

            <div className="relative flex items-center">
              <div className="flex-grow border-t border-gray-300"></div>
              <span className="flex-shrink mx-4 text-sm text-gray-400">OR</span>
              <div className="flex-grow border-t border-gray-300"></div>
            </div>

            <button
              type="button"
              className="flex items-center justify-center overflow-hidden rounded-lg h-12 px-6 bg-white text-gray-700 border border-gray-300 text-base font-medium w-full hover:bg-gray-50"
            >
              <div className="flex items-center justify-center gap-2">
                <svg className="h-5 w-5" fill="none" height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25C22.56 11.45 22.49 10.68 22.36 9.92H12V14.4H18.12C17.86 15.93 17.06 17.21 15.82 18.03V20.84H19.61C21.57 19.04 22.56 15.93 22.56 12.25Z" fill="#4285F4"></path><path d="M12 23C14.97 23 17.45 22.04 19.61 20.84L15.82 18.03C14.85 18.66 13.54 19.04 12 19.04C9.12 19.04 6.64 17.14 5.77 14.68H1.87V17.57C3.76 20.94 7.54 23 12 23Z" fill="#34A853"></path><path d="M5.77 14.68C5.58 14.11 5.48 13.53 5.48 12.91C5.48 12.29 5.58 11.71 5.77 11.14V8.25H1.87C1.19 9.62 0.81 11.2 0.81 12.91C0.81 14.62 1.19 16.2 1.87 17.57L5.77 14.68Z" fill="#FBBC05"></path><path d="M12 5.08C13.68 5.08 15.08 5.66 16.14 6.64L19.69 3.19C17.45 1.22 14.97 0.100001 12 0.100001C7.54 0.100001 3.76 2.16 1.87 5.53L5.77 8.42C6.64 5.96 9.12 4.06 12 4.06V5.08Z" fill="#EA4335"></path></svg>
                <span className="truncate">Login with Google</span>
              </div>
            </button>

            <div className="text-center text-sm text-gray-600">
              Don't have account?{' '}
              <button onClick={() => navigate('/admin/signup')} className="text-\[\#00796B\] hover:underline">Signup</button>
            </div>

            <button
              type="button"
              onClick={() => navigate('/admin/signup')}
              className="flex items-center justify-center overflow-hidden rounded-lg h-12 px-6 bg-white text-\[\#00796B\] border-2 border-\[\#00796B\] text-base font-bold w-full hover:bg-\[\#00796B\]/10"
            >
              Signup
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <div className="mt-auto w-full text-white">
        <Footer noBorder />
      </div>
    </div>
  );
};

export default AdminLoginPage;


