const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

class TokenPool {
    constructor(maxTokens = 3) {
        this.tokens = [];
        this.maxTokens = maxTokens;
        this.isGenerating = false;
    }

    // Devuelve un token del pool y lo elimina para que no se use dos veces seguidas
    // Si quieres que el mismo token se re-use, quita el `.shift()` y usa un índice.
    getToken() {
        if (this.tokens.length === 0) return null;
        
        // Rotación: tomamos el primero y lo mandamos al final (Round Robin)
        const token = this.tokens.shift();
        this.tokens.push(token);
        return token;
    }

    async startFillingPool() {
        if (this.isGenerating || this.tokens.length >= this.maxTokens) return;
        this.isGenerating = true;

        console.log(`🤖 [Pool] Generando nuevo token... (Actuales: ${this.tokens.length}/${this.maxTokens})`);

        let browser;
        try {
            browser = await puppeteer.launch({
                headless: "new",
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
            const page = await browser.newPage();
            await page.setRequestInterception(true);

            let capturedToken = null;

            page.on('request', request => {
                const postData = request.postData();
                if (postData && postData.includes('tokenAPim')) {
                    try {
                        const json = JSON.parse(postData);
                        if (json.tokenAPim) capturedToken = json.tokenAPim;
                    } catch (e) {}
                }
                request.continue();
            });

            await page.goto('https://payment.telefonicawebsites.co/', { waitUntil: 'domcontentloaded', timeout: 60000 });
            await page.waitForSelector('select', { timeout: 15000 });
            await page.select('select', '1');
            await page.waitForSelector('input[name="phoneNumber"]', { timeout: 10000 });
            await page.type('input[name="phoneNumber"]', '3162511612', { delay: 100 });
            await page.click('button[type="submit"]');

            for (let i = 0; i < 20; i++) {
                if (capturedToken) break;
                await new Promise(r => setTimeout(r, 1000));
            }

            if (capturedToken) {
                // Verificamos que no sea un duplicado exacto
                if (!this.tokens.includes(capturedToken)) {
                    this.tokens.push(capturedToken);
                    console.log(`✅ [Pool] ¡Token fresco agregado! Total en bolsa: ${this.tokens.length}`);
                }
            }
        } catch (error) {
            console.error("⚠️ [Pool] Error al generar token:", error.message);
        } finally {
            if (browser) await browser.close();
            this.isGenerating = false;
            
            // Si aún nos faltan tokens, llamamos la función de nuevo tras una pequeña pausa
            if (this.tokens.length < this.maxTokens) {
                setTimeout(() => this.startFillingPool(), 5000);
            }
        }
    }

    // Método para forzar la recolección si el pool se vacía
    replenish() {
        this.startFillingPool();
    }
}

module.exports = new TokenPool(3); // Mantendrá 3 tokens frescos listos
