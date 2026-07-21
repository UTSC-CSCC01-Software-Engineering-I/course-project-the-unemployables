## Class Diagram

> Updated for Demo 3.
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
        -selectedYears : number[]
        -selectedParty : string | null
        -regionData : RegionSummary[]
        -trendData : YearSummary[]
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
        -selectedRiding : RidingMeta | null
        -summary : RidingSummary | null
        -selectedYears : number[]
        -metric : "total" | "average"
        -compareRiding : RidingMeta | null
        +render() : JSX
    }

    class DonationTrendsPage {
        -selectedYear : number
        -selectedProvince : string
        -yearRows : ChartRow[]
        -monthRows : ChartRow[]
        -hidden : Set~string~
        -chartType : "line" | "bar" | "pie"
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

    class recharts {
        <<library>>
        +LineChart(data : ChartRow[]) : JSX
        +BarChart(data : ChartRow[]) : JSX
        +PieChart(data : ChartRow[]) : JSX
        +XAxis(dataKey : string) : JSX
        +YAxis() : JSX
        +ResponsiveContainer(width : string, height : number) : JSX
    }

    %% ── Backend ──────────────────────────────────────────

    class ExpressServer {
        +listen() : void
    }

    class DonationsRouter {
        +getSummary() : DonationSummary[]
        +getDonations() : Donation[]
        +getSumByYearParty() : DonationYearPartySum[]
        +getSumByMonth(year : number) : DonationMonthPartySum[]
        +getSumByProvinceYear(province : string) : DonationYearPartySum[]
        +getSumByProvinceMonth(province : string, year : number) : DonationMonthPartySum[]
    }

    class ProvincesRouter {
        +getSummary(years : number[], party? : string) : ProvinceSummary[]
        +getProvinceSummary(code : string) : ProvinceYearDetail
    }

    class RidingsRouter {
        +getRankings() : RidingRankingsResponse
        +getSummary(years : number[], party? : string) : RidingSummary[]
        +getRidingSummary(fedNum : number) : RidingDetail
    }

    class SupabaseClient {
        <<library>>
        +from(table : string) : QueryBuilder
    }

    class province_year_total {
        <<materialized view>>
        +province : string
        +year : number
        +total_monetary : number
        +donation_count : number
        +donor_count : number
    }

    class province_party_year_total {
        <<materialized view>>
        +province : string
        +party : string
        +year : number
        +total_monetary : number
        +donation_count : number
        +donor_count : number
    }

    class riding_year_total {
        <<materialized view>>
        +fed_num : number
        +year : number
        +total_monetary : number
        +donation_count : number
        +donor_count : number
    }

    class riding_party_summary {
        <<materialized view>>
        +fed_num : number
        +party : string
        +year : number
        +total_monetary : number
        +donation_count : number
        +donor_count : number
    }

    %% ── Relationships ─────────────────────────────────────

    App *-- AppLayout
    AppLayout *-- HomePage : route /
    AppLayout *-- MapCNPage : route /map
    AppLayout *-- RidingLookupPage : route /riding
    AppLayout *-- DonationTrendsPage : route /donation-trends
    AppLayout *-- ResearcherLoginPage : route /login
    MapCNPage *-- BoundaryLayer
    MapCNPage ..> mapcn
    DonationTrendsPage ..> recharts
    ExpressServer *-- DonationsRouter
    ExpressServer *-- ProvincesRouter
    ExpressServer *-- RidingsRouter
    ProvincesRouter ..> SupabaseClient
    ProvincesRouter ..> province_year_total
    ProvincesRouter ..> province_party_year_total
    RidingsRouter ..> SupabaseClient
    RidingsRouter ..> riding_year_total
    RidingsRouter ..> riding_party_summary
    DonationsRouter ..> SupabaseClient
```

---

## What Was Completed (Demo 3)

- [x] Multi-year average mode on the choropleth map with party filter
- [x] Province and riding info panels with donation breakdowns
- [x] Monthly donations chart in the province info panel
- [x] Donation Trends page — province filter and bar/pie chart view types
- [x] Riding Lookup page — national rank, vs-average comparison, province filter, and compare mode
- [x] Researcher dashboard locked behind authentication — unauthenticated users are redirected to login and returned to their original page after signing in
- [x] Session persistence — users remain logged in across page refreshes
- [x] Automated tests — login flow, server-side auth blocking, map utilities, and page behaviour (52 total, all passing)

## Test Screenshots

**Server tests (14 tests) and client tests (38 tests):**

![Tests passing](test1.png)

---

## What Is Outstanding

- [ ] Per-capita donation normalization using census population data (requires population table import and per-province/riding join)
- [ ] Year trend chart in riding/province info panel (built but commented out — data quality review pending)
