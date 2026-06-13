import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { toast } from 'sonner';
import AppSidebar from '@/components/AppSidebar';
import TopHeader from '@/components/TopHeader';

const TEMP_PASSWORD_TOAST_MESSAGE =
  'Your account is still using a temporary password. Please change your password as soon as possible.';

const DashboardLayout: React.FC = () => {
  useEffect(() => {
    if (sessionStorage.getItem('showTempPasswordToast') !== '1') return;
    sessionStorage.removeItem('showTempPasswordToast');
    toast.warning(TEMP_PASSWORD_TOAST_MESSAGE, { duration: 20000 });
  }, []);

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
