import React, { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Sidebar from './Sidebar';
import TopNavbar from './TopNavbar';
import { Users, QrCode, ArrowRight } from 'lucide-react';

const Dashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // If we're on the main dashboard route, show dashboard content
  if (location.pathname === '/') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 flex flex-col">
        {/* Sidebar */}
        <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />

        {/* Content area */}
        <div className="flex-1 flex flex-col lg:pl-5">
          {/* Top Navbar */}
          <TopNavbar onMenuClick={() => setSidebarOpen(true)} />

          {/* Main Dashboard */}
          <main className="flex-1 px-4 sm:px-6 lg:px-8 pt-6 pb-12">
            {/* Header */}
            <div className="mb-10">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Dashboard
              </h1>
              {(() => {
                const rawName = user?.name || 'there';
                const hasDoctorTitle = /^Dr\.?\s+/i.test(rawName);
                const cleanedName = rawName.replace(/^Dr\.?\s+/i, '');
                const greetingName = hasDoctorTitle ? `Dr. ${cleanedName}` : rawName;
                return (
                  <p className="mt-2 text-lg text-gray-600">
                    Welcome back, {greetingName}
                  </p>
                );
              })()}
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
              {[
                { label: "Recent Scans", value: "12" },
                { label: "Appointments", value: "3" },
                { label: "Today's Hours", value: "8" },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-md border border-white/30 flex flex-col justify-center"
                >
                  <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                  <p className="mt-2 text-3xl font-bold text-gray-900">{stat.value}</p>
                </div>
              ))}
            </div>

            {/* Quick Actions + Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
              {/* Quick Actions */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-md border border-white/30">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                <div className="space-y-4">
                  <button
                    onClick={() => navigate('/scan')}
                    className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 hover:from-blue-100 hover:to-indigo-100 hover:shadow-md transition-all duration-200 group"
                  >
                    <div className="flex items-center flex-1">
                      <div className="p-2 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg flex-shrink-0 group-hover:scale-110 transition-transform duration-200">
                        <QrCode className="w-5 h-5 text-blue-600" />
                      </div>
                      <span className="ml-3 text-sm font-medium text-gray-700">
                        Scan Patient QR
                      </span>
                    </div>
                    <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all duration-200 flex-shrink-0" />
                  </button>

                  <button
                    onClick={() => navigate('/patients')}
                    className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200 hover:from-green-100 hover:to-emerald-100 hover:shadow-md transition-all duration-200 group"
                  >
                    <div className="flex items-center flex-1">
                      <div className="p-2 bg-gradient-to-br from-green-100 to-green-200 rounded-lg flex-shrink-0 group-hover:scale-110 transition-transform duration-200">
                        <Users className="w-5 h-5 text-green-600" />
                      </div>
                      <span className="ml-3 text-sm font-medium text-gray-700">
                        View All Patients
                      </span>
                    </div>
                    <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-green-600 group-hover:translate-x-1 transition-all duration-200 flex-shrink-0" />
                  </button>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-md border border-white/30">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
                <div className="space-y-3">
                  <ActivityItem
                    color="blue"
                    title="Patient QR scanned"
                    subtitle="John Doe • 2 min ago"
                  />
                  <ActivityItem
                    color="green"
                    title="Medical report reviewed"
                    subtitle="Blood work results • 15 min ago"
                  />
                  <ActivityItem
                    color="purple"
                    title="New patient added"
                    subtitle="Sarah Johnson • 1 hour ago"
                  />
                </div>
              </div>
            </div>

            {/* This Week's Overview */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-md border border-white/30">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">This Week's Overview</h3>
              <div className="space-y-6">
                <OverviewStat label="Patient Satisfaction" value="95%" change="+2%" />
                <OverviewStat label="Scan Accuracy" value="99.8%" change="+0.1%" />
                <OverviewStat label="Appointment Adherence" value="100%" change="+0%" />
              </div>
            </div>
          </main>

          {/* Footer */}
          <Footer />
        </div>
      </div>
    );
  }

  // For other routes, render outlet with sidebar + top navbar
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 flex flex-col">
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
      <div className="flex-1 flex flex-col lg:pl-64">
        <TopNavbar onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8">
          <Outlet />
        </main>
        {/* Footer */}
        <Footer />
      </div>
    </div>
  );
};

export default Dashboard;

/* ----------------------
 * Helper Components
 * --------------------*/
const ActivityItem = ({ color, title, subtitle }) => (
  <div className={`flex items-start space-x-3 p-3 bg-${color}-50 rounded-lg`}>
    <div className={`w-2 h-2 bg-${color}-500 rounded-full mt-2 flex-shrink-0`} />
    <div className="flex-1 min-w-0">
      <span className="text-sm text-gray-700 font-medium">{title}</span>
      <p className="text-xs text-gray-500">{subtitle}</p>
    </div>
  </div>
);

const OverviewStat = ({ label, value, change }) => (
  <div className="flex items-center justify-between">
    <div>
      <p className="text-sm text-gray-600">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
    <span className="text-sm text-green-600 font-medium">{change}</span>
  </div>
);

/* ----------------------
 * Footer Component
 * --------------------*/
const Footer = () => (
  <footer className="w-full py-6 border-t border-gray-200 flex items-center justify-center">
    <img src="/AiAllyLogo.png" alt="Ai Ally Logo" className="h-6 mr-2" />
    <span className="text-sm text-gray-500">Powered by Ai Ally</span>
  </footer>
);
