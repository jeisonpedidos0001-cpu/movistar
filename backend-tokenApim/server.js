const express = require('express');
const cors = require('cors');
const path = require('path');

const robotPool = require('./robot-pool');
const cache = require('./cache');

const app = express();
app.use(cors());
app.use(express.json());

// 🌐 Servir el frontend compilado de React
app.use(express.static(path.join(__dirname, '../dist')));

// Soporte para rutas de React Router (SPA)
app.get(/(.*)/, (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// ─────────────────────────────────────────
// ENDPOINT: Estado del sistema
// ─────────────────────────────────────────
app.get('/api/estado', (req, res) => {
    res.json(robotPool.estado());
});

// ─────────────────────────────────────────
// ENDPOINT PRINCIPAL: Consultar factura
// ─────────────────────────────────────────
app.post('/api/consultar', async (req, res) => {
    const { numero } = req.body;

    if (!numero) {
        return res.status(400).json({ error: 'Número de teléfono requerido.' });
    }

    // 1. Revisar caché → respuesta instantánea
    const cachedData = cache.get(numero);
    if (cachedData) {
        return res.json(cachedData);
    }

    // 2. Intentar hasta 3 veces si Movistar falla internamente
    const maxRetries = 3;
    let lastErrorMsg = '';

    for (let i = 0; i < maxRetries; i++) {
        try {
            console.log(`📡 Solicitando a RobotPool: ${numero} (Intento ${i + 1}/${maxRetries})`);
            const data = await robotPool.consultar(numero);

            const respuesta = {
                clientName: data.values?.clientName,
                transactionValue: data.values?.transactionValue,
                docNumber: data.values?.docNumber,
                invoiceSNPaymentInfoRel: data.values?.invoiceInformationQiItem?.[0]?.invoiceSNPaymentInfoRel,
                raw: data
            };

            cache.set(numero, respuesta);
            return res.json(respuesta);

        } catch (error) {
            lastErrorMsg = error.message;
            if (error.message.includes('RETRY_NEEDED')) {
                console.log(`⚠️ Movistar falló temporalmente, reintentando automáticamente... (${i+1}/${maxRetries})`);
                // Esperar un poco antes de reintentar para no saturar
                await new Promise(r => setTimeout(r, 2000));
            } else {
                // Si es un error crítico (como timeout extremo), rompemos el ciclo
                console.error(`❌ Error final para ${numero}:`, error.message);
                break;
            }
        }
    }

    return res.status(500).json({
        error: `No se pudo obtener la información después de varios intentos. Movistar puede estar caído. (${lastErrorMsg})`
    });
});

// ─────────────────────────────────────────
// ARRANQUE DEL SERVIDOR
// ─────────────────────────────────────────
const PORT = process.env.PORT || 4000;

app.listen(PORT, '0.0.0.0', async () => {
    console.log(`🚀 Servidor corriendo en el puerto ${PORT}`);
    console.log(`⚡ Caché inteligente activada.`);
    // Arrancar todos los robots
    await robotPool.iniciar();
});
