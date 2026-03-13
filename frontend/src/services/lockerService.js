import axios from 'axios';


const API_URL = import.meta.env.VITE_API_URL

/**
 * Obtiene la lista de lockers con estado 'disponible'
 */
export const getAvailableLockers = async () => {
   try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${API_URL}/api/locker-requests/available`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        // Retornamos los datos. El controlador devuelve { lockers: [...] }
        return res.data; 
    } catch (error) {
        console.error("Error al obtener lockers de la división:", error);
        throw error;
    }
};

/**
 * Crea una nueva solicitud de casillero
 * @param {Object} requestData { lockerId, isShared, partners }
 */
export const createLockerRequest = async (requestData) => {
    try {
        const token = localStorage.getItem('token');
        
        // Enviamos requestData directamente como el body del POST
        const response = await axios.post(`${API_URL}/api/locker-requests`, requestData, {
            headers: { 
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        return response.data;
    } catch (error) {
        // Log para depuración en el navegador
        console.error("Error en createLockerRequest:", error.response?.data || error.message);
        
        // Re-lanzamos el error para que el componente RequestScreen lo atrape en su catch
        throw error;
    }
};

export const getUserRequests = async () => {
    try {
        const token = localStorage.getItem('token');
        // Debe coincidir con la ruta que pusiste arriba
        const res = await axios.get(`${API_URL}/api/locker-requests/my-requests`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return res.data; 
    } catch (error) {
        console.error("Error en getUserRequests:", error);
        throw error;
    }
};

/**
 * Cancela una solicitud de casillero que esté en estado 'pending'
 * @param {string|number} requestId - El ID de la solicitud a cancelar
 */
export const cancelLockerRequest = async (requestId) => {
    try {
        const token = localStorage.getItem('token');
        
        const response = await axios.delete(`${API_URL}/api/locker-requests/cancel-request/${requestId}`, {
            headers: { 
                Authorization: `Bearer ${token}` 
            }
        });
        
        return response.data;
    } catch (error) {
        console.error("Error al cancelar la solicitud:", error.response?.data || error.message);
        throw error;
    }
};