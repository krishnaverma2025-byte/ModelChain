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