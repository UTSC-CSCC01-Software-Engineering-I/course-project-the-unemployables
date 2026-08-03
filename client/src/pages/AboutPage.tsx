import { Database, ScanSearch, BookOpen } from "lucide-react";
import { Footer } from "@/components/layout/Footer";
import { DATA_FIRST_YEAR, DATA_LAST_YEAR } from "@/utils/years";
import "./AboutPage.css";

// Content here is deliberately limited to facts that are already established
// elsewhere in this repo (CDMP-data/README.md, utils/years.ts, types/index.ts,
// utils/province.ts, the Footer). Update frequency, licensing terms and a
// corrections contact are NOT documented anywhere yet, so those sections have
// been left off rather than filled with guesses.

/** Parties present in the source data — CDMP-data/README.md, types/index.ts. */
const PARTIES: { abbr: string; name: string }[] = [
  { abbr: "BQ", name: "Bloc Québécois" },
  { abbr: "CPC", name: "Conservative Party of Canada" },
  { abbr: "GPC", name: "Green Party of Canada" },
  { abbr: "LPC", name: "Liberal Party of Canada" },
  { abbr: "NDP", name: "New Democratic Party" },
  { abbr: "PPC", name: "People's Party of Canada" },
];

const GLOSSARY: { term: string; definition: string }[] = [
  {
    term: "Riding (federal electoral district)",
    definition:
      "The geographic areas that elect one member of Parliament each. District boundaries used on this site are published by Elections Canada.",
  },
  {
    term: "FED_NUM",
    definition:
      "Elections Canada's numeric identifier for a riding. Its first two digits are the Statistics Canada Standard Geographical Classification code for the province or territory the riding sits in, which is how ridings are matched to provinces here.",
  },
  {
    term: "Monetary and non-monetary contributions",
    definition:
      "Contribution records distinguish monetary amounts from non-monetary ones. Every total, ranking and chart on this site is calculated from monetary contributions only.",
  },
  {
    term: "Contributor type",
    definition:
      "A classification attached to each contribution record by Elections Canada, carried through unchanged from the source data.",
  },
  {
    term: "Year",
    definition:
      "Records carry both a fiscal year and a contribution date. Totals and trends on this site are grouped by year.",
  },
  {
    term: "Donations vs. donors",
    definition:
      "A donation count is the number of individual contribution records. A donor count is the number of distinct contributors behind them, so one donor may account for several donations.",
  },
];

export function AboutPage() {
  return (
    <div className="about">
      <section className="about-hero">
        <span className="about-badge">Methodology &amp; Sources</span>
        <h1 className="about-title">About the Data</h1>
        <p className="about-subtitle">
          Where the contribution records on this site come from, what they cover,
          and what the terms used across the map, lookup and trends pages mean.
        </p>
      </section>

      <section className="about-body">
        {/* ── Data source ── */}
        <article id="source" className="about-section">
          <div className="about-section-head">
            <div className="about-section-icon">
              <Database size={18} strokeWidth={2} />
            </div>
            <h2>Data Source</h2>
          </div>

          <p className="about-section-intent">
            Everything shown here is derived from public data, published by
            Elections Canada.
          </p>

          <ul className="about-list">
            <li>
              Contribution figures come from Elections Canada&apos;s annual
              political contribution returns — one set of records per party, per
              year.
            </li>
            <li>
              Electoral district boundaries are also published by Elections
              Canada.
            </li>
            <li>
              Ridings are matched to a province or territory using Statistics
              Canada&apos;s Standard Geographical Classification codes, which are
              already encoded in each riding&apos;s FED_NUM.
            </li>
            <li>
              Source files are loaded as published; the site aggregates them but
              does not edit the underlying records.
            </li>
          </ul>
        </article>

        {/* ── Coverage & scope ── */}
        <article id="scope" className="about-section">
          <div className="about-section-head">
            <div className="about-section-icon">
              <ScanSearch size={18} strokeWidth={2} />
            </div>
            <h2>Coverage &amp; Scope</h2>
          </div>

          <p className="about-section-intent">
            What the dataset behind this site includes — and what it leaves out.
          </p>

          <ul className="about-list">
            <li>
              <strong>
                {DATA_FIRST_YEAR}&ndash;{DATA_LAST_YEAR}
              </strong>{" "}
              is the coverage window for every page on this site. Roughly 5.4
              million contribution records fall inside it.
            </li>
            <li>
              Elections Canada publishes contribution returns back to 1993, but
              the pre-{DATA_FIRST_YEAR} archive is <strong>not</strong> loaded
              here. Nothing on this site reflects it.
            </li>
            <li>
              Six parties appear in the data: {PARTIES.map((p) => p.abbr).join(", ")}.
              Contributions to any other party or to independent candidates are
              not included.
            </li>
            <li>
              All thirteen provinces and territories are covered.
            </li>
            <li>
              Only monetary contributions are counted in the totals shown.
            </li>
            <li>
              Figures on the public pages are aggregated. Individual-level
              records are restricted to approved, university-affiliated
              researchers.
            </li>
          </ul>
        </article>

        {/* ── Glossary ── */}
        <article id="glossary" className="about-section">
          <div className="about-section-head">
            <div className="about-section-icon">
              <BookOpen size={18} strokeWidth={2} />
            </div>
            <h2>Glossary</h2>
          </div>

          <p className="about-section-intent">
            Plain-language definitions for the terms used across the site.
          </p>

          <dl className="about-glossary">
            {GLOSSARY.map(({ term, definition }) => (
              <div key={term} className="about-glossary-row">
                <dt>{term}</dt>
                <dd>{definition}</dd>
              </div>
            ))}
          </dl>

          <h3 className="about-subhead">Party abbreviations</h3>
          <dl className="about-glossary about-glossary-compact">
            {PARTIES.map(({ abbr, name }) => (
              <div key={abbr} className="about-glossary-row">
                <dt>{abbr}</dt>
                <dd>{name}</dd>
              </div>
            ))}
          </dl>
        </article>
      </section>

      <Footer />
    </div>
  );
}
