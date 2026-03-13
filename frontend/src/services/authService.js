// services/authService.js

export const logout = () => {
    // 1. Limpiamos el token del almacenamiento
    localStorage.removeItem("token");
    
    // 2. Opcional: Limpiar otros datos del usuario si los guardas
    // localStorage.removeItem("userData");

    // 3. Redirigir al login y forzar recarga para limpiar estados de React
    window.location.href = "/login"; 
};