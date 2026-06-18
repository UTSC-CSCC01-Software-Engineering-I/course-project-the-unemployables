import { Globe, Rss, Send } from "lucide-react";
import "./Footer.css";

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer-top">
        <div className="site-footer-brand">
          <span className="site-footer-logo">CDMP</span>
          <p>
            Canadian Donor Mapping Project. Nonpartisan, independent
            accountability into political fundraising through open data and
            visualization.
          </p>
        </div>

        <div className="site-footer-col">
          <h4>Resources</h4>
        </div>

      </div>

      <div className="site-footer-bottom">
        <p>© 2026 Canadian Donor Mapping Project.</p>
        <div className="site-footer-icons">
          <Globe size={16} strokeWidth={1.8} />
          <Rss size={16} strokeWidth={1.8} />
        </div>
      </div>
    </footer>
  );
}
