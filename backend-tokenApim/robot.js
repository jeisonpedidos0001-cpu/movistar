const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const ARGS = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--single-process',
    '--no-zygote'
];

class Robot {
    constructor(id) {
        this.id = id;
        this.busy = false;
        this.browser = null;
        this.page = null;
    }

    async iniciar() {
        console.log(`🤖 [Robot-${this.id}] Iniciando...`);
        this.browser = await puppeteer.launch({ headless: 'new', args: ARGS });
        this.page = await this.browser.newPage();
        // Bloquear recursos innecesarios para ahorrar memoria
        await this.page.setRequestInterception(true);
        this.page.on('request', req => {
            const tipo = req.resourceType();
            // Solo bloquear imágenes y fuentes (NO stylesheets, los necesita reCAPTCHA)
            if (['image', 'font', 'media'].includes(tipo)) {
                req.abort();
            } else {
                req.continue();
            }
        });
        console.log(`✅ [Robot-${this.id}] Listo.`);
    }

    async consultar(numero) {
        this.busy = true;
        try {
            console.log(`📡 [Robot-${this.id}] Consultando: ${numero}`);

            // Promesa que espera la respuesta de Movistar
            const respuestaPromesa = new Promise((resolve, reject) => {
                const timer = setTimeout(() => {
                    reject(new Error(`[Robot-${this.id}] Timeout esperando respuesta de Movistar`));
                }, 25000);

                const handler = async (response) => {
                    if (response.url().includes('/api/data-payment')) {
                        clearTimeout(timer);
                        this.page.off('response', handler);
                        try {
                            const json = await response.json();
                            resolve(json);
                        } catch (e) {
                            reject(e);
                        }
                    }
                };
                this.page.on('response', handler);
            });

            // Navegar al formulario y esperar carga completa (incluyendo reCAPTCHA)
            await this.page.goto('https://payment.telefonicawebsites.co/', {
                waitUntil: 'networkidle2',
                timeout: 45000
            });

            // Seleccionar Pospago y escribir el número
            await this.page.waitForSelector('select', { timeout: 20000 });
            await this.page.select('select', '1');
            await this.page.waitForSelector('input[name="phoneNumber"]', { timeout: 15000 });
            await this.page.click('input[name="phoneNumber"]', { clickCount: 3 });
            await this.page.type('input[name="phoneNumber"]', String(numero), { delay: 80 });

            // Esperar 2 segundos para que el reCAPTCHA termine de inicializarse
            await new Promise(r => setTimeout(r, 2000));

            // Hacer clic en Continuar (Movistar genera su propio reCAPTCHA aquí)
            await this.page.click('button[type="submit"]');

            // Esperar la respuesta interceptada
            const data = await respuestaPromesa;

            if (!data || !data.values) {
                throw new Error('Respuesta vacía o inválida de Movistar');
            }

            console.log(`✅ [Robot-${this.id}] Factura obtenida: $${data.values.transactionValue}`);
            return data;

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
