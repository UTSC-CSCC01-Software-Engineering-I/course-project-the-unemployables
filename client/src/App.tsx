import { useEffect, useRef, useState } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { TopNav } from "./components/layout/TopNav";
import { Sidebar } from "./components/layout/Sidebar";
import { HomePage } from "./pages/HomePage";
import { AboutPage } from "./pages/AboutPage";
import { MapCNPage } from "./pages/MapCNPage";
import { DonationTrendsPage } from "./pages/DonationTrendsPage";
import { RidingLookupPage } from "./pages/RidingLookupPage";
import { ResearcherLoginUIpage } from "./pages/ResearcherLogin";
import { ResearcherDashboardPage } from "./pages/ResearcherDashboardPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import "./App.css";

function AppLayout() {
  const location = useLocation();
  // The map used to be in this list, which made it a dead end — there was no
  // route from the map to any other tool. It now keeps the sidebar, collapsed
  // to an icon rail so the choropleth still gets the horizontal room it needs.
  const hideSidebarRoutes = ["/login"];
  const hideTopNavRoutes = ["/login"];
  const showSidebar = !hideSidebarRoutes.includes(location.pathname);
  const showTopNav = !hideTopNavRoutes.includes(location.pathname);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  // Once the user collapses or expands it by hand we stop auto-adjusting —
  // their choice outranks the per-route default for the rest of the session.
  const userSetSidebar = useRef(false);

  useEffect(() => {
    if (userSetSidebar.current) return;
    setSidebarCollapsed(location.pathname === "/map");
  }, [location.pathname]);

  const toggleSidebar = () => {
    userSetSidebar.current = true;
    setSidebarCollapsed((collapsed) => !collapsed);
  };

  return (
    <div className="app">
      {showTopNav && <TopNav />}
      <div className="app-body">
        {showSidebar && <Sidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />}
        <main className="app-main">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/map" element={<MapCNPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/riding-lookup" element={<RidingLookupPage />} />
            <Route path="/donation-trends" element={<DonationTrendsPage />} />
            <Route path="/login" element={<ResearcherLoginUIpage />} />
            <Route
              path="/advanced-filters"
              element={
                <ProtectedRoute>
                  <ResearcherDashboardPage />
                </ProtectedRoute>
              }
            />
            {/* Anything unmatched — typo'd URLs, stale bookmarks, dead links in
                someone's article — lands here instead of an empty page. */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppLayout />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
