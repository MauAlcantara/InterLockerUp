// Forzamos la URL de producción directamente para eliminar el error de localhost
export const BASE_URL = 'https://api.interlockerup.xyz';
// http://localhost:3000
// https://admin.vigilia.world

export const fastFetch = async (endpoint: string, options: RequestInit = {}) => {
    // Aseguramos que el endpoint empiece con /
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    
    // Si el endpoint no incluye ya '/api', se lo agregamos (ajusta esto según tu backend)
    const apiPath = cleanEndpoint.startsWith('/api') ? cleanEndpoint : `/api${cleanEndpoint}`;
    
    const url = `${BASE_URL}${apiPath}`;
    
    const token = localStorage.getItem('admin_token');
    const isFormData = options.body instanceof FormData;

    const headers: Record<string, string> = { ...options.headers as Record<string, string> };
    if (!isFormData) {
        headers['Content-Type'] = 'application/json';
    }
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    console.log(`Llamando a: ${url}`); // Esto te ayudará a ver la URL real en la consola
    const response = await fetch(url, { ...options, headers });

    // Sesión invalidada (login en otro dispositivo) o expirada:
    // limpiamos el token local y mandamos al login si no estamos ahí.
    if (response.status === 401 && token) {
        localStorage.removeItem("admin_token");
        if (!window.location.pathname.startsWith("/login") && window.location.pathname !== "/") {
            window.location.href = "/";
        }
    }

    return response;
};
