import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import "./Signup.css";

function Signup() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSignup = async (e) => {
    e.preventDefault();

    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    setMessage("Account created successfully! Check your email.");
    setLoading(false);
  };

  const handleGoogleSignup = async () => {
    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
      },
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
    }
  };

  return (
    <div className="signup-page">
      <div className="signup-card">

        <div className="signup-logo">
          MontAI
        </div>

        <h1>Create Account</h1>

        <p className="signup-subtitle">
          Create your account to start using MontAI.
        </p>

        <form onSubmit={handleSignup}>

          <div className="signup-field">
            <label>Email</label>

            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="signup-field">
            <label>Password</label>

            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="signup-button"
            disabled={loading}
          >
            {loading ? "Creating Account..." : "Sign Up"}
          </button>

        </form>

        {/* GOOGLE SIGNUP */}
        <div className="google-divider">
          <span>OR</span>
        </div>

        <button
          type="button"
          className="google-button"
          onClick={handleGoogleSignup}
          disabled={loading}
        >
          <span className="google-icon">G</span>
          Continue with Google
        </button>

        {message && (
          <div className="signup-message">
            {message}
          </div>
        )}

        <p className="login-text">
          Already have an account?{" "}
          <span onClick={() => navigate("/login")}>
            Login
          </span>
        </p>

        <p
          className="back-home"
          onClick={() => navigate("/")}
        >
          ← Back to Home
        </p>

      </div>
    </div>
  );
}

export default Signup;