import { Routes, Route, useLocation } from "react-router-dom";

import NavBar from "./components/NavBar";
import ProtectedRoute from "./components/ProtectedRoute";

import Home from "./pages/Home";
import Agendamentos from "./pages/Agedamentos";
import Admin from "./pages/Admin";
import AdminDia from "./pages/AdminDia";
import AdminLogin from "./pages/AdminLogin";
import AdminRegister from "./pages/AdminRegister";
import AdminServices from "./pages/AdminServices";
import AdminProfessionals from "./pages/AdminProfessionals";
import AdminFuncionamento from "./pages/AdminFuncionamento";
import AdminAparencia from "./pages/AdminAparencia";
import AdminGaleria from "./pages/AdminGaleria";

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
  path="/:slug/agendamento"
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
  path="/admin/servicos"
  element={
    <ProtectedRoute>
      <AdminServices />
    </ProtectedRoute>
  }
/>

<Route
  path="/admin/funcionarios"
  element={
    <ProtectedRoute>
      <AdminProfessionals />
    </ProtectedRoute>
  }
/>

        <Route
  path="/admin/cadastro"
  element={<AdminRegister />}
/>

<Route
  path="/admin/funcionamento"
  element={
    <ProtectedRoute>
      <AdminFuncionamento />
    </ProtectedRoute>
  }
/>

<Route
  path="/admin/aparencia"
  element={
    <ProtectedRoute>
      <AdminAparencia />
    </ProtectedRoute>
  }
/>

<Route
  path="/admin/galeria"
  element={
    <ProtectedRoute>
      <AdminGaleria />
    </ProtectedRoute>
  }
/>

      </Routes>
    </>
  );
}

export default App;