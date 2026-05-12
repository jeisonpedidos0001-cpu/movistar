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
    '--no-zygote',
    '--disable-blink-features=AutomationControlled',
    '--disable-features=IsolateOrigins,site-per-process',
    '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
];

const PROXY_HOST = process.env.PROXY_HOST || 'p.webshare.io';
const PROXY_PORT = process.env.PROXY_PORT || '36450'; // Usar Railway o por defecto 36450
const PROXY_PASS = process.env.PROXY_PASS || 'vjvlvlhf0y5z';

function getProxyUser(robotId) {
    return process.env[`PROXY_USER_${robotId}`] || 'xemzklfn-co-31';
}

function humanDelay(min = 1000, max = 3000) {
    return new Promise(r => setTimeout(r, Math.floor(Math.random() * (max - min)) + min));
}

class Robot {
    constructor(id) {
        this.id = id;
        this.busy = false;
        this.browser = null;
        this.page = null;
    }

    async iniciar() {
        console.log(`🤖 [Robot-${this.id}] Iniciando instancia...`);
        const proxyUser = getProxyUser(this.id);

        this.browser = await puppeteer.launch({
            headless: 'new',
            ignoreDefaultArgs: ['--enable-automation'],
            args: [...ARGS, `--proxy-server=http://${PROXY_HOST}:${PROXY_PORT}`]
        });
        
        console.log(`✅ [Robot-${this.id}] Navegador listo.`);
    }

    async consultar(numero) {
        this.busy = true;
        let localPage = null;
        try {
            const proxyUser = getProxyUser(this.id);
            console.log(`📡 [Robot-${this.id}] Consultando ${numero} con IP Colombiana...`);

            // Crear una pestaña nueva limpia para cada consulta
            localPage = await this.browser.newPage();
            await localPage.authenticate({ username: proxyUser, password: PROXY_PASS });
            await localPage.setViewport({ width: 1366, height: 768 });
            
            // Extra anti-detección: ocultar rastros de Puppeteer
            await localPage.evaluateOnNewDocument(() => {
                delete navigator.__proto__.webdriver;
                window.chrome = { runtime: {} };
            });

            // Ir a la web de Movistar
            await localPage.goto('https://payment.telefonicawebsites.co/', {
                waitUntil: 'networkidle2',
                timeout: 60000
            });

            // Llenar formulario
            await localPage.waitForSelector('select', { timeout: 20000 });
            await humanDelay(500, 1200);
            await localPage.select('select', '1');

            await localPage.waitForSelector('input[name="phoneNumber"]', { timeout: 15000 });
            await localPage.type('input[name="phoneNumber"]', String(numero), { delay: 100 });
            
            console.log(`📝 [Robot-${this.id}] Formulario lleno, esperando reCAPTCHA...`);
            await humanDelay(3000, 5000); // Dar tiempo a que el reCAPTCHA invisible se asiente

            // Escuchar la API
            const respuestaPromesa = localPage.waitForResponse(
                response => response.url().includes('/api/data-payment'),
                { timeout: 35000 }
            ).catch(() => null);

            // Clic en enviar
            await localPage.click('button[type="submit"]');

            const httpResponse = await respuestaPromesa;

            if (!httpResponse) {
                await localPage.screenshot({ path: `/tmp/timeout_${numero}.png` });
                throw new Error('Movistar no respondió (Timeout)');
            }

            const status = httpResponse.status();
            console.log(`📊 [Robot-${this.id}] Movistar respondió con status: ${status}`);

            if (status !== 200) {
                await localPage.screenshot({ path: `/tmp/error_${status}_${numero}.png` });
                throw new Error(`RETRY_NEEDED: Error ${status} de Movistar`);
            }

            const data = await httpResponse.json();
            return data;

        } catch (error) {
            console.error(`❌ [Robot-${this.id}] Falló: ${error.message}`);
            throw error;
        } finally {
            if (localPage) await localPage.close().catch(() => {});
            this.busy = false;
        }
    }

    async reiniciar() {
        try { if (this.browser) await this.browser.close(); } catch (e) {}
        await this.iniciar();
    }
}

module.exports = Robot;
