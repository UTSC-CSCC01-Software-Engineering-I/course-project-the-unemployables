import { ArrowRight, MapPinned, Scale, History, CircleCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { CanadaSilhouette } from "@/assets/CanadaSilhouette";
import { Footer } from "@/components/layout/Footer";
import "./HomePage.css";

interface ToolCard {
  icon: typeof MapPinned;
  iconBg: string;
  iconColor: string;
  title: string;
  description: string;
  linkLabel: string;
}

const TOOL_CARDS: ToolCard[] = [
  {
    icon: MapPinned,
    iconBg: "#ccf3ea",
    iconColor: "#0e8a73",
    title: "Filter by Region",
    description:
      "Narrow contributions by province, riding, or postal code. Identify local trends and regional financial hubs at a glance.",
    linkLabel: "Regional Analysis",
  },
  {
    icon: Scale,
    iconBg: "#dde3fb",
    iconColor: "#4452c4",
    title: "Compare by Party",
    description:
      "Direct side-by-side comparison of party funding sources, donation brackets, and contributor demographics across election cycles.",
    linkLabel: "Party Statistics",
  },
  {
    icon: History,
    iconBg: "#fbe3d8",
    iconColor: "#c3622f",
    title: "Track Over Time",
    description:
      "Longitudinal data tracking from 1993 to present. Observe shifts in political financing and donor behaviour over decades.",
    linkLabel: "Historical Trends",
  },
];

const GEO_FEATURES = [
  "Heatmap and cluster visualizations",
  "Individual riding data overlays",
  "Cross-filter by donation size",
];

export function HomePage() {
  return (
    <div className="home">
      {/* ── Hero ── */}
      <section className="home-hero">
        <CanadaSilhouette className="home-hero-watermark" fill="#0a2240" opacity={0.05} />
        <div className="home-hero-content">
          <span className="home-badge">Official Open Data Portal</span>
          <h1 className="home-hero-title">
            Explore Canadian <span className="home-hero-title-accent">Political Donations</span>
          </h1>
          <p className="home-hero-subtitle">
            Providing transparent, non-partisan access to federal contribution data.
            Analyze trends, track major donors, and visualize regional financial
            landscapes across Canada.
          </p>
          <div className="home-hero-actions">
            <Link to="/map" className="home-btn home-btn-primary">
              <MapPinned size={16} strokeWidth={2} />
              Explore the Map
            </Link>
            <Link to="/about" className="home-btn home-btn-secondary">
              View Data Summary
            </Link>
          </div>
        </div>
      </section>

      {/* ── Tools ── */}
      <section className="home-tools">
        <div className="home-tools-heading">
          <h2>Powerful Analytical Tools</h2>
          <p>
            Built for researchers and journalists. Deep-dive into financial records
            with high-performance tools designed for information density and clarity.
          </p>
        </div>

        <div className="home-tools-grid">
          {TOOL_CARDS.map(({ icon: Icon, iconBg, iconColor, title, description, linkLabel }) => (
            <div key={title} className="home-tool-card">
              <div className="home-tool-icon" style={{ background: iconBg, color: iconColor }}>
                <Icon size={20} strokeWidth={2} />
              </div>
              <h3>{title}</h3>
              <p>{description}</p>
              <a href="#" className="home-tool-link">
                {linkLabel}
                <ArrowRight size={13} strokeWidth={2} />
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* ── Geospatial CTA ── */}
      <section className="home-geo">
        <div className="home-geo-text">
          <h2>Real-time Geospatial Exploration</h2>
          <p>
            Our map-based interface allows for intuitive discovery. See heatmaps of
            donation density across Canada and zoom in for individual riding details.
          </p>
          <ul className="home-geo-list">
            {GEO_FEATURES.map((feature) => (
              <li key={feature}>
                <CircleCheck size={15} strokeWidth={2} />
                {feature}
              </li>
            ))}
          </ul>
          <Link to="/map" className="home-btn home-btn-primary">
            Launch Interactive Map
          </Link>
        </div>

        <div className="home-geo-preview">
          <div className="home-geo-preview-frame">
            <div className="home-geo-tooltip">
              <span className="home-geo-tooltip-label">Total Contributions</span>
              <span className="home-geo-tooltip-value">$14.2M</span>
            </div>
            <CanadaSilhouette className="home-geo-map" fill="#cfd8e6" opacity={0.9} />
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
