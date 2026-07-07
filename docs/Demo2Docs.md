## Class Diagram

> Updated for Demo 2.
>
> Visibility: `+` public · `-` private · `#` protected

```mermaid
classDiagram

    %% ── Frontend ──────────────────────────────────────────

    class App {
        +render() : JSX
    }

    class AppLayout {
        -hideSidebarRoutes : string[]
        -shouldShowBar : boolean
        +render() : JSX
    }

    class HomePage {
        +render() : JSX
    }

    class MapCNPage {
        -mode : BoundaryMode
        -selected : SelectedRegion
        -year : number
        -regionData : RegionSummary[]
        -loading : boolean
        +render() : JSX
    }

    class BoundaryLayer {
        -mode : BoundaryMode
        -regionData : RegionSummary[]
        +onSelect(region : SelectedRegion) : void
        +render() : JSX
    }

    class RidingLookupPage {
        +render() : JSX
    }

    class ResearcherLoginPage {
        -email : string
        -password : string
        -isVisible : boolean
        +handleSubmit() : void
        +render() : JSX
    }

    class mapcn {
        <<library>>
        +Map(center : number[], zoom : number, maxBounds : number[][], minZoom : number) : JSX
        +MapControls(position : string, showZoom : boolean, showCompass : boolean) : JSX
    }

    %% ── Backend ──────────────────────────────────────────

    class ExpressServer {
        +listen() : void
    }

    class DonationsRouter {
        +getSummary() : DonationSummary[]
        +getDonations() : Donation[]
    }

    class ProvincesRouter {
        +getSummary(year : number) : ProvinceSummary[]
    }

    class RidingsRouter {
        +getSummary(year : number) : RidingSummary[]
        +getRidingSummary(fedNum : number) : RidingDetail
    }

    class SupabaseClient {
        <<library>>
        +from(table : string) : QueryBuilder
    }

    %% ── Relationships ─────────────────────────────────────

    App *-- AppLayout
    AppLayout *-- HomePage : route /
    AppLayout *-- MapCNPage : route /map
    AppLayout *-- RidingLookupPage : route /riding
    AppLayout *-- ResearcherLoginPage : route /login
    MapCNPage *-- BoundaryLayer
    MapCNPage ..> mapcn
    ExpressServer *-- DonationsRouter
    ExpressServer *-- ProvincesRouter
    ExpressServer *-- RidingsRouter
    ProvincesRouter ..> SupabaseClient
    RidingsRouter ..> SupabaseClient
```

---

## What Was Completed (Demo 2)

- [x] Province choropleth map — donation totals by province with year selector
- [x] Electoral district choropleth map — donation totals by riding with year selector
- [x] Province info panel — total donations, donor count, party breakdown
- [x] Riding lookup page — all-time and per-year donation detail for a single riding
- [x] Supabase data ingestion — 5.4M donation rows (2004–2024)
- [x] Postal code → riding lookup table (883K rows via PCFRF)
- [x] Pre-aggregated riding summary table (riding_party_summary) for fast queries
- [x] Automated tests — server grouping logic and client formatting utilities

## What Is Outstanding (moves to Demo 3)

- [ ] Year trend chart in riding/province info panel
- [ ] Per-capita donation normalization using census population data
- [ ] Filter donations by party on the map
