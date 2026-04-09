import React, { useState } from 'react';
import GlobalNavbar from './GlobalNavbar';
import Sidebar from './Sidebar';
import AIAssistant from './AIAssistant';
import AnimatedChatButton from './AnimatedChatButton';
import Footer from './Footer';
import { useAuth } from '../context/AuthContext';

const MainLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(true);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const { user } = useAuth();
  const storedRole = typeof window !== 'undefined' ? localStorage.getItem('role') : '';
  const currentRole = String(user?.role || storedRole || '').toLowerCase();
  const isDoctor = currentRole === 'doctor';

  return (
    <div
      className={
        isDoctor
          ? 'doctor-theme-scope doctor-shell-surface min-h-screen'
          : 'min-h-screen bg-[#F5F7FB] dark:bg-gradient-to-br dark:from-[#0f0f0f] dark:via-[#121212] dark:to-[#1a1a1a] transition-all duration-500'
      }
    >
      <Sidebar
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
        isCollapsed={desktopSidebarCollapsed}
        setIsCollapsed={setDesktopSidebarCollapsed}
      />

      <div className={`flex-1 flex flex-col min-h-screen transition-[margin] duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${desktopSidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'}`}>
        <GlobalNavbar
          setSidebarOpen={setSidebarOpen}
          desktopSidebarCollapsed={desktopSidebarCollapsed}
          setDesktopSidebarCollapsed={setDesktopSidebarCollapsed}
        />
        <main className="flex-1 w-full bg-transparent px-6 lg:px-8 mt-6 pb-20 ">
          {children}
        </main>
        <Footer />
      </div>

      {/* Global AI Assistant */}
      <AnimatedChatButton onClick={() => setShowAIAssistant(true)} />
      {showAIAssistant && <AIAssistant onClose={() => setShowAIAssistant(false)} />}
    </div>
  );
};

export default MainLayout;
