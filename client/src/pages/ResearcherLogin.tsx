import { useState } from "react";
import { Mail, LockKeyholeIcon, KeyIcon, Info, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Footer } from "@/components/layout/Footer";
import './ResearcherLogin.css'
 
export function ResearcherLoginUIpage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isVisible, setIsVisible] = useState(false);

 
  const handleSubmit = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (email === "" || password === "") {
      setIsVisible(true);
      return;
    } else {
      setIsVisible(false);
      return;
    }
  };
 
  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      {/* create a header with both the brand and help link, login-topbar pushes each element to the end*/}
      <header className="login-topbar">
        <span className="login-topbar-brand">CDMP Researcher Portal</span>
        <a href="#" className="login-topbar-help">Help Center</a>
      </header>
 
      {/* main body that contains the login card */}
      <main className="login-bg">
        <div className="login-card">
          {/* central key icon at the top */}
          <div className="login-icon-wrap">
            <LockKeyholeIcon size={22} strokeWidth={2} color="#ffffff" />
          </div>
 
          {/* title heading, it's a h2 element here as it's quite big */}
          <div className="login-heading-group">
            <h2 className="login-title">Researcher Access Login</h2>
            <p className="login-subtitle">Restricted to university-affiliated users only.</p>
          </div>
 
          {/* input text fields that we expect from the user */}
          <div className="login-fields">
            {/* the id here is institutional-email, we're expecting an email type */}
            <div className="login-field-group">
              <label className="login-label" htmlFor="institutional-email">
                Institutional Email
              </label>
              <div className="login-input-wrap">
                <Mail size={15} strokeWidth={1.8} className="login-input-icon" />
                <input
                  id="institutional-email"
                  type="email"
                  className="login-input"
                  placeholder="you@university.ca"
                  value={email}                               /* save to a variable called email */
                  onChange={(e) => setEmail(e.target.value)}  /* constantly record new text and update variable */
                  autoComplete="email"
                />
              </div>
            </div>
 
            {/* the id here is password, we're expecting an password type */}
            <div className="login-field-group">
              <div className="login-label-row">
                <label className="login-label" htmlFor="password">
                  Password
                </label>
                <a href="#" className="login-forgot">Forgot password?</a>
              </div>
              <div className="login-input-wrap">
                <KeyIcon size={15} strokeWidth={1.8} className="login-input-icon" />
                <input
                  id="password"
                  type="password"     /* since the type here is password, it is masked when user enters */
                  className="login-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>
            </div>
          </div>
 
          {/* submit button where the logic is handled in the handleSubmit function */}
          <button className="login-button" onClick={handleSubmit}>
            Log In
          </button>

          <hr className="login-divider" />

          {/* error message if we have empty fields (currently) */}
          {isVisible && <p className="error">Enter a valid username/password</p>}

          <div className="login-notice">
            <Info size={15} strokeWidth={1.8} className="login-notice-icon" />
            <p className="login-notice-text">
              Access is restricted to authorized researchers. All sessions are logged for
              audit compliance.
            </p>
          </div>
        </div>
 
        {/* link to the homepage if the user no longer wants to login */}
        <a href="#" className="login-public-link">
          <ArrowLeft size={13} strokeWidth={2} />
          <Link to="/">
                Not affiliated? Return to Public Map.
            </Link>
        </a>
 
      </main>

      {/* add original footer seen on all pages */}
      <Footer />
    </div>
  );
}