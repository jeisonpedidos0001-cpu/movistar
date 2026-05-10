const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const PUPPETEER_ARGS = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--single-process',
    '--no-zygote'
];

class Robot {
    constructor() {
        this.browser = null;
        this.page = null;
        this.cola = [];          // Fila de espera de consultas
        this.trabajando = false; // Si el robot está ocupado
    }

    // Inicia el navegador una sola vez
    async iniciar() {
        console.log('🤖 [Robot] Iniciando navegador persistente...');
        this.browser = await puppeteer.launch({
            headless: 'new',
            args: PUPPETEER_ARGS
        });
        this.page = await this.browser.newPage();
        
        // Ir a la página de Movistar y dejarla lista
        await this.page.goto('https://payment.telefonicawebsites.co/', {
            waitUntil: 'domcontentloaded',
            timeout: 60000
        });
        console.log('✅ [Robot] Navegador listo en Movistar.');
    }

    // Método público: encola una consulta y devuelve una Promesa
    consultar(numero) {
        return new Promise((resolve, reject) => {
            this.cola.push({ numero, resolve, reject });
            console.log(`📥 [Robot] Número ${numero} en fila. Cola: ${this.cola.length} pendientes.`);
            this._procesarCola();
        });
    }

    // Procesa la fila de consultas de a una por vez
    async _procesarCola() {
        if (this.trabajando || this.cola.length === 0) return;
        this.trabajando = true;

        const { numero, resolve, reject } = this.cola.shift();

        try {
            console.log(`📡 [Robot] Consultando número: ${numero}`);
            const data = await this._hacerConsulta(numero);
            resolve(data);
        } catch (error) {
            console.error(`❌ [Robot] Error consultando ${numero}: ${error.message}`);
            reject(error);
        } finally {
            this.trabajando = false;
            // Procesar el siguiente en la fila
            if (this.cola.length > 0) {
                this._procesarCola();
            }
        }
    }

    // La consulta real: el robot opera el navegador
    async _hacerConsulta(numero) {
        let facturaData = null;
        let requestError = null;

        // Interceptar la respuesta de Movistar directamente
        await this.page.setRequestInterception(true);

        const requestHandler = (request) => {
            request.continue();
        };

        const responseHandler = async (response) => {
            if (response.url().includes('/api/data-payment')) {
                try {
                    const json = await response.json();
                    if (json && json.values) {
                        facturaData = json;
                    }
                } catch (e) {
                    requestError = e;
                }
            }
        };

        this.page.on('request', requestHandler);
        this.page.on('response', responseHandler);

        try {
            // Recargar la página para empezar limpio
            await this.page.goto('https://payment.telefonicawebsites.co/', {
                waitUntil: 'domcontentloaded',
                timeout: 30000
            });

            // Seleccionar "Con número de línea Pospago"
            await this.page.waitForSelector('select', { timeout: 15000 });
            await this.page.select('select', '1');

            // Esperar el input del número
            await this.page.waitForSelector('input[name="phoneNumber"]', { timeout: 10000 });
            await this.page.click('input[name="phoneNumber"]', { clickCount: 3 });
            await this.page.type('input[name="phoneNumber"]', numero, { delay: 80 });

            // Clic en Continuar
            await this.page.click('button[type="submit"]');

            // Esperar hasta 20 segundos a que llegue la respuesta de la factura
            for (let i = 0; i < 20; i++) {
                if (facturaData || requestError) break;
                await new Promise(r => setTimeout(r, 1000));
            }

            if (!facturaData) {
                throw new Error('Tiempo de espera agotado. Movistar no respondió.');
            }

            console.log(`✅ [Robot] Factura obtenida para ${numero}: $${facturaData.values?.transactionValue}`);
            return facturaData;

        } finally {
            // Limpiar los listeners para no acumular
            this.page.off('request', requestHandler);
            this.page.off('response', responseHandler);
            await this.page.setRequestInterception(false);
        }
    }

    // En caso de error grave, reinicia el navegador
    async reiniciar() {
        console.log('🔄 [Robot] Reiniciando navegador...');
        try {
            if (this.browser) await this.browser.close();
        } catch (e) {}
        await this.iniciar();
    }
}

module.exports = new Robot();
