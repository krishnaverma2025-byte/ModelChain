import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Navbar from "./components/Navbar";

import Home from "./pages/Home";
import Marketplace from "./pages/Marketplace";
import UploadModel from "./pages/UploadModel";
import Dashboard from "./pages/Dashboard";
import Details from "./pages/Details";
import Login from "./pages/Login";
import Profile from "./pages/Profile";
import Signup from "./pages/Signup";
import "./montai.css";
import { supabase } from "./supabaseClient";

const accountUnavailable = <main className="details-page"><h1>Account services are not configured</h1><p>Wallet licensing is available without a profile. Configure Supabase to enable login, signup and profiles.</p></main>;

function App() {
  return (
    <BrowserRouter>
      <Navbar />

      <Routes>

        {/* HOME */}
        <Route path="/" element={<Home />} />

        {/* MAIN PAGES */}
        <Route path="/marketplace" element={<Marketplace />} />
        <Route path="/upload-model" element={<UploadModel />} />
        <Route path="/upload" element={<UploadModel />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/model/:id" element={<Details />} />

        {/* AUTHENTICATION */}
        <Route path="/login" element={supabase ? <Login /> : accountUnavailable} />
        <Route path="/signup" element={supabase ? <Signup /> : accountUnavailable} />

        {/* PROFILE */}
        <Route path="/profile" element={supabase ? <Profile /> : accountUnavailable} />

        {/* ANY UNKNOWN URL */}
        <Route path="*" element={<Navigate to="/" replace />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;
