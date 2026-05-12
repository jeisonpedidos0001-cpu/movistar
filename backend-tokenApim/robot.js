const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const path = require('path');
puppeteer.use(StealthPlugin());

const ARGS = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--single-process',
    '--no-zygote'
];

// Lista de proxies colombianos de Webshare (cada robot usará uno diferente)
// Se configuran via variables de entorno en Railway para no exponer credenciales
const PROXY_HOST = process.env.PROXY_HOST || 'p.webshare.io';
const PROXY_PORT = process.env.PROXY_PORT || '80';
const PROXY_PASS = process.env.PROXY_PASS || '';
// Cada robot usa un proxy diferente: PROXY_USER_1, PROXY_USER_2, PROXY_USER_3
// Si no hay variable, usa una lista por defecto vacía
function getProxyUser(robotId) {
    return process.env[`PROXY_USER_${robotId}`] || process.env.PROXY_USER || '';
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

        if (!proxyUser || !proxyPass) {
            console.warn(`⚠️ [Robot-${this.id}] SIN PROXY - Variables PROXY_USER_${this.id} o PROXY_PASS no configuradas.`);
        }

        const launchArgs = [...ARGS];
        if (proxyUser && proxyPass) {
            launchArgs.push(`--proxy-server=http://${PROXY_HOST}:${PROXY_PORT}`);
        }

        this.browser = await puppeteer.launch({
            headless: 'new',
            args: launchArgs
        });

        this.page = await this.browser.newPage();

        // Autenticar en el Proxy (si está configurado)
        if (proxyUser && proxyPass) {
            await this.page.authenticate({ username: proxyUser, password: proxyPass });
            console.log(`🌐 [Robot-${this.id}] Proxy: ${proxyUser}@${PROXY_HOST}:${PROXY_PORT}`);
        }

        // Simular un navegador real colombiano
        await this.page.setUserAgent(
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
        );
        await this.page.setViewport({ width: 1366, height: 768 });
        // Idioma colombiano
        await this.page.setExtraHTTPHeaders({ 'Accept-Language': 'es-CO,es;q=0.9' });

        console.log(`✅ [Robot-${this.id}] Listo y conectado a IP Colombiana.`);
    }

    async consultar(numero) {
        this.busy = true;
        try {
            console.log(`📡 [Robot-${this.id}] Consultando: ${numero}`);

            // 1. Navegar al formulario y esperar carga completa (incluyendo reCAPTCHA)
            await this.page.goto('https://payment.telefonicawebsites.co/', {
                waitUntil: 'networkidle2',
                timeout: 45000
            });

            // 2. Seleccionar "Con número de línea Pospago" (value="1")
            //    HTML real: <select id="aria-id-hook-6"> <option value="1">Con número de línea Pospago</option>
            await this.page.waitForSelector('select', { timeout: 20000 });
            await this.page.select('select', '1');

            // 3. Escribir el número en el input
            //    HTML real: <input data-testid="phone-number-field" name="phoneNumber" type="tel" maxlength="11">
            await this.page.waitForSelector('input[name="phoneNumber"]', { timeout: 15000 });
            await this.page.click('input[name="phoneNumber"]', { clickCount: 3 }); // Seleccionar todo (por si hay texto previo)
            await this.page.type('input[name="phoneNumber"]', String(numero), { delay: 100 });

            // 4. Esperar 3 segundos para que reCAPTCHA invisible se inicialice completamente
            await new Promise(r => setTimeout(r, 3000));

            // 5. Preparar la escucha de la respuesta de /api/data-payment ANTES de hacer clic
            const respuestaPromesa = this.page.waitForResponse(
                response => response.url().includes('/api/data-payment'),
                { timeout: 30000 }
            ).catch(() => null);

            // 6. Hacer clic en "Continuar" (button type="submit")
            await this.page.click('button[type="submit"]');

            // 7. Esperar la respuesta HTTP de la API
            const httpResponse = await respuestaPromesa;

            if (!httpResponse) {
                // Tomar foto para diagnóstico
                const fotoPath = path.join(__dirname, `../dist/error_robot_${this.id}.png`);
                await this.page.screenshot({ path: fotoPath, fullPage: true }).catch(() => {});
                console.log(`📸 [Robot-${this.id}] Foto guardada en /error_robot_${this.id}.png`);
                throw new Error('Timeout: Movistar no respondió en 30s');
            }

            const status = httpResponse.status();
            console.log(`📊 [Robot-${this.id}] Status de Movistar: ${status}`);

            if (status !== 200) {
                throw new Error(`RETRY_NEEDED: Movistar devolvió error HTTP ${status}`);
            }

            const data = await httpResponse.json().catch(() => null);

            // Validar la estructura de la respuesta según el JSON real:
            // { error: 0, message: "OK", values: { clientName, transactionValue, docNumber, invoiceInformationQiItem: [...] } }
            if (!data || data.error !== 0 || !data.values) {
                console.error(`⚠️ [Robot-${this.id}] Respuesta inesperada:`, JSON.stringify(data).substring(0, 200));
                throw new Error('RETRY_NEEDED: Respuesta inválida de Movistar');
            }

            console.log(`✅ [Robot-${this.id}] Factura obtenida: $${data.values.transactionValue} - ${data.values.clientName}`);
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
