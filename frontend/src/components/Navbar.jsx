import { Link, NavLink } from "react-router-dom";
import WalletStatus from "./WalletStatus";
import { Icon } from "./UI";
export default function Navbar() {
  return (
    <header className="navbar">
      <Link to="/" className="navbar-logo">
        <span className="brand-mark">
          <Icon />
        </span>
        MontAI
      </Link>
      <nav className="navbar-links" aria-label="Primary navigation">
        <NavLink to="/" end>
          Home
        </NavLink>
        <NavLink to="/marketplace">Marketplace</NavLink>
        <NavLink to="/upload-model">Upload</NavLink>
        <NavLink to="/dashboard">Dashboard</NavLink>
        <NavLink to="/activity">Activity</NavLink>
      </nav>
      <div className="navbar-right">
        <WalletStatus />
      </div>
    </header>
  );
}
