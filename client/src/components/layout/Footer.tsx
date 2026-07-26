import { Globe, Rss } from "lucide-react";
import { Link } from "react-router-dom";
import "./Footer.css";

// The grid below is sized to exactly these columns. If you add or remove one,
// update `grid-template-columns` in Footer.css to match — a mismatch is what
// previously left two empty columns of whitespace on the homepage.
const LINK_COLUMNS: { heading: string; links: { to: string; label: string }[] }[] = [
  {
    heading: "Explore",
    links: [
      { to: "/map", label: "Interactive Map" },
      { to: "/riding-lookup", label: "Riding Lookup" },
      { to: "/donation-trends", label: "Donation Trends" },
    ],
  },
  {
    heading: "Resources",
    links: [
      { to: "/about", label: "About the Data" },
      { to: "/login", label: "Researcher Login" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer-top">
        <div className="site-footer-brand">
          <span className="site-footer-logo">CDMP</span>
          <p>
            Canadian Donor Mapping Project. Nonpartisan, independent
            accountability into political fundraising through open data and
            visualization.
          </p>
        </div>

        {LINK_COLUMNS.map(({ heading, links }) => (
          <div className="site-footer-col" key={heading}>
            <h4>{heading}</h4>
            {links.map(({ to, label }) => (
              <Link key={to} to={to}>
                {label}
              </Link>
            ))}
          </div>
        ))}
      </div>

      <div className="site-footer-bottom">
        <p>© 2026 Canadian Donor Mapping Project.</p>
        <div className="site-footer-icons">
          <Globe size={16} strokeWidth={1.8} />
          <Rss size={16} strokeWidth={1.8} />
        </div>
      </div>
    </footer>
  );
}
