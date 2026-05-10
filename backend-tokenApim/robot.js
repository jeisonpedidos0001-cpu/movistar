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

            // Navegar al formulario y esperar carga completa
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

            // Esperar 2 segundos
            await new Promise(r => setTimeout(r, 2000));

            // Preparar el interceptor de la respuesta (sin reject para no crashear Node)
            const respuestaPromesa = new Promise((resolve) => {
                const timer = setTimeout(() => resolve('TIMEOUT'), 25000);

                const handler = async (response) => {
                    if (response.url().includes('/api/data-payment')) {
                        clearTimeout(timer);
                        this.page.off('response', handler);
                        try {
                            const json = await response.json();
                            resolve(json);
                        } catch (e) {
                            resolve('ERROR_PARSE');
                        }
                    }
                };
                this.page.on('response', handler);
            });

            // Hacer clic en Continuar
            await this.page.click('button[type="submit"]');

            // Esperar la respuesta
            const data = await respuestaPromesa;

            if (data === 'TIMEOUT' || data === 'ERROR_PARSE' || !data || !data.values) {
                // Tomar foto de evidencia para ver por qué falló
                const path = require('path');
                const fotoPath = path.join(__dirname, `../dist/error_robot_${this.id}.png`);
                await this.page.screenshot({ path: fotoPath, fullPage: true });
                console.log(`📸 [Robot-${this.id}] Foto tomada y guardada en: /error_robot_${this.id}.png`);
                
                throw new Error('Timeout esperando respuesta de Movistar (Foto tomada)');
            }

            console.log(`✅ [Robot-${this.id}] Factura obtenida: $${data.values.transactionValue}`);
            return data;

        } catch (error) {
            console.error(`❌ [Robot-${this.id}] Error en la consulta: ${error.message}`);
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
