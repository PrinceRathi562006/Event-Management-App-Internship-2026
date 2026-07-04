import { X } from "lucide-react";
import { Link, NavLink } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { logout } from "../../redux/authSlice";
import OrganizerChatPanel from "./OrganizerChatPanel";

function MobileMenu({ isOpen, navLinks = [], onClose }) {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="mobile-menu" role="dialog" aria-modal="true">
      <div className="mobile-menu-panel">
        <div className="mobile-menu-top">
          <strong>Menu</strong>
          <button aria-label="Close menu" className="icon-button" onClick={onClose} type="button">
            <X size={18} />
          </button>
        </div>
        <div className="mobile-menu-links">
          {navLinks.map((link) => (
            <NavLink key={link.to} onClick={onClose} to={link.to}>
              {link.label}
            </NavLink>
          ))}
        </div>
        {user ? (
          <div className="mobile-menu-actions">
            <OrganizerChatPanel />
            <Link className="secondary-button" onClick={onClose} to="/profile">
              Profile
            </Link>
            <Link className="primary-button" onClick={onClose} to={user.role === "admin" ? "/admin" : "/dashboard"}>
              {user.role === "admin" ? "Admin" : "Dashboard"}
            </Link>
            <button
              className="danger-button"
              onClick={() => {
                dispatch(logout());
                onClose();
              }}
              type="button"
            >
              Logout
            </button>
          </div>
        ) : (
          <div className="mobile-menu-actions">
            <Link className="secondary-button" onClick={onClose} to="/register">
              Register
            </Link>
            <Link className="primary-button" onClick={onClose} to="/login">
              Login
            </Link>
          </div>
        )}
      </div>
      <button aria-label="Close menu overlay" className="mobile-menu-backdrop" onClick={onClose} type="button" />
    </div>
  );
}

export default MobileMenu;
