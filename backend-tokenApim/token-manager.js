const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

// ─── Token Capturador ───
// Usa Puppeteer SOLO para capturar el tokenAPim (no para consultar facturas).
// Esto es liviano: abre una sola vez, captura el token, y cierra.

const PROXY_HOST = process.env.PROXY_HOST || 'p.webshare.io';
const PROXY_PORT = process.env.PROXY_PORT || '80';
const PROXY_PASS = process.env.PROXY_PASS || '';
const PROXY_USER = process.env.PROXY_USER_1 || '';

class TokenManager {
    constructor() {
        this.currentToken = null;
        this.isRefreshing = false;
        this.lastRefresh = null;
    }

    getToken() {
        return this.currentToken;
    }

    async refrescar() {
        if (this.isRefreshing) {
            // Esperar a que termine el refresco actual
            for (let i = 0; i < 30; i++) {
                await new Promise(r => setTimeout(r, 1000));
                if (!this.isRefreshing && this.currentToken) return this.currentToken;
            }
            return this.currentToken;
        }

        this.isRefreshing = true;
        console.log('🤖 [TokenManager] Capturando tokenAPim con Puppeteer...');

        let browser;
        try {
            const args = [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--single-process',
                '--no-zygote',
                '--disable-blink-features=AutomationControlled'
            ];

            if (PROXY_USER && PROXY_PASS) {
                args.push(`--proxy-server=http://${PROXY_HOST}:${PROXY_PORT}`);
            }

            browser = await puppeteer.launch({
                headless: 'new',
                ignoreDefaultArgs: ['--enable-automation'],
                args
            });

            const page = await browser.newPage();

            if (PROXY_USER && PROXY_PASS) {
                await page.authenticate({ username: PROXY_USER, password: PROXY_PASS });
            }

            await page.setRequestInterception(true);

            let capturedToken = null;

            page.on('request', request => {
                const postData = request.postData();
                if (postData && postData.includes('tokenAPim')) {
                    try {
                        const json = JSON.parse(postData);
                        if (json.tokenAPim) {
                            capturedToken = json.tokenAPim;
                            console.log('🎯 [TokenManager] ¡TOKEN CAPTURADO!');
                        }
                    } catch (e) { }
                }
                request.continue();
            });

            await page.goto('https://payment.telefonicawebsites.co/', {
                waitUntil: 'domcontentloaded',
                timeout: 60000
            });

            // Llenar formulario con un número cualquiera para disparar la petición
            await page.waitForSelector('select', { timeout: 15000 });
            await page.select('select', '1');
            await page.waitForSelector('input[name="phoneNumber"]', { timeout: 10000 });
            await page.type('input[name="phoneNumber"]', '3162511612', { delay: 80 });
            await page.click('button[type="submit"]');

            // Esperar hasta 25 segundos a que el token aparezca
            for (let i = 0; i < 25; i++) {
                if (capturedToken) break;
                await new Promise(r => setTimeout(r, 1000));
            }

            if (capturedToken) {
                this.currentToken = capturedToken;
                this.lastRefresh = new Date();
                console.log(`✅ [TokenManager] Token listo. Válido desde: ${this.lastRefresh.toISOString()}`);
            } else {
                console.warn('⚠️ [TokenManager] No se pudo capturar el token.');
            }

        } catch (err) {
            console.error('❌ [TokenManager] Error:', err.message);
        } finally {
            if (browser) await browser.close().catch(() => {});
            this.isRefreshing = false;
        }

        return this.currentToken;
    }

    // Inicia el ciclo de refresco automático (cada 12 minutos)
    async iniciar() {
        await this.refrescar();
        setInterval(() => this.refrescar(), 12 * 60 * 1000);
    }
}

module.exports = new TokenManager();
