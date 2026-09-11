import React from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Activity, ShieldCheck, LogOut, User, Stethoscope, Video, FileText, Sparkles } from "lucide-react";

export default function Navbar({ currentUser, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();

  function handleLogout() {
    if (onLogout) {
      onLogout();
    } else {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      navigate("/login");
    }
  }

  const user = currentUser || JSON.parse(localStorage.getItem("user") || "{}");
  const isAuthenticated = !!localStorage.getItem("token");

  return (
    <header className="topbar">
      <div
        className="brand-section"
        onClick={() => navigate("/")}
        style={{ cursor: "pointer" }}
      >
        <div className="logo-badge">
          <Activity size={22} strokeWidth={2.5} color="#ffffff" />
        </div>
        <span className="brand">Smart Healthcare</span>
      </div>

      {isAuthenticated && (
        <nav className="nav-links">
          <Link
            to="/"
            className={`nav-link ${location.pathname === "/" ? "active" : ""}`}
          >
            <Activity size={17} />
            <span>Dashboard</span>
          </Link>

          {user?.role === "admin" && (
            <Link
              to="/admin"
              className={`nav-link ${location.pathname === "/admin" ? "active" : ""}`}
            >
              <ShieldCheck size={17} color="#0284c7" />
              <span>Admin Panel</span>
            </Link>
          )}
        </nav>
      )}

      <div className="user-actions">
        {isAuthenticated && user?.name ? (
          <>
            <div className="user-badge">
              <span
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: user.role === "doctor" ? "#10b981" : "#3b82f6",
                  boxShadow: user.role === "doctor" ? "0 0 8px rgba(16,185,129,0.6)" : "0 0 8px rgba(59,130,246,0.6)"
                }}
              ></span>
              <strong style={{ color: "#0f172a", fontWeight: "700" }}>{user.name}</strong>
              <span className="muted" style={{ fontSize: "12px", textTransform: "capitalize", color: "#64748b" }}>
                ({user.role}{user.role === "doctor" && user.fees !== undefined ? ` · ₹${user.fees}` : ""})
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="danger"
              style={{
                borderRadius: "10px",
                padding: "8px 16px",
                fontSize: "13px",
                fontWeight: "600"
              }}
            >
              <LogOut size={16} />
              <span>Logout</span>
            </button>
          </>
        ) : (
          <div style={{ display: "flex", gap: "10px" }}>
            <Link to="/login" className="button secondary-btn">Login</Link>
            <Link to="/register" className="button primary">Register</Link>
          </div>
        )}
      </div>
    </header>
  );
}
