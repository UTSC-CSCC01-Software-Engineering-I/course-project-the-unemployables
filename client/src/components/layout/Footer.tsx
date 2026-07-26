import { Link } from "react-router-dom";
import { DATA_FIRST_YEAR, DATA_LAST_YEAR } from "@/utils/years";
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
          <p className="site-footer-name">Canadian Donations Mapping Platform</p>
          <p>
            Federal political contribution records are already public. This
            platform makes them explorable — mapped to electoral geography,
            filterable by party and year, and open to anyone without an account.
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

      {/* Attribution rather than decoration: the previous globe and RSS icons
          looked clickable, weren't links, and pointed at nothing. */}
      <div className="site-footer-source">
        <p>
          Contribution data published by Elections Canada, {DATA_FIRST_YEAR}&ndash;
          {DATA_LAST_YEAR}. Electoral district boundaries published by Elections Canada.
        </p>
        <p>
          Public figures on this site are aggregated. Individual-level records are
          restricted to approved, university-affiliated researchers.
        </p>
      </div>

      <div className="site-footer-bottom">
        <p>© 2026 Canadian Donations Mapping Platform.</p>
        <p className="site-footer-affiliation">
          A project of the Policy Horizons Lab, University of Toronto Scarborough.
        </p>
      </div>
    </footer>
  );
}
