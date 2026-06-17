import { MapCNPage } from './pages/MapCNPage';
import './App.css';

function App() {
  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header-left">
          <h1>Canadian Donation Map</h1>
          <p>Federal political contributions · 1993 – 2024</p>
        </div>
      </header>
      <MapCNPage />
    </div>
  );
}

export default App;
