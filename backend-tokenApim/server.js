const express = require('express');
const axios = require('axios');
const cors = require('cors');
const puppeteer = require('puppeteer-extra');

const tokenPool = require('./token-pool');
const cache = require('./cache');

const app = express();
app.use(cors());
app.use(express.json());

// 🌐 Servir el frontend compilado de React
const path = require('path');
app.use(express.static(path.join(__dirname, '../dist')));

// Soporte para rutas de React Router (SPA)
app.get(/(.*)/, (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// 🚀 Iniciar el llenado de tokens al arrancar
tokenPool.startFillingPool();

app.post('/api/consultar', async (req, res) => {
    const { numero, recaptchaToken } = req.body;

    // 1. Revisar la Caché (Para evitar bloquear el API de Movistar)
    const cachedData = cache.get(numero);
    if (cachedData) {
        return res.json(cachedData);
    }

    // 2. Intentar hasta con 2 tokens distintos si hay fallas 500
    let lastError = null;
    const maxRetries = 2;

    for (let i = 0; i < maxRetries; i++) {
        const token = tokenPool.getToken();
        
        if (!token) {
            tokenPool.replenish();
            return res.status(503).json({ error: 'La bolsa de tokens está vacía. Generando, intenta en 10s.' });
        }

        console.log(`📡 Consultando número: ${numero} (Intento ${i + 1}/${maxRetries} usando un token del pool)`);

        try {
            const payload = {
                tokenAPim: token,
                referenceNumber: numero,
                date: new Date().toISOString(),
                business: 1,
                serviceType: 1,
                recaptchaToken: recaptchaToken,
                channel: "web",
                selectedIndex: 0
            };

            const response = await axios.post('https://payment.telefonicawebsites.co/api/data-payment', payload, {
                headers: {
                    'x-platform': 'Web',
                    'Content-Type': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            // ✅ Éxito: Guardar en caché y responder
            cache.set(numero, response.data);
            
            // Reponer token usado
            tokenPool.replenish();
            return res.json(response.data);

        } catch (error) {
            lastError = error;
            console.error(`❌ Error con token actual: ${error.message}`);
            
            // Si es un error 4xx o 5xx, podría ser el token agotado o bloqueado.
            // Eliminamos ese token de la bolsa rotándolo (ya se sacó con getToken, así que si era malo, está al final, 
            // pero podemos repoblar para estar seguros).
            tokenPool.replenish();
        }
    }

    // 3. Si fallaron todos los intentos
    console.log("❌ Se agotaron los intentos para este número.");
    res.status(lastError?.response?.status || 500).json(lastError?.response?.data || { error: 'Error interno en la red de Movistar' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor Escalable corriendo en el puerto ${PORT}`);
    console.log(`💼 Pool de tokens activado.`);
    console.log(`⚡ Caché inteligente activada.`);
});
