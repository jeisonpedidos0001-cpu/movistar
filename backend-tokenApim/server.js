const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');

const tokenPool = require('./token-pool');
const cache = require('./cache');
const { resolverRecaptcha } = require('./capsolver');

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

// 🚀 Iniciar el llenado de tokens al arrancar
tokenPool.startFillingPool();

// ─────────────────────────────────────────
// ENDPOINT PRINCIPAL: Consultar factura
// ─────────────────────────────────────────
app.post('/api/consultar', async (req, res) => {
    const { numero } = req.body;

    if (!numero) {
        return res.status(400).json({ error: 'Número de teléfono requerido.' });
    }

    // 1. Revisar la Caché → respuesta instantánea si ya fue consultado
    const cachedData = cache.get(numero);
    if (cachedData) {
        return res.json(cachedData);
    }

    // 2. Intentar hasta 2 veces con tokens distintos del pool
    let lastError = null;
    const maxRetries = 2;

    for (let i = 0; i < maxRetries; i++) {
        const tokenAPim = tokenPool.getToken();

        if (!tokenAPim) {
            tokenPool.replenish();
            return res.status(503).json({
                error: 'El servidor está calentando. Intenta en 15 segundos.'
            });
        }

        console.log(`📡 Consultando número: ${numero} (Intento ${i + 1}/${maxRetries})`);

        try {
            // 3. Resolver reCAPTCHA con CapSolver (token válido desde el dominio de Movistar)
            const recaptchaToken = await resolverRecaptcha();

            // 4. Hacer la petición a Movistar con ambos tokens
            const payload = {
                tokenAPim: tokenAPim,
                referenceNumber: numero,
                date: new Date().toISOString(),
                business: 1,
                serviceType: 1,
                recaptchaToken: recaptchaToken,
                channel: 'web',
                selectedIndex: 0
            };

            const response = await axios.post(
                'https://payment.telefonicawebsites.co/api/data-payment',
                payload,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'x-platform': 'Web',
                        'Origin': 'https://payment.telefonicawebsites.co',
                        'Referer': 'https://payment.telefonicawebsites.co/',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                        'Accept': 'application/json, text/plain, */*',
                        'Accept-Language': 'es-CO,es;q=0.9',
                        'sec-fetch-site': 'same-origin',
                        'sec-fetch-mode': 'cors',
                        'sec-fetch-dest': 'empty'
                    },
                    timeout: 15000
                }
            );

            // 5. Extraer los campos importantes y guardar en caché
            const data = response.data;
            const respuesta = {
                clientName: data.values?.clientName,
                transactionValue: data.values?.transactionValue,
                docNumber: data.values?.docNumber,
                invoiceSNPaymentInfoRel: data.values?.invoiceInformationQiItem?.[0]?.invoiceSNPaymentInfoRel,
                raw: data
            };

            cache.set(numero, respuesta);
            tokenPool.replenish();

            console.log(`✅ Factura obtenida para ${numero}: $${data.values?.transactionValue}`);
            return res.json(respuesta);

        } catch (error) {
            lastError = error;
            const status = error.response?.status || error.message;
            const body = error.response?.data;
            console.error(`❌ Error intento ${i + 1}: ${status}`);
            console.error(`📋 Respuesta de Movistar:`, JSON.stringify(body, null, 2));
            tokenPool.replenish();
        }
    }

    // 6. Si fallaron todos los intentos
    console.log(`❌ Se agotaron los intentos para ${numero}.`);
    return res.status(500).json({
        error: 'No se pudo obtener la información. Intenta de nuevo.'
    });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor corriendo en el puerto ${PORT}`);
    console.log(`🧩 CapSolver activado para reCAPTCHA.`);
    console.log(`💼 Pool de tokens (tokenAPim) activado.`);
    console.log(`⚡ Caché inteligente activada.`);
});
