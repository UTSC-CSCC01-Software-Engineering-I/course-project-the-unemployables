import { ArrowRight, Compass, MapPinned, TrendingUp } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { Footer } from "@/components/layout/Footer";
import "./NotFoundPage.css";

// Where a lost visitor most likely meant to go. Deliberately the three public
// tools only — pointing someone at Advanced Filters when they can't open it
// would just be a second dead end.
const SUGGESTIONS = [
  {
    icon: MapPinned,
    to: "/map",
    title: "Interactive Map",
    description: "Contribution totals by province or riding, shaded across the whole country.",
  },
  {
    icon: Compass,
    to: "/riding-lookup",
    title: "Riding Lookup",
    description: "Search any federal electoral district for its donation history.",
  },
  {
    icon: TrendingUp,
    to: "/donation-trends",
    title: "Donation Trends",
    description: "Contributions to each party over time, by year or by month.",
  },
];

export function NotFoundPage() {
  const location = useLocation();

  return (
    <div className="notfound">
      <section className="notfound-hero">
        <span className="notfound-code">404</span>
        <h1 className="notfound-title">This page doesn&apos;t exist.</h1>
        <p className="notfound-subtitle">
          There&apos;s nothing at <code className="notfound-path">{location.pathname}</code>. The
          link may be out of date, or the address may have a typo in it.
        </p>
        <Link to="/" className="notfound-home-link">
          Back to the overview
          <ArrowRight size={14} strokeWidth={2} />
        </Link>
      </section>

      <section className="notfound-suggestions" aria-label="Suggested pages">
        {SUGGESTIONS.map(({ icon: Icon, to, title, description }) => (
          <Link key={to} to={to} className="notfound-card">
            <span className="notfound-card-icon">
              <Icon size={18} strokeWidth={2} />
            </span>
            <span className="notfound-card-title">{title}</span>
            <span className="notfound-card-description">{description}</span>
          </Link>
        ))}
      </section>

      <Footer />
    </div>
  );
}
