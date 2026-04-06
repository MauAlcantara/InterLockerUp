import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom"
import { Toaster } from "react-hot-toast" 
import LoginPage from "./pages/LoginPage"
import DashboardLayout from "./layouts/DashboardLayout"
import DashboardPage from "./pages/DashboardPage"
import UsuariosPage from "./pages/UsuariosPage"
import LockersPage from "./pages/LockersPage"
import IncidenciasPage from "./pages/IncidenciasPage"
import AuditoriasPage from "./pages/AuditoriasPage"
import AdminProfilePage from "./pages/AdminProfilePage"

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
<Toaster 
  position="top-center" 
  reverseOrder={false} 
  toastOptions={{
    // Esto asegura que la alerta en sí misma esté por encima de todo
    style: {
      zIndex: 999999,
    },
  }}
  containerStyle={{
    // Esto asegura que el contenedor invisible de las alertas esté encima
    zIndex: 999999,
  }} 
/>
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
            <Route path="perfil" element={<AdminProfilePage/>}/>
          </Route>
        </Route>

        {/* Ruta si escriben una URL que no existe, los manda al Login */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}