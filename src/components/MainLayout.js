import React from 'react';
import GlobalNavbar from './GlobalNavbar';

const MainLayout = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <GlobalNavbar />
      <main className="pt-16">
        {children}
      </main>
    </div>
  );
};

export default MainLayout;
