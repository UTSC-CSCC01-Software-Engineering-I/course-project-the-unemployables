import { Database, RefreshCw, ScanSearch, BookOpen, Scale, Mail } from "lucide-react";
import { Footer } from "@/components/layout/Footer";
import "./AboutPage.css";

// ─────────────────────────────────────────────────────────────────────────
// TEMPLATE / SCAFFOLD ONLY.
//
// The structure, headings and styling here are final — the body copy is
// placeholder text to be replaced with the real methodology write-up. Every
// placeholder is marked with `about-placeholder` so it's easy to find (and
// visually obvious in the browser) until it's filled in.
// ─────────────────────────────────────────────────────────────────────────

interface AboutSection {
  id: string;
  icon: typeof Database;
  title: string;
  /** What this section needs to answer once it's written for real. */
  intent: string;
  /** Placeholder bullet scaffolding — replace with real content. */
  points: string[];
}

const SECTIONS: AboutSection[] = [
  {
    id: "source",
    icon: Database,
    title: "Data Source",
    intent:
      "Where the contribution records come from, and a direct link to the original publisher so readers can verify anything they see here.",
    points: [
      "Publishing body and dataset name.",
      "Link to the official source dataset.",
      "Licence / terms of reuse.",
      "Which import produced the data currently displayed.",
    ],
  },
  {
    id: "updates",
    icon: RefreshCw,
    title: "Update Frequency",
    intent:
      "How current the numbers are, so a journalist knows whether they're safe to cite today.",
    points: [
      "How often the dataset is re-imported.",
      "Date of the most recent successful import.",
      "Expected lag between a contribution being filed and appearing here.",
    ],
  },
  {
    id: "scope",
    icon: ScanSearch,
    title: "Scope & Limitations",
    intent:
      "The honest boundaries of the dataset — what it does not cover is as important as what it does.",
    points: [
      "Years covered (currently 2004–2024) and jurisdictions included.",
      "Contribution types included vs. excluded (e.g. monetary vs. in-kind).",
      "Known gaps, amendments, or records excluded during import.",
      "Rounding, aggregation, and privacy thresholds applied before display.",
    ],
  },
  {
    id: "glossary",
    icon: BookOpen,
    title: "Glossary",
    intent:
      "Plain-language definitions for the terms used across the map, lookup, and trends pages.",
    points: [
      "Riding / electoral district (and what FED_NUM refers to).",
      "Monetary vs. non-monetary contribution.",
      "Contributor type.",
      "Fiscal year vs. calendar year.",
      "Party abbreviations used throughout the site.",
    ],
  },
  {
    id: "neutrality",
    icon: Scale,
    title: "Non-Partisan Statement",
    intent:
      "Backs up the 'non-partisan' claim made on the homepage with a concrete statement of editorial stance.",
    points: [
      "Statement of independence and funding.",
      "How parties are ordered and coloured, and why that isn't an endorsement.",
      "What this project does not do (no ranking, scoring, or commentary on parties).",
    ],
  },
  {
    id: "contact",
    icon: Mail,
    title: "Corrections & Contact",
    intent:
      "A route for reporting a record that looks wrong — important for credibility on public-finance data.",
    points: [
      "Contact address for data corrections.",
      "What to include in a correction report.",
      "How corrections are handled and published.",
    ],
  },
];

export function AboutPage() {
  return (
    <div className="about">
      <section className="about-hero">
        <span className="about-badge">Methodology &amp; Sources</span>
        <h1 className="about-title">About the Data</h1>
        <p className="about-subtitle">
          How this dataset is sourced, how often it&apos;s refreshed, what it covers,
          and where its limits are.
        </p>
        <p className="about-draft-note">
          This page is a work in progress — the sections below are scaffolded and
          the content is being written.
        </p>
      </section>

      <section className="about-body">
        {SECTIONS.map(({ id, icon: Icon, title, intent, points }) => (
          <article key={id} id={id} className="about-section">
            <div className="about-section-head">
              <div className="about-section-icon">
                <Icon size={18} strokeWidth={2} />
              </div>
              <h2>{title}</h2>
            </div>

            <p className="about-section-intent">{intent}</p>

            <ul className="about-placeholder-list">
              {points.map((point) => (
                <li key={point} className="about-placeholder">
                  {point}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </section>

      <Footer />
    </div>
  );
}
