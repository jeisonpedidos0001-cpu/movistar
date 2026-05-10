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
        
        // Simular un navegador real al 100%
        await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
        await this.page.setViewport({ width: 1366, height: 768 });
        
        // YA NO bloqueamos imágenes ni fuentes, porque reCAPTCHA usa imágenes para validar que eres humano.
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
            await this.page.type('input[name="phoneNumber"]', String(numero), { delay: 100 });

            // Esperar 2 segundos para que se asimile el input
            await new Promise(r => setTimeout(r, 2000));

            // Preparar la escucha de la respuesta ANTES de hacer clic (capturamos cualquier status)
            const respuestaPromesa = this.page.waitForResponse(
                response => response.url().includes('/api/data-payment'),
                { timeout: 20000 }
            ).catch(() => null);

            // Hacer clic en Continuar
            await this.page.click('button[type="submit"]');

            // Esperar la respuesta de la red
            const httpResponse = await respuestaPromesa;

            if (!httpResponse) {
                // Tomar foto si ni siquiera hubo respuesta de red
                const path = require('path');
                const fotoPath = path.join(__dirname, `../dist/error_robot_${this.id}.png`);
                await this.page.screenshot({ path: fotoPath, fullPage: true });
                throw new Error('Timeout extremo: Movistar no respondió nada en 20s');
            }

            const status = httpResponse.status();
            if (status !== 200) {
                throw new Error(`RETRY_NEEDED: Movistar devolvió error ${status} (Problema de su servidor)`);
            }

            const data = await httpResponse.json().catch(() => null);

            if (!data || !data.values) {
                throw new Error('RETRY_NEEDED: Respuesta vacía o inválida de Movistar');
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
