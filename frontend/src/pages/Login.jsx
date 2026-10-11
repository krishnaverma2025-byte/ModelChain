import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../supabaseClient";
import useIdentity from "../useIdentity";
import WalletGate from "../components/WalletGate";
import { CopyValue } from "../components/UI";
export default function Login() {
  const identity = useIdentity();
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  async function profileLogin(e) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      setMessage(
        "Optional profile signed in. Blockchain access still requires your wallet signature.",
      );
    } catch (e) {
      setMessage(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function google() {
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin + "/profile" },
      });
      if (error) throw error;
    } catch (e) {
      setMessage(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="auth-page">
      <section className="auth-card">
        <Link className="navbar-logo" to="/">
          MontAI
        </Link>
        <p className="eyebrow">WALLET IDENTITY</p>
        <h1>Sign in to MontAI</h1>
        <p>
          Use your Ethereum wallet to register models, manage licenses and
          access protected downloads. Authentication is a free signature, not a
          transaction.
        </p>
        {identity.authenticated ? (
          <div className="notice">
            <h3>Wallet authenticated</h3>
            <CopyValue
              value={identity.authenticated}
              label="authenticated wallet"
            />
            <Link to="/dashboard">Open your workspace →</Link>
          </div>
        ) : (
          <WalletGate action="use blockchain features" />
        )}
        <div className="auth-divider">Optional profile</div>
        <p className="caption">
          Google/email creates a human profile only. It does not grant
          ownership, licenses or download access.
        </p>
        {supabase ? (
          <>
            <button onClick={google} disabled={busy}>
              Continue with Google
            </button>
            <form onSubmit={profileLogin}>
              <label>
                Email
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </label>
              <label>
                Password
                <input
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </label>
              <button type="submit" disabled={busy}>
                {busy ? "Signing in…" : "Continue with Email"}
              </button>
            </form>
          </>
        ) : (
          <p>
            Optional profile services are not configured. Wallet sign-in remains
            available.
          </p>
        )}
        {message && <p role="status">{message}</p>}
        <p>
          New here? <Link to="/signup">Create profile</Link>
        </p>
        <Link to="/marketplace">Browse without signing in →</Link>
      </section>
    </main>
  );
}
