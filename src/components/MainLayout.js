import React from 'react';
import GlobalNavbar from './GlobalNavbar';

const MainLayout = ({ children }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-100 dark:from-gray-900 dark:via-gray-800/50 dark:to-gray-900" style={{ fontFamily: "'Josefin Sans', system-ui, sans-serif" }}>
      <GlobalNavbar />
      <main className="pt-16 sm:pt-16 px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
    </div>
  );
};

export default MainLayout;
