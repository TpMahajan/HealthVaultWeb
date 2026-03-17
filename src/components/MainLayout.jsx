import React, { useState } from 'react';
import GlobalNavbar from './GlobalNavbar';
import Sidebar from './Sidebar';
import AIAssistant from './AIAssistant';
import AnimatedChatButton from './AnimatedChatButton';
import Footer from './Footer';

const MainLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(true);
  const [showAIAssistant, setShowAIAssistant] = useState(false);

  return (
    <div className="min-h-screen bg-[#F5F7FB] dark:bg-[#0A0A0A]">
      <Sidebar
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
        isCollapsed={desktopSidebarCollapsed}
        setIsCollapsed={setDesktopSidebarCollapsed}
      />

      <div className={`flex-1 transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${desktopSidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'}`}>
        <GlobalNavbar
          setSidebarOpen={setSidebarOpen}
          desktopSidebarCollapsed={desktopSidebarCollapsed}
          setDesktopSidebarCollapsed={setDesktopSidebarCollapsed}
        />
        <main className="p-6">
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
