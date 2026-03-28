// Forzamos la URL de producción directamente para eliminar el error de localhost
export const BASE_URL = 'https://admin.vigilia.world';

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
    return fetch(url, { ...options, headers });
};
