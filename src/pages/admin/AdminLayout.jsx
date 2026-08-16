import { NavLink, Outlet, Link } from "react-router-dom";
import { LayoutDashboard, Film, Users, Star, ArrowLeftCircle, ShieldCheck } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import "./Admin.css";

const NAV_ITEMS = [
  { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/movies",    label: "Manage Movies", icon: Film },
  { to: "/admin/users",     label: "Manage Users", icon: Users },
  { to: "/admin/featured",  label: "Featured Movies", icon: Star },
];

function NavLinks({ onClick }) {
  return (
    <>
      {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          onClick={onClick}
          className={({ isActive }) => `adm-nav-link${isActive ? " active" : ""}`}
        >
          <Icon size={15} strokeWidth={2} />
          {label}
        </NavLink>
      ))}
    </>
  );
}

export default function AdminLayout() {
  const { user } = useAuth();

  return (
    <div className="adm-shell">
      <aside className="adm-sidebar">
        <Link to="/admin/dashboard" className="adm-brand">
          <ShieldCheck size={18} strokeWidth={2.2} color="#a78bfa" />
          NextWatch
          <span className="adm-brand-badge">Admin</span>
        </Link>

        <NavLinks />

        <div className="adm-sidebar-footer">
          <Link to="/dashboard" className="adm-nav-link">
            <ArrowLeftCircle size={15} strokeWidth={2} />
            Back to app
          </Link>
        </div>
      </aside>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="adm-topbar">
          <Link to="/admin/dashboard" className="adm-brand" style={{ padding: 0 }}>
            <ShieldCheck size={17} strokeWidth={2.2} color="#a78bfa" />
            <span className="adm-brand-badge">Admin</span>
          </Link>
          <div className="adm-topbar-links">
            <NavLinks />
            <Link to="/dashboard" className="adm-nav-link">
              <ArrowLeftCircle size={15} strokeWidth={2} />
            </Link>
          </div>
        </div>

        <main className="adm-main">
          <Outlet context={{ adminUser: user }} />
        </main>
      </div>
    </div>
  );
}
