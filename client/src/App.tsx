import { BrowserRouter, Routes, Route } from "react-router-dom";
import { TopNav } from "./components/layout/TopNav";
import { Sidebar } from "./components/layout/Sidebar";
import { HomePage } from "./pages/HomePage";
import { MapCNPage } from "./pages/MapCNPage";
import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <TopNav />
        <div className="app-body">
          <Sidebar />
          <main className="app-main">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/map" element={<MapCNPage />} />
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;
