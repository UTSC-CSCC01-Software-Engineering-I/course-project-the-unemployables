import { LogOut } from "lucide-react";
import { NavLink, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import "./TopNav.css";

// Global/orientation nav only. The analytical tools (Riding Lookup, Donation
// Trends, Advanced Filters) live in the Sidebar, so they're deliberately not
// repeated here. These two are the pages the Sidebar can't reach: the map
// (which hides the Sidebar entirely) and the data-provenance page.
const LINKS = [
  { to: "/map", label: "Interactive Map" },
  { to: "/about", label: "About Data" },
];

function getDisplayName(user: { user_metadata?: { full_name?: string; name?: string } | null; email?: string | null } | null | undefined) {
  if (!user) return "";
  return user.user_metadata?.full_name || user.user_metadata?.name || user.email || "Researcher";
}


// Reads the shared session to show the researcher's name and a Sign Out
// button, or the Researcher Login link when nobody's signed in.
export function TopNav() {
  const navigate = useNavigate();
  const { session } = useAuth();

  const isSignedIn = !!session;
  const displayName = getDisplayName(session?.user);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <header className="top-nav">
      <div className="top-nav-left">
        <Link to="/" className="top-nav-logo">CDMP</Link>
        <nav className="top-nav-links">
          {LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === "/"}
              className={({ isActive }) =>
                "top-nav-link" + (isActive ? " active" : "")
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="top-nav-actions">
        {isSignedIn && displayName ? <span className="top-nav-user">{displayName}</span> : null}
        {isSignedIn ? (
          <button type="button" className="top-nav-login top-nav-signout" onClick={handleSignOut}>
            <LogOut aria-hidden="true" /> Sign Out
          </button>
        ) : (
          <Link to="/login" className="top-nav-login">
            Researcher Login
          </Link>
        )}
      </div>
    </header>
  );
}
