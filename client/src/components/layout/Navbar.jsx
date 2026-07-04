import { Link, NavLink } from "react-router-dom";
import { useEffect, useState } from "react";
import { Bell, LogOut, Menu, Moon, Sun, UserRound } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import Logo from "../ui/Logo";
import { logout } from "../../redux/authSlice";
import api from "../../services/api";
import MobileMenu from "./MobileMenu";
import OrganizerChatPanel from "./OrganizerChatPanel";
 
const baseNavLinks = [
  { to: "/", label: "Home" },
  { to: "/events", label: "Events" },
  { to: "/calendar", label: "Calendar" },
];

function Navbar() {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [theme, setTheme] = useState(() => localStorage.getItem("event_theme") || "light");
  const navLinks = user
    ? [
        ...baseNavLinks,
        user.role === "admin" ? { to: "/admin", label: "Admin" } : { to: "/dashboard", label: "Dashboard" },
      ]
    : baseNavLinks;

  useEffect(() => {
    if (!user) {
      return;
    }

    api
      .get("/notifications")
      .then((response) => setNotifications(response.data.notifications || []))
      .catch(() => setNotifications([]));
  }, [user]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("event_theme", theme);
  }, [theme]);

  const unreadCount = notifications.filter((notification) => !notification.isRead).length;

  const markAllRead = async () => {
    try {
      await api.patch("/notifications/read-all");
      setNotifications((current) =>
        current.map((notification) => ({
          ...notification,
          isRead: true,
        }))
      );
    } catch {
      setNotifications((current) =>
        current.map((notification) => ({
          ...notification,
          isRead: true,
        }))
      );
    }
  };

  return (
    <header className="site-header">
      <nav className="nav container">
        <Logo />
        <div className="nav-links">
          {navLinks.map((link) => (
            <NavLink key={link.to} to={link.to}>
              {link.label}
            </NavLink>
          ))}
        </div>
        <button className="mobile-menu-button icon-button" onClick={() => setIsMobileMenuOpen(true)}>
          <Menu size={24} />
        </button>
        <div className="nav-actions">
          <button
            aria-label="Toggle theme"
            className="icon-button"
            onClick={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
            type="button"
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          {user ? (
            <>
              <OrganizerChatPanel />
              <div className="notification-menu">
                <button
                  aria-label="Notifications"
                  className="icon-button notification-button"
                  onClick={() => setIsNotificationsOpen((current) => !current)}
                  type="button"
                >
                  <Bell size={18} />
                  {unreadCount > 0 && <span>{unreadCount}</span>}
                </button>
                {isNotificationsOpen && (
                  <div className="notification-dropdown">
                    <div className="notification-head">
                      <strong>Notifications</strong>
                      <button onClick={markAllRead} type="button">
                        Mark read
                      </button>
                    </div>
                    {notifications.length ? (
                      notifications.slice(0, 5).map((notification) => (
                        <Link className="notification-item" key={notification._id} onClick={() => setIsNotificationsOpen(false)} to="/dashboard">
                          <strong>{notification.title}</strong>
                          <span>{notification.message}</span>
                        </Link>
                      ))
                    ) : (
                      <p>No announcements yet.</p>
                    )}
                  </div>
                )}
              </div>
              <Link className="user-chip" to="/profile">
                <UserRound size={16} />
                {user.name}
              </Link>
              <button aria-label="Logout" className="icon-button" onClick={() => dispatch(logout())} type="button">
                <LogOut size={18} />
              </button>
            </>
          ) : (
            <>
              <Link className="secondary-button nav-login" to="/register">
                Register
              </Link>
              <Link className="primary-button nav-login" to="/login">
                Login
              </Link>
            </>
          )}
        </div>
      </nav>
      <MobileMenu isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} navLinks={navLinks} />
    </header>
  );
}

export default Navbar;
