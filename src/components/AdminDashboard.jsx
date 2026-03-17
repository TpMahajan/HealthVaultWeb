import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE } from '../constants/api';
import Footer from './Footer';
import { ShieldPlus, Activity, Package, Users, Server, Bell, AlertCircle, Clock, ChevronRight } from 'lucide-react';

const StatCard = ({ title, value, hint, icon: Icon, colorClass }) => (
  <div className="bg-[#FFFFFF] rounded-[16px] p-5 border border-[#E4E8EE] shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:-translate-y-1 transition-all duration-300 hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] hover:border-primary/30">
    <div className="flex items-center justify-between mb-3">
      <p className="text-[11px] font-bold text-[#6B7280] uppercase tracking-widest">{title}</p>
      {Icon && <div className={`p-2 rounded-[12px] ${colorClass}`}><Icon size={18} /></div>}
    </div>
    <p className="text-3xl font-extrabold text-[#1F2937]">{value}</p>
    {hint && <p className="mt-2 text-xs font-semibold text-[#6B7280]">{hint}</p>}
  </div>
);

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [sosCount, setSosCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [ordersCount, setOrdersCount] = useState(0);

  useEffect(() => {
    // Load orders count from localStorage
    try {
      const orders = JSON.parse(localStorage.getItem("mv_orders") || "[]");
      setOrdersCount(orders.length);
    } catch { }

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
    <div className="min-h-screen w-full bg-[#F4F7FA] font-sans flex flex-col">
      <header className="px-6 py-4 flex items-center justify-between bg-[#FFFFFF] border-b border-[#E4E8EE] sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="text-primary flex items-center justify-center p-2 bg-primary-50 rounded-xl">
            <ShieldPlus size={32} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#1F2937] tracking-tight">Medical Vault — Admin</h1>
            <p className="text-xs text-[#6B7280] font-semibold mt-0.5">System Overview & Operations</p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 flex-1 w-full">
        {/* Actions Row */}
        <div className="flex flex-wrap items-center gap-4 mb-8">
          <button
            onClick={() => navigate('/admin/sos')}
            className="group relative h-[42px] px-5 rounded-[12px] bg-primary text-white text-sm font-semibold shadow-md hover:shadow-primary/30 hover:-translate-y-0.5 transition-all flex items-center gap-2 hover:opacity-90 active:scale-95"
          >
            <AlertCircle size={18} strokeWidth={2.5} />
            SOS Alerts
            {!loading && (
              <span className="absolute -top-2.5 -right-2.5 inline-flex items-center justify-center rounded-full bg-slate-900 text-white text-[11px] font-bold min-w-[24px] h-6 px-1.5 shadow-sm border-2 border-white">
                {sosCount}
              </span>
            )}
          </button>
          <button
            onClick={() => navigate('/admin/inventory')}
            className="h-[42px] px-5 rounded-[12px] bg-[#FFFFFF] border border-[#E4E8EE] text-[#1F2937] text-sm font-semibold shadow-sm hover:shadow-md hover:border-primary/50 hover:bg-primary-50 hover:-translate-y-0.5 transition-all flex items-center gap-2 active:scale-95"
          >
            <Package size={18} strokeWidth={2.5} className="text-primary" />
            Inventory
          </button>
          <button
            onClick={() => navigate('/admin/orders')}
            className="h-[42px] px-5 rounded-[12px] bg-[#FFFFFF] border border-[#E4E8EE] text-[#1F2937] text-sm font-semibold shadow-sm hover:shadow-md hover:border-primary/50 hover:bg-primary-50 hover:-translate-y-0.5 transition-all flex items-center gap-2 active:scale-95"
          >
            <Package size={18} strokeWidth={2.5} className="text-primary" />
            Orders
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
          <StatCard title="Open SOS" value={String(sosCount)} hint="Active urgent alerts" icon={AlertCircle} colorClass="bg-primary-50 text-primary" />
          <StatCard title="Total Orders" value={String(ordersCount)} hint="All placed orders" icon={Package} colorClass="bg-primary/20 text-primary" />
          <StatCard title="Total Doctors" value="184" hint="Registered in system" icon={Users} colorClass="bg-primary-50 text-primary" />
          <StatCard title="Active Patients" value="1,240" hint="Last 7 days" icon={Activity} colorClass="bg-primary-50 text-primary" />
          <StatCard title="System Status" value="Online" hint="All services running" icon={Server} colorClass="bg-primary/20 text-primary" />
        </div>

        {/* Info Cards */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-[16px] bg-[#FFFFFF] p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-[#E4E8EE] flex flex-col">
            <div className="flex items-center gap-2.5 mb-6 text-[#1F2937]">
              <div className="p-2 bg-[#BFEFFF]/30 rounded-[10px]">
                <Activity size={20} className="text-[#1F2937]" strokeWidth={2.5} />
              </div>
              <h3 className="text-lg font-bold">Recent Activity</h3>
            </div>
            <ul className="space-y-4 text-sm flex-1">
              <li className="flex items-start gap-3.5 p-3 rounded-[12px] hover:bg-primary-50 transition-colors cursor-pointer border border-[#FFFFFF] hover:border-primary/20 group">
                <div className="mt-0.5 p-2 bg-primary-50 text-primary rounded-[10px] group-hover:bg-primary/20 transition-colors"><Users size={16} strokeWidth={2.5} /></div>
                <div className="flex-1 pt-0.5">
                  <p className="font-bold text-[#1F2937]">New doctor registered</p>
                  <p className="text-xs font-medium text-[#6B7280] mt-0.5">Dr. Sharma completed onboarding.</p>
                </div>
                <ChevronRight size={18} className="text-[#6B7280] mt-2 group-hover:text-primary transition-colors" />
              </li>
              <li className="flex items-start gap-3.5 p-3 rounded-[12px] hover:bg-primary-50 transition-colors cursor-pointer border border-[#FFFFFF] hover:border-primary/20 group">
                <div className="mt-0.5 p-2 bg-primary/20 text-primary rounded-[10px] group-hover:bg-primary/30 transition-colors"><ShieldPlus size={16} strokeWidth={2.5} /></div>
                <div className="flex-1 pt-0.5">
                  <p className="font-bold text-[#1F2937]">SOS resolved by admin</p>
                  <p className="text-xs font-medium text-[#6B7280] mt-0.5">Emergency request #102 handled.</p>
                </div>
                <ChevronRight size={18} className="text-[#6B7280] mt-2 group-hover:text-primary transition-colors" />
              </li>
              <li className="flex items-start gap-3.5 p-3 rounded-[12px] hover:bg-primary-50 transition-colors cursor-pointer border border-[#FFFFFF] hover:border-primary/20 group">
                <div className="mt-0.5 p-2 bg-primary-50 text-primary rounded-[10px] group-hover:bg-primary/20 transition-colors"><Activity size={16} strokeWidth={2.5} /></div>
                <div className="flex-1 pt-0.5">
                  <p className="font-bold text-[#1F2937]">Profile updated</p>
                  <p className="text-xs font-medium text-[#6B7280] mt-0.5">Patient #1023 updated records.</p>
                </div>
                <ChevronRight size={18} className="text-[#6B7280] mt-2 group-hover:text-primary transition-colors" />
              </li>
            </ul>
          </div>

          <div className="rounded-[16px] bg-[#FFFFFF] p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-[#E4E8EE] flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2.5 text-[#1F2937]">
                <div className="p-2 bg-primary-50 rounded-[10px]">
                  <Bell size={20} className="text-primary" strokeWidth={2.5} />
                </div>
                <h3 className="text-lg font-bold">Notifications</h3>
              </div>
              <span className="text-[11px] font-bold bg-primary/20 text-primary px-2.5 py-1 rounded-md uppercase tracking-wider">2 New</span>
            </div>

            <ul className="space-y-4 text-sm flex-1">
              <li className="flex items-start gap-3.5 p-3 rounded-[12px] bg-orange-50 border border-orange-100">
                <div className="mt-0.5 text-[#1F2937] p-2 bg-orange-200 rounded-[10px]"><AlertCircle size={16} strokeWidth={2.5} /></div>
                <div className="flex-1 pt-0.5">
                  <p className="font-bold text-[#1F2937]">3 password resets pending</p>
                  <p className="text-xs font-medium text-[#6B7280] mt-0.5">Requires administrator approval.</p>
                </div>
              </li>
              <li className="flex items-start gap-3.5 p-3 rounded-[12px] border border-[#E4E8EE]">
                <div className="mt-0.5 text-primary p-2 bg-primary-50 rounded-[10px]"><Clock size={16} strokeWidth={2.5} /></div>
                <div className="flex-1 pt-0.5">
                  <p className="font-bold text-[#1F2937]">Scheduled maintenance</p>
                  <p className="text-xs font-medium text-[#6B7280] mt-0.5">System update tonight at 11:00 PM.</p>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </main>
      <div className="mt-auto">
        <Footer />
      </div>
    </div>
  );
};

export default AdminDashboard;
