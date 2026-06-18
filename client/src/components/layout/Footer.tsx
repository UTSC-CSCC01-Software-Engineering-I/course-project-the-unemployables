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
          <a href="#">Documentation</a>
          <a href="#">API Access</a>
          <a href="#">Methodology</a>
        </div>

        <div className="site-footer-col">
          <h4>Legal</h4>
          <a href="#">Privacy Policy</a>
          <a href="#">Terms of Use</a>
          <a href="#">Data Attribution</a>
        </div>

        <div className="site-footer-col site-footer-newsletter">
          <h4>Newsletter</h4>
          <form
            className="site-footer-form"
            onSubmit={(e) => e.preventDefault()}
          >
            <input type="email" placeholder="Email" aria-label="Email address" />
            <button type="submit" aria-label="Subscribe">
              <Send size={14} strokeWidth={2.2} />
            </button>
          </form>
        </div>
      </div>

      <div className="site-footer-bottom">
        <p>© 2026 Canadian Donor Mapping Project. Non-partisan and independent.</p>
        <div className="site-footer-icons">
          <Globe size={16} strokeWidth={1.8} />
          <Rss size={16} strokeWidth={1.8} />
        </div>
      </div>
    </footer>
  );
}
