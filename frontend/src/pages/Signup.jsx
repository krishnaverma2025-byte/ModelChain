import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../supabaseClient";
export default function Signup() {
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  async function signup(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      setMessage(
        "Profile created. Check your email, then optionally link your authenticated wallet from Profile.",
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
        <Link to="/" className="navbar-logo">
          MontAI
        </Link>
        <p className="eyebrow">OPTIONAL HUMAN PROFILE</p>
        <h1>Create a MontAI profile</h1>
        <p>
          This creates a profile, not a blockchain wallet. Your wallet signature
          and contract state determine blockchain access.
        </p>
        {supabase ? (
          <>
            <button disabled={busy} onClick={google}>
              Continue with Google
            </button>
            <form onSubmit={signup}>
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
                  minLength={8}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </label>
              <button disabled={busy} type="submit">
                {busy ? "Creating profile…" : "Create profile"}
              </button>
            </form>
          </>
        ) : (
          <p>
            Optional profile services are not configured. You do not need a
            profile to use your wallet.
          </p>
        )}
        {message && <p role="status">{message}</p>}
        <Link to="/login">Sign in with MetaMask →</Link>
      </section>
    </main>
  );
}
