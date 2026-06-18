import { LayoutGrid, MapPin, TrendingUp, SlidersHorizontal, Download } from "lucide-react";
import { NavLink } from "react-router-dom";
import "./Sidebar.css";

const NAV_ITEMS = [
  { to: "/", icon: LayoutGrid, label: "Overview", end: true },
  { to: "/riding-lookup", icon: MapPin, label: "Riding Lookup", end: false },
  { to: "/donation-trends", icon: TrendingUp, label: "Donation Trends", end: false },
  { to: "/advanced-filters", icon: SlidersHorizontal, label: "Advanced Filters", end: false },
];

export function Sidebar() {
  return (
    <aside className="side-nav">
      <div className="side-nav-label">Navigation</div>
      <nav className="side-nav-list">
        {NAV_ITEMS.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              "side-nav-item" + (isActive ? " active" : "")
            }
          >
            <Icon size={16} strokeWidth={2} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <button type="button" className="side-nav-download">
        <Download size={14} strokeWidth={2} />
        <span>Download Data</span>
      </button>
    </aside>
  );
}
