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
                const url = request.url();
                const method = request.method();
                
                // Log de depuración para ver qué está pasando
                if (method === 'POST') {
                    // console.log(`🔍 [TokenManager] POST detectado: ${url}`);
                    const postData = request.postData();
                    if (postData && postData.includes('tokenAPim')) {
                        try {
                            const json = JSON.parse(postData);
                            if (json.tokenAPim) {
                                capturedToken = json.tokenAPim;
                                console.log('🎯 [TokenManager] ¡TOKEN CAPTURADO DESDE PETICIÓN!');
                            }
                        } catch (e) { }
                    }
                }
                request.continue();
            });

            await page.goto('https://payment.telefonicawebsites.co/', {
                waitUntil: 'domcontentloaded',
                timeout: 60000
            });

            // Pausa para que cargue el JS de Movistar
            await new Promise(r => setTimeout(r, 12000)); 

            // Intentar extraer el token de variables globales (por si ya está cargado)
            const tokenDesdeJS = await page.evaluate(() => {
                return window.tokenAPim || window.__TOKEN__ || null;
            });

            if (tokenDesdeJS) {
                capturedToken = tokenDesdeJS;
                console.log('🎯 [TokenManager] ¡TOKEN CAPTURADO DESDE MEMORIA!');
            }

            if (!capturedToken) {
                console.log('📝 [TokenManager] Intentando disparar token con formulario...');
                await page.waitForSelector('select', { timeout: 20000 });
                await page.select('select', '1');
                await new Promise(r => setTimeout(r, 1000));

                await page.waitForSelector('input[name="phoneNumber"]', { timeout: 15000 });
                await page.click('input[name="phoneNumber"]', { clickCount: 3 });
                // Usar el mismo formato que en tu local
                await page.type('input[name="phoneNumber"]', '324 5097754', { delay: 150 });
                
                await new Promise(r => setTimeout(r, 3000));
                console.log('🖱️ [TokenManager] Clic en Continuar...');
                await page.click('button[type="submit"]');

                // Esperar 20 segundos a que aparezca
                for (let i = 0; i < 20; i++) {
                    if (capturedToken) break;
                    await new Promise(r => setTimeout(r, 1000));
                }
            }

            if (capturedToken) {
                this.currentToken = capturedToken;
                this.lastRefresh = new Date();
                console.log(`✅ [TokenManager] Token listo.`);
            } else {
                console.warn('⚠️ [TokenManager] Fallo total. Tomando captura...');
                await page.screenshot({ path: '/tmp/token_fail.png', fullPage: true });
            }

        } catch (err) {
            console.error('❌ [TokenManager] Error:', err.message);
            if (browser) {
                const pages = await browser.pages();
                if (pages.length > 0) {
                    await pages[0].screenshot({ path: '/tmp/token_error.png' }).catch(() => {});
                }
            }
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
