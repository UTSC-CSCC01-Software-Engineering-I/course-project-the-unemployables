import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { TopNav } from "./components/layout/TopNav";
import { Sidebar } from "./components/layout/Sidebar";
import { HomePage } from "./pages/HomePage";
import { MapCNPage } from "./pages/MapCNPage";
import { DonationTrendsPage } from "./pages/DonationTrendsPage";
import { ResearcherLoginUIpage } from "./pages/ResearcherLogin";
import "./App.css";

function AppLayout() {
  const location = useLocation();
  const hideSidebarRoutes = ['/login'];
  const shouldShowBar = !hideSidebarRoutes.includes(location.pathname);

  return (
      <div className="app">
        {shouldShowBar && <TopNav />}
        <div className="app-body">
          {shouldShowBar && <Sidebar />}
          <main className="app-main">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/map" element={<MapCNPage />} />
              <Route path="/donation-trends" element={<DonationTrendsPage />} />
              <Route path="/login" element={<ResearcherLoginUIpage />} />
            </Routes>
          </main>
        </div>
      </div>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  );
}

export default App;
