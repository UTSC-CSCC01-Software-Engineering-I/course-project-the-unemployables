import { NavLink, Link } from "react-router-dom";
import "./TopNav.css";

const LINKS = [
  { to: "/", label: "Map Exploration" },
  { to: "/region", label: "Region Detail" },
  { to: "/about", label: "About Data" },
];

export function TopNav() {
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

      <Link to="/login" className="top-nav-login">
        Researcher Login
      </Link>
    </header>
  );
}
