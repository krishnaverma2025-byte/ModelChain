import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../supabaseClient";
import useIdentity from "../useIdentity";
import WalletGate from "../components/WalletGate";
import { CopyValue, Icon } from "../components/UI";
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
        "Optional profile signed in. Blockchain access still requires your wallet signature."
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
        <Link className="auth-logo" to="/" aria-label="MontAI home">
          <Icon />
        </Link>
        <h1>Welcome to MontAI</h1>
        <p>Authenticate your wallet to publish, license, and manage models.</p>
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
        <p className="caption">
          Google/email is optional and does not grant model access.
        </p>
        {identity.profile && <Link to="/profile">Manage your profile →</Link>}
        {supabase ? (
          <>
            <button onClick={google} disabled={busy}>
              Continue with Google
            </button>
            <form onSubmit={profileLogin}>
              <label>
                <span className="sr-only">Email</span>
                <input
                  type="email"
                  placeholder="Email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </label>
              <label>
                <span className="sr-only">Password</span>
                <input
                  type="password"
                  placeholder="Password"
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
