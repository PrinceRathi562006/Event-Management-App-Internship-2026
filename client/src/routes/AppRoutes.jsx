import { useEffect } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import Footer from "../components/layout/Footer";
import Navbar from "../components/layout/Navbar";
import CalendarView from "../pages/CalendarView";
import CertificatePage from "../pages/CertificatePage";
import Admin from "../pages/Admin";
import CreateEvent from "../pages/CreateEvent";
import Dashboard from "../pages/Dashboard";
import EventDetail from "../pages/EventDetail";
import EventSettings from "../pages/EventSettings";
import Events from "../pages/Events";
import ForgotPassword from "../pages/ForgotPassword";
import Home from "../pages/Home";
import Login from "../pages/Login";
import NotFound from "../pages/NotFound";
import Profile from "../pages/Profile";
import Register from "../pages/Register";
import Settings from "../pages/Settings";
import VerifyEmail from "../pages/VerifyEmail";
import VerifyCertificate from "../pages/VerifyCertificate";

function SmoothScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  }, [pathname]);

  return null;
}

function AppRoutes() {
  return (
    <div className="page-shell">
      <SmoothScrollToTop />
      <Navbar />
      <main>
        <Routes>
          <Route element={<Home />} path="/" />
          <Route element={<Events />} path="/events" />
          <Route element={<CreateEvent />} path="/events/create" />
          <Route element={<EventSettings />} path="/events/:id/settings" />
          <Route element={<EventDetail />} path="/events/:id" />
          <Route element={<CalendarView />} path="/calendar" />
          <Route element={<CertificatePage />} path="/certificates/:bookingId" />
          <Route element={<VerifyCertificate />} path="/certificate/verify/:certificateId" />
          <Route element={<Login />} path="/login" />
          <Route element={<ForgotPassword />} path="/forgot-password" />
          <Route element={<Register />} path="/register" />
          <Route element={<VerifyEmail />} path="/verify-email" />
          <Route element={<Profile />} path="/profile" />
          <Route element={<Settings />} path="/settings" />
          <Route element={<Admin />} path="/admin" />
          <Route element={<Dashboard />} path="/dashboard" />
          <Route element={<NotFound />} path="*" />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

export default AppRoutes;
