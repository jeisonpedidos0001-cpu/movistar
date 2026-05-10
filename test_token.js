const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

async function ejecutarPrueba() {
    console.log("🚀 Iniciando el navegador para capturar token...");
    
    const browser = await puppeteer.launch({
        headless: false, // ¡Verás la ventana abierta!
        defaultViewport: null,
        args: ['--start-maximized', '--no-sandbox']
    });

    try {
        const page = await browser.newPage();
        
        // Activamos interceptación de red
        await page.setRequestInterception(true);
        
        let tokenCapturado = null;

        page.on('request', request => {
            const postData = request.postData();
            if (postData) {
                try {
                    const json = JSON.parse(postData);
                    if (json.tokenAPim) {
                        tokenCapturado = json.tokenAPim;
                        console.log("\n🎯 ¡TOKEN DETECTADO!");
                        console.log("==========================================");
                        console.log(tokenCapturado);
                        console.log("==========================================\n");
                    }
                } catch (e) { /* No es un JSON válido o no tiene el token */ }
            }
            request.continue();
        });

        console.log("🌐 Navegando a Movistar...");
        await page.goto('https://payment.telefonicawebsites.co/', { 
            waitUntil: 'domcontentloaded',
            timeout: 60000 
        });

        console.log("🖱️ Seleccionando tipo de línea (Pospago)...");
        await page.waitForSelector('select', { timeout: 20000 });
        await page.select('select', '1');

        console.log("⌨️ Escribiendo número de teléfono...");
        await page.waitForSelector('input[name="phoneNumber"]', { timeout: 10000 });
        await page.type('input[name="phoneNumber"]', '3162511612', { delay: 150 });

        console.log("🔘 Haciendo clic en Continuar...");
        await page.waitForSelector('button[type="submit"]', { timeout: 10000 });
        await page.click('button[type="submit"]');

        console.log("⏳ Esperando interceptación... No cierres la ventana.");
        
        // Mantenemos abierto el navegador hasta que capture el token o pasen 30 segundos
        for (let i = 0; i < 30; i++) {
            if (tokenCapturado) break;
            await new Promise(r => setTimeout(r, 1000));
        }

        if (tokenCapturado) {
            console.log("✅ Prueba exitosa. Ya puedes cerrar.");
        } else {
            console.log("❌ No se interceptó el token en el tiempo esperado.");
        }

    } catch (err) {
        console.error("💥 Error durante la prueba:", err.message);
    } finally {
        console.log("Presiona Ctrl+C para terminar el script.");
    }
}

ejecutarPrueba();
