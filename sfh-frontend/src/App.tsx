import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardLayout from "@/layouts/DashboardLayout";
import LandingPage from "@/pages/LandingPage";
import LoginPage from "@/pages/LoginPage";
import SignupPage from "@/pages/SignupPage";
import DashboardHome from "@/pages/DashboardHome";
import ProgramsPage from "@/pages/ProgramsPage";
import VolunteersPage from "@/pages/VolunteersPage";
import BeneficiariesPage from "@/pages/BeneficiariesPage";
import GeographicPage from "@/pages/GeographicPage";
import AnalyticsPage from "@/pages/AnalyticsPage";
import AdminPage from "@/pages/AdminPage";
import AuditLogsPage from "@/pages/AuditLogsPage";
import AnnouncementsPage from "@/pages/AnnouncementsPage";
import ResourcesPage from "@/pages/ResourcesPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <DashboardLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<DashboardHome />} />
                <Route path="programs" element={<ProgramsPage />} />
                <Route path="volunteers" element={<VolunteersPage />} />
                <Route path="beneficiaries" element={<BeneficiariesPage />} />
                <Route path="geographic" element={<GeographicPage />} />
                <Route path="analytics" element={<AnalyticsPage />} />
                <Route path="resources" element={<ResourcesPage />} />
                <Route path="users" element={<AdminPage />} />
                <Route path="audit" element={<AuditLogsPage />} />
                <Route path="announcements" element={<AnnouncementsPage />} />
                <Route path="help" element={<DashboardHome />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
