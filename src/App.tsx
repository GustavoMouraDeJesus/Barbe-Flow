import { Routes, Route, useLocation } from "react-router-dom";

import NavBar from "./components/NavBar";
import ProtectedRoute from "./components/ProtectedRoute";

import Home from "./pages/Home";
import Agendamentos from "./pages/Agedamentos";
import Admin from "./pages/Admin";
import AdminDia from "./pages/AdminDia";
import AdminLogin from "./pages/AdminLogin";
import AdminRegister from "./pages/AdminRegister";

function App() {
  const location = useLocation();

  const isAdminPage = location.pathname.startsWith("/admin");

  return (
    <>
      {!isAdminPage && <NavBar />}

      <Routes>
        <Route path="/" element={<Home />} />

        <Route
          path="/agendamento"
          element={<Agendamentos />}
        />

        <Route
          path="/admin/login"
          element={<AdminLogin />}
        />

        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <Admin />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/dia"
          element={
            <ProtectedRoute>
              <AdminDia />
            </ProtectedRoute>
          }
        />

        <Route
  path="/admin/cadastro"
  element={<AdminRegister />}
/>
      </Routes>
    </>
  );
}

export default App;