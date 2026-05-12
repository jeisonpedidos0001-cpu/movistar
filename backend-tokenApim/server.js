const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
const { HttpsProxyAgent } = require('https-proxy-agent');

const tokenManager = require('./token-manager');
const { resolverRecaptcha } = require('./capsolver');
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

// ─── Configuración del Proxy para Axios ───
const PROXY_HOST = process.env.PROXY_HOST || 'p.webshare.io';
const PROXY_PORT = process.env.PROXY_PORT || '80';
const PROXY_USER = process.env.PROXY_USER_1 || '';
const PROXY_PASS = process.env.PROXY_PASS || '';

function crearProxyAgent() {
    if (PROXY_USER && PROXY_PASS) {
        const proxyUrl = `http://${PROXY_USER}:${PROXY_PASS}@${PROXY_HOST}:${PROXY_PORT}`;
        return new HttpsProxyAgent(proxyUrl);
    }
    return undefined;
}

// ─────────────────────────────────────────
// ENDPOINT: Estado del sistema
// ─────────────────────────────────────────
app.get('/api/estado', (req, res) => {
    res.json({
        tokenDisponible: !!tokenManager.getToken(),
        ultimoRefresco: tokenManager.lastRefresh,
        proxyActivo: !!(PROXY_USER && PROXY_PASS)
    });
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

    // 2. Verificar que tenemos el tokenAPim
    let session = tokenManager.getSession();
    if (!session.token) {
        console.log('⚠️ Token no disponible, forzando refresco...');
        await tokenManager.refrescar();
        session = tokenManager.getSession();
        if (!session.token) {
            return res.status(503).json({ error: 'El sistema está obteniendo un token. Intenta en 15 segundos.' });
        }
    }

    // Formatear número para Movistar: "324 5097754"
    let numeroFormateado = numero;
    if (numero.length === 10) {
        numeroFormateado = `${numero.substring(0, 3)} ${numero.substring(3)}`;
    }

    // 3. Intentar hasta 3 veces
    const maxRetries = 3;
    let lastErrorMsg = '';

    for (let i = 0; i < maxRetries; i++) {
        try {
            console.log(`📡 Consultando ${numeroFormateado} (Intento ${i + 1}/${maxRetries})...`);

            // 3a. Resolver reCAPTCHA con CapSolver
            const recaptchaToken = await resolverRecaptcha();

            // 3b. Armar el payload
            const payload = {
                tokenAPim: session.token,
                referenceNumber: numeroFormateado,
                date: new Date().toISOString(),
                business: 1,
                serviceType: 1,
                recaptchaToken: recaptchaToken,
                channel: "web",
                selectedIndex: 0
            };

            // 3c. Hacer la petición
            const agent = crearProxyAgent();
            const response = await axios.post(
                'https://payment.telefonicawebsites.co/api/data-payment',
                payload,
                {
                    headers: {
                        'Accept': 'application/json, text/plain, */*',
                        'Accept-Language': 'es-CO,es;q=0.9',
                        'Accept-Encoding': 'gzip, deflate, br',
                        'Content-Type': 'application/json',
                        'x-platform': 'Web',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                        'Cookie': session.cookies, // 🎯 LAS COOKIES SON CLAVE
                        'Origin': 'https://payment.telefonicawebsites.co',
                        'Referer': 'https://payment.telefonicawebsites.co/',
                        'Sec-Fetch-Dest': 'empty',
                        'Sec-Fetch-Mode': 'cors',
                        'Sec-Fetch-Site': 'same-origin',
                        'Connection': 'keep-alive'
                    },
                    httpsAgent: agent,
                    httpAgent: agent,
                    timeout: 30000
                }
            );

            const data = response.data;

            if (data.error !== 0 || !data.values) {
                console.warn(`⚠️ Movistar respondió con error lógico:`, JSON.stringify(data).substring(0, 200));
                throw new Error('RETRY_NEEDED: Respuesta inválida de Movistar');
            }

            // 3d. Formatear la respuesta limpia
            const respuesta = {
                clientName: data.values?.clientName,
                transactionValue: data.values?.transactionValue,
                docNumber: data.values?.docNumber,
                invoiceSNPaymentInfoRel: data.values?.invoiceInformationQiItem?.[0]?.invoiceSNPaymentInfoRel,
                raw: data
            };

            console.log(`✅ Factura obtenida: $${respuesta.transactionValue} - ${respuesta.clientName}`);
            cache.set(numero, respuesta);
            return res.json(respuesta);

        } catch (error) {
            lastErrorMsg = error.message;
            const status = error.response?.status;

            if (status === 401 || status === 403) {
                // Token vencido → refrescar y reintentar
                console.log(`🔄 Token rechazado (${status}). Refrescando...`);
                token = await tokenManager.refrescar();
            } else if (status === 500 || error.message.includes('RETRY_NEEDED')) {
                console.log(`⚠️ Movistar falló (${status || 'interno'}). Reintentando... (${i + 1}/${maxRetries})`);
                await new Promise(r => setTimeout(r, 3000));
            } else {
                console.error(`❌ Error final: ${error.message}`);
                break;
            }
        }
    }

    return res.status(500).json({
        error: `No se pudo obtener la información. (${lastErrorMsg})`
    });
});

// ─────────────────────────────────────────
// ARRANQUE DEL SERVIDOR
// ─────────────────────────────────────────
const PORT = process.env.PORT || 4000;

app.listen(PORT, '0.0.0.0', async () => {
    console.log(`🚀 Servidor corriendo en el puerto ${PORT}`);
    console.log(`⚡ Caché inteligente activada.`);
    console.log(`🧩 CapSolver activado para reCAPTCHA.`);
    if (PROXY_USER) {
        console.log(`🌐 Proxy colombiano: ${PROXY_USER}@${PROXY_HOST}:${PROXY_PORT}`);
    }
    // Capturar el primer token
    await tokenManager.iniciar();
});
