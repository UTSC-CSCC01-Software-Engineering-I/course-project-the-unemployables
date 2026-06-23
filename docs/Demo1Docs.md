
## Team Information

**Team Name:** The Unemployables

| Name |
|---|
| Ayyash Anhardeen |
| Akshayan |
| Faris |
| Tri |
| Tareq |

---

---

## Class Diagram

> Initial system architecture as of Demo 1. Database layer is stubbed — types are defined, queries are not yet implemented.
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

    %% ── Relationships ─────────────────────────────────────

    App *-- AppLayout
    AppLayout *-- HomePage : route /
    AppLayout *-- MapCNPage : route /map
    AppLayout *-- ResearcherLoginPage : route /login
    ExpressServer *-- DonationsRouter
    MapCNPage ..> mapcn
```

---

## What Was Completed (Demo 1)

- [x] Project scaffold — React + Express + TypeScript monorepo
- [x] Docker Compose file
- [x] Canada Map rendered
- [x] Express API route structure (temp)
- [x] Landing Page when users enters web app
- [x] Researcher login/signup frontend
- [x] Supabase Auth — researcher login/signup
## What Is Outstanding (moves to Demo 2)

- [ ] Python ingestion script to load Elections Canada CSVs into Supabase

