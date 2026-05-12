const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const path = require('path');
puppeteer.use(StealthPlugin());

// Args mínimos para Docker + anti-detección completa
const ARGS = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--single-process',
    '--no-zygote',
    // ─── Anti-detección ───
    '--disable-blink-features=AutomationControlled',
    '--disable-infobars',
    '--window-size=1366,768'
];

// Proxy config vía variables de entorno
const PROXY_HOST = process.env.PROXY_HOST || 'p.webshare.io';
const PROXY_PORT = process.env.PROXY_PORT || '80';
const PROXY_PASS = process.env.PROXY_PASS || '';

function getProxyUser(robotId) {
    return process.env[`PROXY_USER_${robotId}`] || process.env.PROXY_USER || '';
}

// Delay aleatorio para simular comportamiento humano
function humanDelay(min = 500, max = 1500) {
    const ms = Math.floor(Math.random() * (max - min)) + min;
    return new Promise(r => setTimeout(r, ms));
}

class Robot {
    constructor(id) {
        this.id = id;
        this.busy = false;
        this.browser = null;
        this.page = null;
    }

    async iniciar() {
        console.log(`🤖 [Robot-${this.id}] Iniciando con Proxy Colombiano...`);

        const proxyUser = getProxyUser(this.id);
        const proxyPass = PROXY_PASS;

        const launchArgs = [...ARGS];
        if (proxyUser && proxyPass) {
            launchArgs.push(`--proxy-server=http://${PROXY_HOST}:${PROXY_PORT}`);
        }

        this.browser = await puppeteer.launch({
            headless: 'new',
            // ⬇️ CRÍTICO: quitar el flag --enable-automation que delata al bot
            ignoreDefaultArgs: ['--enable-automation'],
            args: launchArgs
        });

        this.page = await this.browser.newPage();

        // Autenticar en el Proxy
        if (proxyUser && proxyPass) {
            await this.page.authenticate({ username: proxyUser, password: proxyPass });
            console.log(`🌐 [Robot-${this.id}] Proxy: ${proxyUser}@${PROXY_HOST}:${PROXY_PORT}`);
        }

        // Simular navegador real colombiano
        await this.page.setUserAgent(
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
        );
        await this.page.setViewport({ width: 1366, height: 768 });
        await this.page.setExtraHTTPHeaders({ 'Accept-Language': 'es-CO,es;q=0.9' });

        // Parche extra: asegurar que navigator.webdriver sea false
        await this.page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, 'webdriver', { get: () => false });
            // Simular plugins reales de Chrome
            Object.defineProperty(navigator, 'plugins', {
                get: () => [
                    { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer' },
                    { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai' },
                    { name: 'Native Client', filename: 'internal-nacl-plugin' }
                ]
            });
            // Simular idiomas
            Object.defineProperty(navigator, 'languages', { get: () => ['es-CO', 'es', 'en'] });
            // Chrome real tiene window.chrome
            window.chrome = { runtime: {}, loadTimes: () => ({}), csi: () => ({}) };
        });

        // Pre-cargar la página de Movistar para que esté lista
        await this.page.goto('https://payment.telefonicawebsites.co/', {
            waitUntil: 'networkidle2',
            timeout: 60000
        });

        console.log(`✅ [Robot-${this.id}] Listo y conectado a IP Colombiana.`);
    }

    async consultar(numero) {
        this.busy = true;
        try {
            console.log(`📡 [Robot-${this.id}] Consultando: ${numero}`);

            // Si la página ya no está en la URL correcta, renavegar
            const currentUrl = this.page.url();
            if (!currentUrl.includes('payment.telefonicawebsites.co')) {
                await this.page.goto('https://payment.telefonicawebsites.co/', {
                    waitUntil: 'networkidle2',
                    timeout: 45000
                });
            } else {
                // Recargar para obtener un reCAPTCHA fresco
                await this.page.reload({ waitUntil: 'networkidle2', timeout: 45000 });
            }

            // 1. Esperar el select y elegir "Pospago" (value="1")
            await this.page.waitForSelector('select', { timeout: 20000 });
            await humanDelay(300, 800);
            await this.page.select('select', '1');

            // 2. Esperar el input del número
            await this.page.waitForSelector('input[name="phoneNumber"]', { timeout: 15000 });
            await humanDelay(500, 1000);

            // 3. Limpiar y escribir el número con velocidad humana
            await this.page.click('input[name="phoneNumber"]', { clickCount: 3 });
            await humanDelay(200, 500);
            await this.page.type('input[name="phoneNumber"]', String(numero), { delay: 80 + Math.random() * 70 });

            // 4. Pausa humana antes de hacer clic (como si leyeras el formulario)
            await humanDelay(2000, 4000);

            // 5. Preparar la escucha de /api/data-payment ANTES de hacer clic
            const respuestaPromesa = this.page.waitForResponse(
                response => response.url().includes('/api/data-payment'),
                { timeout: 30000 }
            ).catch(() => null);

            // 6. Clic en "Continuar"
            await this.page.click('button[type="submit"]');

            // 7. Esperar la respuesta HTTP
            const httpResponse = await respuestaPromesa;

            if (!httpResponse) {
                // Tomar foto para diagnóstico (en /tmp que siempre existe en Docker)
                const fotoPath = `/tmp/error_robot_${this.id}.png`;
                await this.page.screenshot({ path: fotoPath, fullPage: true }).catch(() => {});
                console.log(`📸 [Robot-${this.id}] Foto de error guardada en ${fotoPath}`);
                throw new Error('Timeout: Movistar no respondió en 30s');
            }

            const status = httpResponse.status();
            console.log(`📊 [Robot-${this.id}] Status de Movistar: ${status}`);

            if (status !== 200) {
                // Guardar foto para ver qué muestra la pantalla
                const fotoPath = `/tmp/error_${status}_robot_${this.id}.png`;
                await this.page.screenshot({ path: fotoPath, fullPage: true }).catch(() => {});
                throw new Error(`RETRY_NEEDED: Movistar devolvió error HTTP ${status}`);
            }

            const data = await httpResponse.json().catch(() => null);

            if (!data || data.error !== 0 || !data.values) {
                console.error(`⚠️ [Robot-${this.id}] Respuesta inesperada:`, JSON.stringify(data).substring(0, 300));
                throw new Error('RETRY_NEEDED: Respuesta inválida de Movistar');
            }

            console.log(`✅ [Robot-${this.id}] Factura: $${data.values.transactionValue} - ${data.values.clientName}`);
            return data;

        } catch (error) {
            console.error(`❌ [Robot-${this.id}] Error: ${error.message}`);
            throw error;
        } finally {
            this.busy = false;
        }
    }

    async reiniciar() {
        console.log(`🔄 [Robot-${this.id}] Reiniciando...`);
        try { if (this.browser) await this.browser.close(); } catch (e) {}
        this.busy = false;
        await this.iniciar();
    }
}

module.exports = Robot;
