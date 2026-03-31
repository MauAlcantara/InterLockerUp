// backend/src/utils/securityNeuron.js

/**
 * Inferencia de la Neurona Artificial (Perceptrón)
 * Fórmula: z = (3.59*H1) + (4.35*H2) + (-1.50*FS) + (-4.04*Fest) + (-4.04*Raf) - 1.90
 */
const analyzeAccess = (data) => {
    // Cálculo de Z con tus pesos de Colab
    const z = (3.59 * data.x1) + 
              (4.35 * data.x2) + 
              (-1.50 * data.x3) + 
              (-4.04 * data.x4) + 
              (-4.04 * data.x5) - 1.90;

    // Función de activación Sigmoide
    const seguridad = 1 / (1 + Math.exp(-z));

    return {
        esSeguro: seguridad >= 0.5, // Umbral estándar
        confianza: seguridad
    };
};

module.exports = { analyzeAccess };