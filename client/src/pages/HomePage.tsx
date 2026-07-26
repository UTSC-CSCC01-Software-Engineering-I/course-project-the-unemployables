import { useEffect, useState } from "react";
import { ArrowRight, Lock, MapPinned, Scale, SlidersHorizontal } from "lucide-react";
import { Link } from "react-router-dom";
import { CanadaSilhouette } from "@/assets/CanadaSilhouette";
import { Footer } from "@/components/layout/Footer";
import { useAuth } from "@/context/AuthContext";
import { fetchRidingRankings } from "@/api/ridings";
import { formatMoney } from "@/utils/mapUtils";
import { DATA_FIRST_YEAR, DATA_LAST_YEAR } from "@/utils/years";
import "./HomePage.css";

interface ToolCard {
  icon: typeof MapPinned;
  iconBg: string;
  iconColor: string;
  title: string;
  description: string;
  linkLabel: string;
  to: string;
  /** Requires a signed-in researcher - renders locked when signed out. */
  requiresAuth?: boolean;
}

const TOOL_CARDS: ToolCard[] = [
  {
    icon: MapPinned,
    iconBg: "#ccf3ea",
    iconColor: "#0e8a73",
    title: "Filter by Party",
    description:
      "Narrow contributions by province, riding, or postal code. Identify local trends and regional financial hubs at a glance.",
    linkLabel: "Riding Analysis",
    to: "/riding-lookup",
  },
  {
    icon: Scale,
    iconBg: "#dde3fb",
    iconColor: "#4452c4",
    title: "View Donation Trends",
    description:
      "Direct side-by-side comparison of party funding sources, donation brackets, and contributor demographics across election cycles.",
    linkLabel: "Donation Trends",
    to: "/donation-trends",
  },
  {
    icon: SlidersHorizontal,
    iconBg: "#f5e3d0",
    iconColor: "#a2601f",
    title: "Advanced Filters",
    description:
      "Granular, record-level search across the full contribution dataset. Combine donor, date, amount, and party filters for detailed investigative work.",
    linkLabel: "Open Advanced Filters",
    to: "/advanced-filters",
    requiresAuth: true,
  },
];

// National figures for the stat band. Sourced from /api/ridings/rankings,
// which is public (no auth header needed) and already aggregates every
// riding, so the homepage adds no new backend work.
interface HomeStats {
  totalMonetary: number;
  donationCount: number;
  ridingCount: number;
  /** Highest single-riding all-time total — powers the map preview tooltip. */
  topRidingTotal: number | null;
}

