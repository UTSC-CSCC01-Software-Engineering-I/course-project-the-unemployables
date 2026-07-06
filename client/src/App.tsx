import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { TopNav } from "./components/layout/TopNav";
import { Sidebar } from "./components/layout/Sidebar";
import { HomePage } from "./pages/HomePage";
import { MapCNPage } from "./pages/MapCNPage";
import { RidingLookupPage } from "./pages/RidingLookupPage";
import { ResearcherLoginUIpage } from "./pages/ResearcherLogin";
import { ResearcherDashboardPage } from "./pages/ResearcherDashboardPage";
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
              <Route path="/riding-lookup" element={<RidingLookupPage />} />
              <Route path="/login" element={<ResearcherLoginUIpage />} />
              <Route path="/advanced-filters" element={<ResearcherDashboardPage />} />
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
