const axios = require('axios');

// ─── Configuración ───
const CAPSOLVER_API_KEY = process.env.CAPSOLVER_KEY || 'CAP-FCAABEBE8F4E75BBC493B2FA4995BFA1F3936D34B85B2DF84CBF884F2E333D42';
const MOVISTAR_SITE_KEY = '6LcZQHsrAAAAAMuGo3b_QaIiJw_krUJ76U2eMivQ';
const MOVISTAR_URL = 'https://payment.telefonicawebsites.co/';

async function resolverRecaptcha() {
    console.log('🧩 [CapSolver] Solicitando resolución de reCAPTCHA...');

    // Crear la tarea - usamos ReCaptchaV2TaskProxyLess (el invisible de Movistar es v2)
    const createRes = await axios.post('https://api.capsolver.com/createTask', {
        clientKey: CAPSOLVER_API_KEY,
        task: {
            type: 'ReCaptchaV2TaskProxyLess',
            websiteURL: MOVISTAR_URL,
            websiteKey: MOVISTAR_SITE_KEY,
            isInvisible: true
        }
    });

    const taskId = createRes.data?.taskId;
    if (!taskId) {
        throw new Error(`CapSolver no creó tarea: ${JSON.stringify(createRes.data)}`);
    }

    console.log(`🧩 [CapSolver] Tarea: ${taskId}. Esperando resolución...`);

    // Esperar el resultado (polling cada 3s, máximo 60s)
    for (let i = 0; i < 20; i++) {
        await new Promise(r => setTimeout(r, 3000));

        const resultRes = await axios.post('https://api.capsolver.com/getTaskResult', {
            clientKey: CAPSOLVER_API_KEY,
            taskId: taskId
        });

        const status = resultRes.data?.status;

        if (status === 'ready') {
            const token = resultRes.data?.solution?.gRecaptchaResponse;
            if (!token) throw new Error('CapSolver devolvió resultado vacío.');
            console.log('✅ [CapSolver] reCAPTCHA resuelto exitosamente.');
            return token;
        }

        if (status === 'failed') {
            throw new Error(`CapSolver falló: ${JSON.stringify(resultRes.data)}`);
        }
    }

    throw new Error('CapSolver tardó demasiado (60s).');
}

module.exports = { resolverRecaptcha };