export function HomePage() {
  // `authLoading` matters here: Supabase reads the persisted session
  // asynchronously, so `session` is null on the first render after a refresh.
  // Gating on it prevents a signed-in researcher seeing the Advanced Filters
  // card flash "login required" before it resolves.
  const { session, loading: authLoading } = useAuth();
  const isSignedIn = !!session;

  const [stats, setStats] = useState<HomeStats | null>(null);
  const [statsFailed, setStatsFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetchRidingRankings()
      .then((res) => {
        if (cancelled) return;
        setStats({
          totalMonetary: res.nationalTotals.totalMonetary,
          donationCount: res.nationalTotals.donationCount,
          ridingCount: res.ridingCount,
          // `ridings` arrives sorted descending by total, so [0] is the top one.
          topRidingTotal: res.ridings[0]?.totalMonetary ?? null,
        });
      })
      .catch(() => {
        // The page is still perfectly usable without the numbers, so a failed
        // fetch just leaves the placeholders in place rather than erroring out.
        if (!cancelled) setStatsFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const loadingStats = !stats && !statsFailed;
  const dash = "\u2014";

  // `value: null` means the figure isn't in yet — it renders as a shimmering
  // skeleton while loading, or a muted dash if the fetch failed outright.
  const statItems: { label: string; value: string | null }[] = [
    {
      label: "Total Contributions",
      value: stats ? formatMoney(stats.totalMonetary) : null,
    },
    {
      label: "Donations Recorded",
      value: stats ? stats.donationCount.toLocaleString() : null,
    },
    {
      label: "Ridings Covered",
      value: stats ? stats.ridingCount.toLocaleString() : null,
    },
    // Static — the coverage window isn't fetched, so it never shows a skeleton.
    { label: "Years of Data", value: `${DATA_FIRST_YEAR}\u2013${DATA_LAST_YEAR}` },
  ];

  return (
    <div className="home">
      {/* -- Hero -- */}
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
              About the Data
            </Link>
          </div>
        </div>
      </section>

      {/* -- Stat band -- */}
      <section
        className="home-stats"
        aria-label="Dataset at a glance"
        aria-busy={loadingStats || undefined}
      >
        <div className="home-stats-inner">
          {statItems.map(({ label, value }) => (
            <div className="home-stat" key={label}>
              {value === null && loadingStats ? (
                // Purely decorative: the single live region below announces the
                // loading state once, rather than once per skeleton.
                <span className="home-stat-skeleton" aria-hidden="true" />
              ) : (
                <span className={"home-stat-value" + (value === null ? " unavailable" : "")}>
                  {value ?? dash}
                </span>
              )}
              <span className="home-stat-label">{label}</span>
            </div>
          ))}
        </div>

        <p className="home-visually-hidden" role="status" aria-live="polite">
          {loadingStats ? "Loading national donation totals." : ""}
        </p>

        {statsFailed ? (
          <p className="home-stats-error">
            Live totals couldn&apos;t be loaded. The tools below still work as normal.
          </p>
        ) : null}
      </section>

      {/* -- Tools -- */}
      <section className="home-tools">
        <div className="home-tools-heading">
          <h2>Powerful Analytical Tools</h2>
          <p>
            Built for researchers and journalists. Deep-dive into financial records
            with high-performance tools designed for information density and clarity.
          </p>
        </div>

        <div className="home-tools-grid">
          {TOOL_CARDS.map(
            ({ icon: Icon, iconBg, iconColor, title, description, linkLabel, to, requiresAuth }) => {
              // Three states, not two: while the session is still being read we
              // don't yet know which way this card should render, so it shows a
              // neutral placeholder instead of guessing "locked" and flipping.
              const authPending = !!requiresAuth && authLoading;
              const locked = !!requiresAuth && !authLoading && !isSignedIn;

              return (
                <div
                  key={title}
                  className={"home-tool-card" + (locked ? " locked" : "")}
                  aria-disabled={locked || undefined}
                >
                  <div className="home-tool-icon" style={{ background: iconBg, color: iconColor }}>
                    <Icon size={20} strokeWidth={2} />
                  </div>
                  <h3>{title}</h3>
                  <p>{description}</p>

                  {authPending ? (
                    <span className="home-tool-pending" role="status">
                      Checking access&hellip;
                    </span>
                  ) : locked ? (
                    <span className="home-tool-locked">
                      <Lock size={13} strokeWidth={2} />
                      Researcher login required
                    </span>
                  ) : (
                    <Link to={to} className="home-tool-link">
                      {linkLabel}
                      <ArrowRight size={13} strokeWidth={2} />
                    </Link>
                  )}
                </div>
              );
            }
          )}
        </div>
      </section>

      {/* -- Geospatial CTA -- */}
      <section className="home-geo">
        <div className="home-geo-text">
          <h2>Geospatial Exploration</h2>
          <p>
            Our map-based interface allows for intuitive discovery. Compare donation
            density across Canada, then zoom in to any of the {stats ? stats.ridingCount.toLocaleString() : dash}{" "}
            federal ridings for a detailed breakdown.
          </p>
          <Link to="/riding-lookup" className="home-btn home-btn-primary">
            Look Up a Riding
          </Link>
        </div>

        <div className="home-geo-preview">
          {/* The frame is a teaser for the map, so the whole thing is the link
              rather than repeating the hero's "Explore the Map" button. */}
          <Link to="/map" className="home-geo-preview-frame" aria-label="Open the interactive map">
            <div className="home-geo-tooltip">
              <span className="home-geo-tooltip-label">Highest Riding Total</span>
              <span className="home-geo-tooltip-value">
                {stats?.topRidingTotal != null ? (
                  formatMoney(stats.topRidingTotal)
                ) : loadingStats ? (
                  <span className="home-geo-tooltip-skeleton" aria-hidden="true" />
                ) : (
                  dash
                )}
              </span>
            </div>
            <CanadaSilhouette className="home-geo-map" fill="#cfd8e6" opacity={0.9} />
            <span className="home-geo-preview-cta">
              Explore the map
              <ArrowRight size={13} strokeWidth={2} />
            </span>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
