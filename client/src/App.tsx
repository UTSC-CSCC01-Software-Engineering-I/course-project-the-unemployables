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
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import "./App.css";

function AppLayout() {
  const location = useLocation();
  const hideSidebarRoutes = ['/login', '/map'];
  const hideTopNavRoutes = ['/login'];
  const showSidebar = !hideSidebarRoutes.includes(location.pathname);
  const showTopNav = !hideTopNavRoutes.includes(location.pathname);

  return (
      <div className="app">
        {showTopNav && <TopNav />}
        <div className="app-body">
          {showSidebar && <Sidebar />}
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
