import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useParams,
  Link,
} from "react-router-dom";

import Navbar from "./components/Navbar";
import AccessServiceNotice from "./components/AccessServiceNotice";

import Activity from "./pages/Activity";
import Home from "./pages/Home";
import Marketplace from "./pages/Marketplace";
import UploadModel from "./pages/UploadModel";
import Dashboard from "./pages/Dashboard";
import Details from "./pages/Details";
import Login from "./pages/Login";
import Profile from "./pages/Profile";
import Signup from "./pages/Signup";
import "./montai.css";
import "./auth.css";
import "./v3.css";
import { useEffect } from "react";
import { initializeIdentity } from "./identity";
import useIdentity from "./useIdentity";
import { config } from "./blockchain";
import { explorerLink } from "./networks.mjs";

function ModelAlias() {
  const { id } = useParams();
  return <Navigate to={`/model/${encodeURIComponent(id)}`} replace />;
}

function Footer() {
  const contract = explorerLink(config.chainId, "address", config.address);
  return (
    <footer className="site-footer">
      <strong>MontAI</strong>
      <span>Verifiable AI ownership. Secure model access.</span>
      <nav aria-label="Footer navigation">
        <Link to="/activity">Activity & status</Link>
        {contract ? (
          <a href={contract} target="_blank" rel="noopener noreferrer">
            Contract ↗
          </a>
        ) : (
          <span>Local development</span>
        )}
        <Link to="/profile">Profile</Link>
      </nav>
    </footer>
  );
}

function App() {
  const identity = useIdentity();
  useEffect(initializeIdentity, []);
  return (
    <BrowserRouter>
      <Navbar key={`navbar:${identity.revision}`} />
      <AccessServiceNotice />

      <Routes key={`session:${identity.revision}`}>
        {/* HOME */}
        <Route path="/" element={<Home />} />

        {/* MAIN PAGES */}
        <Route path="/marketplace" element={<Marketplace />} />
        <Route path="/upload-model" element={<UploadModel />} />
        <Route
          path="/upload"
          element={<Navigate to="/upload-model" replace />}
        />
        <Route path="/activity" element={<Activity />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/model/:id" element={<Details />} />
        <Route path="/models/:id" element={<ModelAlias />} />

        {/* AUTHENTICATION */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* PROFILE */}
        <Route path="/profile" element={<Profile />} />

        {/* ANY UNKNOWN URL */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Footer />
    </BrowserRouter>
  );
}

export default App;
