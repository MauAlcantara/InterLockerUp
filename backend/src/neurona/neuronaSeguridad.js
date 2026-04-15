const FESTIVOS_MEXICO = new Set([
    "2026-01-01", "2026-02-02", "2026-03-16", "2026-05-01",
    "2026-09-16", "2026-11-16", "2026-12-25",
])

const PESOS = {
    w1:  3.56,
    w2:  4.29,
    w3: -1.68,
    w4: -4.04,
    w5: -4.04,
    b:  -1.87,
}

function sigmoid(z) {
    return 1 / (1 + Math.exp(-z))
}

function evaluarAcceso(hora, diaSemana, fechaISO, peticionesRecientes) {
    const x1 = hora >= 7  && hora <= 15 ? 1.0 : 0.0
    const x2 = hora >= 17 && hora <= 22 ? 1.0 : 0.0
    const x3 = diaSemana === 0 || diaSemana === 6 ? 1.0 : 0.0
    const x4 = FESTIVOS_MEXICO.has(fechaISO) ? 1.0 : 0.0
    const x5 = peticionesRecientes > 3 ? 1.0 : 0.0

    const z = PESOS.w1*x1 + PESOS.w2*x2 + PESOS.w3*x3 +
              PESOS.w4*x4 + PESOS.w5*x5 + PESOS.b

    const score = sigmoid(z)
    return {
        esSospechoso: score < 0.5,
        score: parseFloat(score.toFixed(4)),
        inputs: { x1, x2, x3, x4, x5 },
    }
}

module.exports = { evaluarAcceso }
