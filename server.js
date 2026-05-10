const express = require('express');
const axios = require('axios');
const cors = require('cors');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

const app = express();
app.use(cors());
app.use(express.json());

// 💾 Variables de estado
let currentToken = null;
let lastResponse = null;
let isRefreshing = false;

// 🤖 FUNCIÓN DE AUTOMATIZACIÓN (INTERCEPTOR)
async function refrescarToken() {
    if (isRefreshing) return;
    isRefreshing = true;

    console.log("🤖 Iniciando refresco automático de token...");
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: "new",
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        });
        const page = await browser.newPage();
        await page.setRequestInterception(true);

        let capturedToken = null;

        page.on('request', request => {
            const postData = request.postData();
            if (postData) {
                try {
                    const json = JSON.parse(postData);
                    if (json.tokenAPim) {
                        capturedToken = json.tokenAPim;
                        console.log("🎯 ¡TOKEN CAPTURADO EXITOSAMENTE!");
                    }
                } catch (e) { }
            }
            request.continue();
        });

        await page.goto('https://payment.telefonicawebsites.co/', {
            waitUntil: 'domcontentloaded',
            timeout: 60000
        });

        // Simular interacción para disparar la petición
        await page.waitForSelector('select', { timeout: 15000 });
        await page.select('select', '1');

        await page.waitForSelector('input[name="phoneNumber"]', { timeout: 10000 });
        await page.type('input[name="phoneNumber"]', '324 5097754', { delay: 100 });

        await page.click('button[type="submit"]');

        // Esperar máximo 20 segundos a que el token aparezca
        for (let i = 0; i < 20; i++) {
            if (capturedToken) break;
            await new Promise(r => setTimeout(r, 1000));
        }

        if (capturedToken) {
            currentToken = capturedToken;
            console.log("✅ Token actualizado y listo para usar.");
        } else {
            console.log("⚠️ El bot no logró interceptar el token esta vez.");
        }

    } catch (err) {
        console.error("❌ Error en el proceso de automatización:", err.message);
    } finally {
        if (browser) await browser.close();
        isRefreshing = false;
    }
}

// 🚀 Arrancar refresco inicial y configurar intervalo (cada 15 min)
refrescarToken();
setInterval(refrescarToken, 15 * 60 * 1000);

// 🔍 Endpoint de Consulta
app.post('/api/consultar', async (req, res) => {
    try {
        const { numero, recaptchaToken } = req.body;

        if (!currentToken) {
            return res.status(503).json({
                error: 'El token aún no está listo. El bot lo está obteniendo, intenta en 10 segundos.'
            });
        }

        console.log(`📡 Consultando número: ${numero}`);

        const payload = {
            tokenAPim: currentToken,
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
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        lastResponse = { numero, timestamp: new Date().toISOString(), data: response.data };
        res.json(response.data);
    } catch (error) {
        console.error("❌ Error en la consulta:", error.message);

        // Si falla por token vencido, forzamos un refresco inmediato
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
            console.log("🔄 Token rechazado por Movistar. Refrescando ahora...");
            refrescarToken();
        }

        res.status(error.response?.status || 500).json(error.response?.data || { error: 'Error interno' });
    }
});

app.get('/api/last-response', (req, res) => res.json(lastResponse || { ok: false }));

const PORT = 4000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor Proxy Automático en http://localhost:${PORT}`);
});
