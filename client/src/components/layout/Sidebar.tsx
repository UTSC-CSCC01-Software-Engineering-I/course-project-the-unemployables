import { useEffect, useRef, useState } from "react";
import {
  LayoutGrid,
  Map as MapIcon,
  MapPin,
  TrendingUp,
  SlidersHorizontal,
  Download,
  Lock,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import "./Sidebar.css";

interface NavItem {
  to: string;
  icon: typeof LayoutGrid;
  label: string;
  end: boolean;
  /** Researcher-only. Renders locked (not a link) when nobody is signed in. */
  requiresAuth?: boolean;
}

// The map is in this list now that the sidebar is no longer hidden on /map —
// previously the map was a dead end with no route back to the other tools.
const NAV_ITEMS: NavItem[] = [
  { to: "/", icon: LayoutGrid, label: "Overview", end: true },
  { to: "/map", icon: MapIcon, label: "Interactive Map", end: false },
  { to: "/riding-lookup", icon: MapPin, label: "Riding Lookup", end: false },
  { to: "/donation-trends", icon: TrendingUp, label: "Donation Trends", end: false },
  {
    to: "/advanced-filters",
    icon: SlidersHorizontal,
    label: "Advanced Filters",
    end: false,
    requiresAuth: true,
  },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const navigate = useNavigate();
  // `loading` matters for the same reason it does on the homepage: Supabase
  // reads the persisted session asynchronously, so a signed-in researcher
  // would otherwise see their tools flash "locked" on every refresh.
  const { session, loading: authLoading } = useAuth();
  const isSignedIn = !!session;

  // Which locked destination the user tried to open, or null for no dialog.
  const [lockedTarget, setLockedTarget] = useState<NavItem | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);

  const closeDialog = () => setLockedTarget(null);

  // Escape closes the dialog, and focus moves into it on open so keyboard
  // users aren't left behind in the nav list.
  useEffect(() => {
    if (!lockedTarget) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setLockedTarget(null);
    };

    document.addEventListener("keydown", onKeyDown);
    dialogRef.current?.focus();

    return () => document.removeEventListener("keydown", onKeyDown);
  }, [lockedTarget]);

  // Send them to the login page and bring them straight back to the tool they
  // were reaching for, rather than dumping them on the homepage.
  const goToSignIn = () => {
    const target = lockedTarget?.to ?? "/advanced-filters";
    setLockedTarget(null);
    navigate(`/login?redirect=${encodeURIComponent(target)}`);
  };

  return (
    <>
      <aside className={"side-nav" + (collapsed ? " collapsed" : "")}>
        <div className="side-nav-header">
          {!collapsed && <span className="side-nav-label">Navigation</span>}
          <button
            type="button"
            className="side-nav-toggle"
            onClick={onToggle}
            aria-expanded={!collapsed}
            aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
            title={collapsed ? "Expand navigation" : "Collapse navigation"}
          >
            {collapsed ? (
              <PanelLeftOpen size={16} strokeWidth={2} />
            ) : (
              <PanelLeftClose size={16} strokeWidth={2} />
            )}
          </button>
        </div>

        <nav className="side-nav-list">
          {NAV_ITEMS.map((item) => {
            const { to, icon: Icon, label, end, requiresAuth } = item;

            // Three states, not two — while the session is still being read we
            // render a neutral, non-interactive row instead of guessing.
            const authPending = !!requiresAuth && authLoading;
            const locked = !!requiresAuth && !authLoading && !isSignedIn;

            if (authPending) {
              return (
                <span key={to} className="side-nav-item pending" title={label}>
                  <Icon size={16} strokeWidth={2} />
                  {!collapsed && <span className="side-nav-item-label">{label}</span>}
                </span>
              );
            }

            if (locked) {
              return (
                <button
                  key={to}
                  type="button"
                  className="side-nav-item locked"
                  onClick={() => setLockedTarget(item)}
                  title={`${label} — researcher login required`}
                  aria-label={`${label} — researcher login required`}
                >
                  <Icon size={16} strokeWidth={2} />
                  {!collapsed && (
                    <>
                      <span className="side-nav-item-label">{label}</span>
                      <Lock size={13} strokeWidth={2} className="side-nav-item-lock" />
                    </>
                  )}
                </button>
              );
            }

            return (
              <NavLink
                key={to}
                to={to}
                end={end}
                title={label}
                className={({ isActive }) => "side-nav-item" + (isActive ? " active" : "")}
              >
                <Icon size={16} strokeWidth={2} />
                {!collapsed && <span className="side-nav-item-label">{label}</span>}
              </NavLink>
            );
          })}
        </nav>

        <button
          type="button"
          className="side-nav-download"
          title="Download data"
          aria-label="Download data"
        >
          <Download size={14} strokeWidth={2} />
          {!collapsed && <span>Download Data</span>}
        </button>
      </aside>

      {lockedTarget && (
        <div className="side-nav-modal-backdrop" onClick={closeDialog}>
          <div
            className="side-nav-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="side-nav-modal-title"
            aria-describedby="side-nav-modal-body"
            tabIndex={-1}
            ref={dialogRef}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="side-nav-modal-icon">
              <Lock size={18} strokeWidth={2} />
            </div>

            <h2 className="side-nav-modal-title" id="side-nav-modal-title">
              You&apos;re not logged in.
            </h2>

            <p className="side-nav-modal-body" id="side-nav-modal-body">
              {lockedTarget.label} is limited to approved, university-affiliated
              researchers. Sign in to view individual-level contribution records.
            </p>

            <div className="side-nav-modal-actions">
              <button type="button" className="side-nav-modal-btn secondary" onClick={closeDialog}>
                Close
              </button>
              <button type="button" className="side-nav-modal-btn primary" onClick={goToSignIn}>
                Sign In
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
