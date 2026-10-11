import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Navbar from "./components/Navbar";

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
import "./marketplace-refinement.css";
import { useEffect } from "react";
import { initializeIdentity } from "./identity";
import useIdentity from "./useIdentity";

function App() {
  const identity = useIdentity();
  useEffect(initializeIdentity, []);
  return (
    <BrowserRouter>
      <Navbar key={`navbar:${identity.revision}`} />

      <Routes key={`session:${identity.revision}`}>
        {/* HOME */}
        <Route path="/" element={<Home />} />

        {/* MAIN PAGES */}
        <Route path="/marketplace" element={<Marketplace />} />
        <Route path="/upload-model" element={<UploadModel />} />
        <Route path="/upload" element={<UploadModel />} />
        <Route path="/activity" element={<Activity />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/model/:id" element={<Details />} />

        {/* AUTHENTICATION */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* PROFILE */}
        <Route path="/profile" element={<Profile />} />

        {/* ANY UNKNOWN URL */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
