import React, { useState } from 'react';
import AdminSidebar from './AdminSidebar';
import { Menu } from 'lucide-react';

const AdminLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen w-full bg-gray-50">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 rounded-md text-gray-600 hover:bg-gray-100"
        >
          <Menu className="h-6 w-6" />
        </button>
        <img src="/app_icon.png" alt="Medical Vault" className="h-6 w-6 object-contain" />
        <h1 className="text-lg font-bold text-[#263238]">Admin Panel</h1>
      </header>

      {/* Desktop Header */}
      <header className="hidden lg:block fixed top-0 left-64 right-0 z-30 bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-[#263238]">Medical Vault - Admin Dashboard</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">Admin</span>
          </div>
        </div>
      </header>

      {/* Sidebar */}
      <AdminSidebar open={sidebarOpen} setOpen={setSidebarOpen} />

      {/* Main Content */}
      <main className={`
        pt-16 lg:pt-20 lg:pl-64
        transition-all duration-300
      `}>
        <div className="lg:ml-0">
          {children}
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;

