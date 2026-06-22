import { useState } from "react";
import "./invalidFilterPopUp.css";
import { RefreshCw } from "lucide-react";
export function InvalidFilterPopUp() {
  const [isOpen, setIsOpen] = useState(true);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="invalid-filter-popup-backdrop"
      role="dialog"
      aria-modal="true"
    >
      <div className="invalid-filter-popup">
        <div className="invalid-filter-popup-icon">⚠️</div>
        <h3>No Data Available</h3>
        <p>
          No boundary data available for the selected region. Please adjust your
          filters or select a different area.
        </p>
        <button
          className="reset-filters-button"
          onClick={() => setIsOpen(false)}
        >
          <RefreshCw size={16} />
          Reset Filters
        </button>
      </div>
    </div>
  );
}
