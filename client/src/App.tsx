import { useState } from 'react';
import { DonationMap, PROVINCE_NAMES } from './components/Map/DonationMap';
import './App.css';

function App() {
  const [selectedCode, setSelectedCode] = useState('');

  return (
    <div className="app">
      <header className="app-header">
        <h1>Canadian Donation Map</h1>
        <p>Federal political contributions · 1993 – 2024</p>
      </header>

      <main className="app-body">
        <div className="map-box">
          <DonationMap selectedCode={selectedCode} onSelect={setSelectedCode} />
        </div>

        <aside className="info-panel">
          {selectedCode ? (
            <>
              <div className="info-panel-header">
                <div>
                  <h2 className="info-province-name">{PROVINCE_NAMES[selectedCode]}</h2>
                  <span className="info-province-code">{selectedCode}</span>
                </div>
                <button className="info-close" onClick={() => setSelectedCode('')}>✕</button>
              </div>

              <div className="info-section">
                <h3 className="info-section-title">Donation Summary</h3>
                <p className="info-placeholder">Connect to database to see totals.</p>
              </div>

              <div className="info-section">
                <h3 className="info-section-title">By Party</h3>
                <p className="info-placeholder">Party breakdown will appear here.</p>
              </div>

              <div className="info-section">
                <h3 className="info-section-title">Trend (1993 – 2024)</h3>
                <p className="info-placeholder">Year-over-year chart will appear here.</p>
              </div>
            </>
          ) : (
            <div className="info-empty">
              <p>Click a province or territory on the map to see donation details.</p>
            </div>
          )}
        </aside>
      </main>
    </div>
  );
}

export default App;
