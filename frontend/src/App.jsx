import { BrowserRouter, Routes, Route } from "react-router-dom";

import Navbar from "./components/Navbar";

import Home from "./pages/Home";
import Marketplace from "./pages/Marketplace";
import Details from "./pages/Details";

function App() {
  return (
    <BrowserRouter>

      {/* NAVBAR — appears on every page */}
      <Navbar />

      <Routes>

        {/* Home */}
        <Route
          path="/"
          element={<Home />}
        />

        {/* Marketplace */}
        <Route
          path="/marketplace"
          element={<Marketplace />}
        />

        {/* Model Details */}
        <Route
          path="/model/:id"
          element={<Details />}
        />

      </Routes>

    </BrowserRouter>
  );
}

export default App;