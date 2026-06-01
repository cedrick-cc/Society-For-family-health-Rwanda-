import React from 'react';
import { Outlet } from 'react-router-dom';
import AppSidebar from '@/components/AppSidebar';
import TopHeader from '@/components/TopHeader';

const DashboardLayout: React.FC = () => {
  return (
    <div className="h-screen flex w-full overflow-hidden">
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden dashboard-pattern">
        <TopHeader />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
