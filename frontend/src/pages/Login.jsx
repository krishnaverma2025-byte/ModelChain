import { Link } from "react-router-dom";

function Login() {
  return (
    <div style={styles.page}>
      <div style={styles.box}>
        <Link to="/" style={styles.logo}>
          MontAI
        </Link>

        <h1>Welcome Back</h1>

        <p>Sign in to manage your AI licenses.</p>

        <label>Email</label>
        <input type="email" placeholder="you@example.com" />

        <label>Password</label>
        <input type="password" placeholder="••••••••" />

        <button style={styles.button}>
          Login
        </button>

        <Link to="/" style={styles.back}>
          ← Back to Home
        </Link>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#08090d",
    color: "#fff",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    fontFamily: "Arial, sans-serif",
  },

  box: {
    width: "420px",
    background: "#0d0e14",
    border: "1px solid #292b35",
    borderRadius: "20px",
    padding: "45px",
    display: "flex",
    flexDirection: "column",
    boxSizing: "border-box",
  },

  logo: {
    color: "#9b72ff",
    fontSize: "28px",
    fontWeight: "800",
    textDecoration: "none",
    marginBottom: "35px",
  },

  h1: {
    fontSize: "38px",
  },

  p: {
    color: "#9da0b4",
    marginBottom: "30px",
  },

  input: {
    background: "#101117",
    color: "#fff",
    border: "1px solid #30323d",
    borderRadius: "10px",
    padding: "15px",
    margin: "8px 0 20px",
    fontSize: "16px",
  },

  button: {
    background: "#7040f5",
    border: "none",
    color: "#fff",
    padding: "16px",
    borderRadius: "10px",
    fontWeight: "700",
    fontSize: "16px",
    cursor: "pointer",
  },

  back: {
    color: "#9b72ff",
    textDecoration: "none",
    textAlign: "center",
    marginTop: "25px",
  },
};

export default Login;