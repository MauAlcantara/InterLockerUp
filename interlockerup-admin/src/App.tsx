import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom"
import LoginPage from "./pages/LoginPage"
import DashboardLayout from "./layouts/DashboardLayout"
import DashboardPage from "./pages/DashboardPage"
import UsuariosPage from "./pages/UsuariosPage"
import LockersPage from "./pages/LockersPage"
import IncidenciasPage from "./pages/IncidenciasPage"
import AuditoriasPage from "./pages/AuditoriasPage"

const ProtectedRoute = () => {
  const token = localStorage.getItem("admin_token")

  if (!token) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rutas Públicas */}
        <Route path="/" element={<LoginPage />} />

        {/* Rutas Protegidas */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="usuarios" element={<UsuariosPage />} />
            <Route path="lockers" element={<LockersPage />} />
            <Route path="incidencias" element={<IncidenciasPage />} />
            <Route path="auditorias" element={<AuditoriasPage />} />
          </Route>
        </Route>

        {/* Ruta si escriben una URL que no existe, los manda al Login */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}