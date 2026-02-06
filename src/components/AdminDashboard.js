import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE } from '../constants/api';
import AdminLayout from './AdminLayout';
import { AlertTriangle, Users, Search, Activity } from 'lucide-react';

const StatCard = ({ title, value, hint, icon: Icon, color = 'sky' }) => {
  const colorClasses = {
    sky: 'from-sky-500 to-sky-600',
    emerald: 'from-emerald-500 to-emerald-600',
    blue: 'from-blue-500 to-blue-600',
    purple: 'from-purple-500 to-purple-600',
  };
  
  return (
    <div className="rounded-2xl bg-white border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-xl bg-gradient-to-r ${colorClasses[color]} bg-opacity-10`}>
          {Icon && <Icon className={`h-6 w-6 text-${color}-600`} />}
        </div>
      </div>
      <p className="text-sm text-gray-600 font-medium">{title}</p>
      <p className="mt-2 text-3xl font-bold text-[#263238]">{value}</p>
      {hint ? <p className="mt-1 text-xs text-gray-500">{hint}</p> : null}
    </div>
  );
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [sosCount, setSosCount] = useState(0);
  const [lostReportsCount, setLostReportsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('adminToken');
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

        // Fetch SOS count
        const sosRes = await fetch(`${API_BASE}/sos?unread=true`, { headers });
        const sosData = await sosRes.json();
        if (sosData?.success && Array.isArray(sosData.data)) {
          setSosCount(sosData.data.length);
        }

        // Fetch lost reports summary
        try {
          const lostRes = await fetch(`${API_BASE}/admin/lost-found/summary`, { headers });
          const lostData = await lostRes.json();
          if (lostData?.success && lostData.summary) {
            setLostReportsCount(lostData.summary.openLostCount || 0);
          }
        } catch (e) {
          // If endpoint doesn't exist, ignore
          console.log('Lost reports summary endpoint not available');
        }
      } catch (e) {
        console.error('Error fetching dashboard data:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <AdminLayout>
      <div className="p-4 md:p-6 lg:p-8">
        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-[#263238] mb-4">Quick Actions</h2>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => navigate('/admin/sos')}
              className="relative h-12 px-6 rounded-lg bg-gradient-to-r from-sky-500 to-sky-600 text-white font-semibold hover:from-sky-600 hover:to-sky-700 shadow-md hover:shadow-lg transition-all"
            >
              View SOS Messages
              {!loading && sosCount > 0 && (
                <span className="absolute -top-2 -right-2 inline-flex items-center justify-center rounded-full bg-emerald-500 text-white text-xs font-bold min-w-[24px] h-6 px-1 shadow">
                  {sosCount}
                </span>
              )}
            </button>
            <button
              onClick={() => navigate('/admin/lost-reports')}
              className="h-12 px-6 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold hover:from-emerald-600 hover:to-emerald-700 shadow-md hover:shadow-lg transition-all"
            >
              View Lost Reports
            </button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard 
            title="Open SOS" 
            value={String(sosCount)} 
            hint="Unread messages" 
            icon={AlertTriangle}
            color="sky"
          />
          <StatCard 
            title="Lost Reports" 
            value={String(lostReportsCount)} 
            hint="Open cases" 
            icon={Search}
            color="emerald"
          />
          <StatCard 
            title="Total Doctors" 
            value="184" 
            hint="Registered in system" 
            icon={Users}
            color="blue"
          />
          <StatCard 
            title="System Status" 
            value="Operational" 
            hint="All services running" 
            icon={Activity}
            color="purple"
          />
        </div>

        {/* Additional Info Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-2xl bg-white p-6 shadow border border-gray-200">
            <h3 className="text-lg font-semibold text-[#263238] mb-4">Recent Activity</h3>
            <ul className="space-y-3 text-sm text-gray-700">
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                New doctor registered
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-sky-500"></div>
                SOS resolved by admin
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                Profile updated for patient #1023
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                Lost report match confirmed
              </li>
            </ul>
          </div>
          <div className="rounded-2xl bg-white p-6 shadow border border-gray-200">
            <h3 className="text-lg font-semibold text-[#263238] mb-4">Notifications</h3>
            <ul className="space-y-3 text-sm text-gray-700">
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                3 password reset requests pending
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                Scheduled maintenance tonight 11 PM
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                5 new SOS messages require attention
              </li>
            </ul>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
