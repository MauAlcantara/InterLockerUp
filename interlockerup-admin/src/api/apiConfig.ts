// src/api/apiConfig.ts

// 1. Detección de entorno
const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// 2. Configuración de URLs (Asegúrate de que estas sean las correctas)
const PROD_API_URL = 'https://api.vigilia.world'; 
const LOCAL_API_URL = 'http://localhost:3000';

export const BASE_URL = isLocal ? LOCAL_API_URL : PROD_API_URL;

/**
 * Función centralizada para peticiones al Backend
 */
export const fastFetch = async (endpoint: string, options: RequestInit = {}) => {
    const url = `${BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    
    // Obtener el token del localStorage (si existe)
    const token = localStorage.getItem('admin_token');

    // Detectar si el cuerpo es FormData (para subir archivos/imágenes)
    const isFormData = options.body instanceof FormData;

    // Configurar Headers por defecto
    const defaultHeaders: Record<string, string> = {};

    // Si NO es FormData, enviamos JSON
    if (!isFormData) {
        defaultHeaders['Content-Type'] = 'application/json';
    }

    // Si hay un token, lo añadimos automáticamente para rutas protegidas
    if (token) {
        defaultHeaders['Authorization'] = `Bearer ${token}`;
    }

    return fetch(url, {
        ...options,
        headers: {
            ...defaultHeaders,
            ...options.headers, // Permite sobrescribir headers si es necesario
        },
    });
};