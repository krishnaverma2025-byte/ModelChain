import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Navbar from "./components/Navbar";

import Home from "./pages/Home";
import Marketplace from "./pages/Marketplace";
import UploadModel from "./pages/UploadModel";
import Dashboard from "./pages/Dashboard";
import Details from "./pages/Details";
import Login from "./pages/Login";
import Profile from "./pages/Profile";

function App() {
  return (
    <BrowserRouter>

      {/* ONE GLOBAL NAVBAR */}
      <Navbar />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/marketplace" element={<Marketplace />} />
        <Route path="/upload-model" element={<UploadModel />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/model/:id" element={<Details />} />
        <Route path="/login" element={<Login />} />
        <Route path="/profile" element={<Profile />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

    </BrowserRouter>
  );
}

export default App;