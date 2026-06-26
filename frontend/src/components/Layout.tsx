import { Activity, Bell, LayoutDashboard, LogOut } from "lucide-react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <NavLink to="/dashboard" className="brand">
          <Activity size={24} />
          <span>DevOpsPulse</span>
        </NavLink>
        <nav className="nav-links" aria-label="Primary navigation">
          <NavLink to="/dashboard">
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </NavLink>
          <NavLink to="/alerts">
            <Bell size={18} />
            <span>Alerts</span>
          </NavLink>
        </nav>
        <div className="session-area">
          <span>{user?.email}</span>
          <button className="icon-button" type="button" onClick={handleLogout} aria-label="Log out" title="Log out">
            <LogOut size={18} />
          </button>
        </div>
      </header>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
