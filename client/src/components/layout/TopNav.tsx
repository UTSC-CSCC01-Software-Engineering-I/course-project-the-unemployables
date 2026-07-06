import { useEffect, useState } from "react";
import { LogOut } from "lucide-react";
import { NavLink, Link, useNavigate } from "react-router-dom";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import "./TopNav.css";

const LINKS = [
  { to: "/", label: "Map Exploration" },
  { to: "/region", label: "Region Detail" },
  { to: "/about", label: "About Data" },
];

function getDisplayName(user: { user_metadata?: { full_name?: string; name?: string } | null; email?: string | null } | null | undefined) {
  if (!user) return "";
  return user.user_metadata?.full_name || user.user_metadata?.name || user.email || "Researcher";
}


// Created a function that determines the user session and gets display name.
// If they are not, it will just display the Reseacher Login button.
export function TopNav() {
  const navigate = useNavigate();

  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const isSignedIn = !!session;
  const displayName = getDisplayName(session?.user);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <header className="top-nav">
      <div className="top-nav-left">
        <span className="top-nav-logo">CDMP</span>
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
            < LogOut/> Sign Out
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
