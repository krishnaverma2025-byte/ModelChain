import { Link } from "react-router-dom";

function Navbar() {
  return (
    <nav className="navbar">

      {/* BRAND */}
      <Link to="/" className="brand">
        <span className="brand-main">Mont</span>
        <span className="brand-ai">AI</span>
      </Link>


      {/* NAVIGATION */}
      <div className="nav-links">

        <Link to="/">
          Home
        </Link>

        <Link to="/marketplace">
          Marketplace
        </Link>

        <Link to="/upload">
          Upload Model
        </Link>

        <Link to="/dashboard">
          Dashboard
        </Link>

      </div>


      {/* WALLET */}
      <button className="wallet-button">
        Connect Wallet
      </button>

    </nav>
  );
}

export default Navbar;