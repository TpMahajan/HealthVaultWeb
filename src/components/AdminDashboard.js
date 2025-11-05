import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE } from '../constants/api';

const StatCard = ({ title, value, hint }) => (
  <div className="rounded-2xl bg-white/70 backdrop-blur-md border border-white/30 p-6 shadow">
    <p className="text-sm text-gray-600">{title}</p>
    <p className="mt-2 text-3xl font-bold text-[#263238]">{value}</p>
    {hint ? <p className="mt-1 text-xs text-gray-500">{hint}</p> : null}
  </div>
);

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [sosCount, setSosCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSos = async () => {
      try {
        const token = localStorage.getItem('adminToken');
        const res = await fetch(`${API_BASE}/sos?unread=true`, token ? { headers: { 'Authorization': `Bearer ${token}` } } : undefined);
        const data = await res.json();
        if (data?.success && Array.isArray(data.data)) {
          setSosCount(data.data.length);
        }
      } catch (e) {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    fetchSos();
  }, []);

  return (
    <div className="min-h-screen w-full bg-gray-50">
      <header className="px-4 md:px-10 py-4 flex items-center gap-3 bg-white border-b border-gray-200">
        <img src="/app_icon.png" alt="Medical Vault" className="h-6 w-6 object-contain" />
        <h1 className="text-xl font-bold text-[#263238]">Medical Vault - Admin Dashboard</h1>
      </header>

      <main className="px-4 md:px-10 lg:px-20 xl:px-40 pb-10">
        <div className="flex flex-wrap gap-4 mb-6 pt-6">
          <button
            onClick={() => navigate('/admin/sos')}
            className="relative h-12 px-6 rounded-lg bg-gradient-to-r from-sky-500 to-sky-600 text-white font-semibold hover:from-sky-600 hover:to-sky-700"
          >
            View SOS
            {!loading && (
              <span className="absolute -top-2 -right-2 inline-flex items-center justify-center rounded-full bg-emerald-500 text-white text-xs font-bold min-w-[24px] h-6 px-1 shadow">
                {sosCount}
              </span>
            )}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard title="Open SOS" value={String(sosCount)} hint="Across last 24 hours" />
          <StatCard title="Total Doctors" value="184" hint="Registered in system" />
          <StatCard title="Active Patients" value="1,240" hint="Last 7 days" />
          <StatCard title="System Status" value="Operational" hint="All services running" />
        </div>

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-2xl bg-white p-6 shadow border border-gray-100">
            <h3 className="text-lg font-semibold text-[#263238]">Recent Activity</h3>
            <ul className="mt-4 space-y-3 text-sm text-gray-700">
              <li>New doctor registered</li>
              <li>SOS resolved by admin</li>
              <li>Profile updated for patient #1023</li>
            </ul>
          </div>
          <div className="rounded-2xl bg-white p-6 shadow border border-gray-100">
            <h3 className="text-lg font-semibold text-[#263238]">Notifications</h3>
            <ul className="mt-4 space-y-3 text-sm text-gray-700">
              <li>3 password reset requests pending</li>
              <li>Scheduled maintenance tonight 11 PM</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
