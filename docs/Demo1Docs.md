
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
        -TOOL_CARDS : ToolCard[]
        +render() : JSX
    }

    class ToolCard {
        <<interface>>
        +icon : LucideIcon
        +iconBg : string
        +iconColor : string
        +title : string
        +description : string
        +linkLabel : string
    }

    class Footer {
        +render() : JSX
    }

    class CanadaSilhouette {
        +fill : string
        +opacity : number
        +className : string
        +render() : JSX
    }

    class MapCNPage {
        +render() : JSX
    }

    class ResearcherLoginUIpage {
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

    %% ── Backend (stubbed) ────────────────────────────────

    class ExpressServer {
        +listen() : void
    }

    class DonationsRouter {
        <<stub>>
        +getSummary() : DonationSummary[]
        +getDonations() : Donation[]
    }

    %% ── Relationships ─────────────────────────────────────

    %% Composition: child cannot exist without parent
    App *-- AppLayout : renders
    AppLayout *-- HomePage : route /
    AppLayout *-- MapCNPage : route /map
    AppLayout *-- ResearcherLoginUIpage : route /login
    HomePage *-- Footer : renders
    HomePage *-- CanadaSilhouette : renders
    HomePage "1" *-- "many" ToolCard : contains
    ExpressServer *-- DonationsRouter : registers

    %% Dependency: MapCNPage calls mapcn Map with props
    MapCNPage ..> mapcn : instantiates Map + MapControls
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

