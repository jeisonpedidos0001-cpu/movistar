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

    // 2. Enviar a la cola del pool de robots
    try {
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
        console.error(`❌ Error final para ${numero}:`, error.message);
        return res.status(500).json({
            error: 'No se pudo obtener la información. Intenta de nuevo en unos segundos.'
        });
    }
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
