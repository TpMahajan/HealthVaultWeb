import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE } from '../constants/api';
import Footer from './Footer';

const AdminSignupPage = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/admin/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem('adminToken', data.token);
        navigate('/admin/dashboard');
      } else {
        setError(data.message || 'Signup failed');
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
        <div className="flex items-center gap-4 text-[#263238]">
          <div className="h-6 w-6">
            <img src="/app_icon.png" alt="Medical Vault" className="h-full w-full object-contain" />
          </div>
          <h2 className="text-[#263238] text-xl font-bold leading-tight tracking-[-0.015em]">Medical Vault</h2>
        </div>
      </header>

      <main className="flex-grow flex items-center justify-center px-4 md:px-10 lg:px-20 xl:px-40 py-8">
        <div className="w-full max-w-md">
          <div className="flex flex-col gap-8 rounded-2xl bg-white/70 backdrop-blur-md p-8 shadow-lg border border-white/30">
            <div className="flex flex-col gap-2 text-center">
              <h1 className="text-2xl font-bold text-[#263238] tracking-tight">Admin Signup</h1>
              <p className="text-sm text-gray-500">Create your admin account to access the panel.</p>
            </div>

            <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
              {error && <div className="text-red-600 text-sm">{error}</div>}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="name" className="text-sm font-medium text-[#263238]">Full Name</label>
                <input
                  id="name"
                  type="text"
                  placeholder="Dr. Jane Doe"
                  className="block w-full rounded-lg border-gray-300 bg-gray-50 px-4 py-2.5 text-base text-[#263238] focus:border-[#00796B] focus:ring-[#00796B]"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="email" className="text-sm font-medium text-[#263238]">Email</label>
                <input
                  id="email"
                  type="email"
                  placeholder="admin@medicalvault.com"
                  className="block w-full rounded-lg border-gray-300 bg-gray-50 px-4 py-2.5 text-base text-[#263238] focus:border-[#00796B] focus:ring-[#00796B]"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="password" className="text-sm font-medium text-[#263238]">Password</label>
                <input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="block w-full rounded-lg border-gray-300 bg-gray-50 px-4 py-2.5 text-base text-[#263238] focus:border-[#00796B] focus:ring-[#00796B]"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center justify-center overflow-hidden rounded-lg h-12 px-6 bg-gradient-to-r from-pink-500 to-pink-600 text-white text-base font-bold tracking-[0.015em] w-full hover:from-pink-600 hover:to-pink-700 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-pink-500 disabled:opacity-70"
              >
                {loading ? 'Signing up...' : 'Signup'}
              </button>
            </form>

            <div className="text-center text-sm text-gray-600">
              Already have an account?{' '}
              <button onClick={() => navigate('/admin/login')} className="text-[#00796B] hover:underline">Login</button>
            </div>
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

export default AdminSignupPage;


