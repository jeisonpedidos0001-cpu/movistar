const express = require('express');
const cors = require('cors');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

// 🌐 Servir frontend desde dist/
app.use(express.static(path.join(__dirname, '../dist')));

// ─── Config ───
const BOT_DIR = path.join(__dirname, '../bot-definitivo');
const COOKIES_FILE = path.join(BOT_DIR, 'sesion_capturada.json');
const CONFIG_FILE = path.join(BOT_DIR, 'config.json');

const API_URL = 'https://www.efectyvirtual.com/PortalEcommerce/Collect/GetInvoices?ProjectId=113837';

const HEADERS_BASE = {
    'Accept': '*/*',
    'Accept-Language': 'es-CO',
    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    'X-Requested-With': 'XMLHttpRequest',
    'Referer': 'https://www.efectyvirtual.com/',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Origin': 'https://www.efectyvirtual.com'
};

// ─── Caché (5 min) ───
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000;
function cacheGet(key) {
    const e = cache.get(key);
    if (!e) return null;
    if (Date.now() - e.ts > CACHE_TTL) { cache.delete(key); return null; }
    return e.data;
}
function cacheSet(key, data) { cache.set(key, { data, ts: Date.now() }); }

// ─── Estado de sesión ───
let sessionCookies = null;
let isRenewing = false;

function buildPayload(numero) {
    return `references=%5B%7B%22Name%22%3A%22REFERENCIA%22%2C%22ControlType%22%3A%22TEXTBOX%22%2C%22DisplayText%22%3A%22No%2BCELULAR%2BO%2BCUENTA%3A%22%2C%22Format%22%3A%22NUMERICO%22%2C%22Enabled%22%3A%22True%22%2C%22Visible%22%3A%22True%22%2C%22Persist%22%3A%22False%22%2C%22Order%22%3A%226%22%2C%22Printable%22%3A%22True%22%2C%22MinValue%22%3A%220%22%2C%22MaxValue%22%3A%220%22%2C%22ItemObjectType%22%3A%22ECommerce.WCF.CollectService.CampoClaveTexto%22%2C%22Value%22%3A%22${numero}%22%2C%22ItemType%22%3A2%2C%22OptionList%22%3A%5B%5D%7D%5D&ProjectName=113837%2B-%2BMOVISTAR%2BFIJO%2BY%2BMOVIL%2BAPP`;
}

function cookiesToHeader(cookiesData) {
    const orden = ['.ASPXAUTH', 'ASP.NET_SessionId', '__RequestVerificationToken_L1BvcnRhbEVjb21tZXJjZQ2', 'timeout'];
    const flat = {};

    if (cookiesData.cookies) {
        for (const c of cookiesData.cookies) {
            if (c.name !== 'Set-Cookie') {
                flat[c.name] = c.value;
            }
        }
    }

    const keys = [...orden.filter(k => flat[k]), ...Object.keys(flat).filter(k => !orden.includes(k))];
    return keys.map(k => `${k}=${flat[k]}`).join('; ');
}

function loadCookies() {
    try {
        if (fs.existsSync(COOKIES_FILE)) {
            const data = JSON.parse(fs.readFileSync(COOKIES_FILE, 'utf-8'));
            sessionCookies = cookiesToHeader(data);
            console.log('🍪 Cookies cargadas desde archivo.');
            return true;
        }
    } catch (e) {
        console.error('❌ Error cargando cookies:', e.message);
    }
    return false;
}

// ─── Renovar sesión con Python (gestor_sesiones.py) ───
function renovarSesion() {
    return new Promise((resolve, reject) => {
        if (isRenewing) {
            // Esperar a que termine la renovación actual
            const check = setInterval(() => {
                if (!isRenewing) {
                    clearInterval(check);
                    resolve(!!sessionCookies);
                }
            }, 1000);
            return;
        }

        isRenewing = true;
        console.log('🔐 Renovando sesión con Python (CapSolver + Playwright)...');

        const py = spawn('python', ['gestor_sesiones.py'], {
            cwd: BOT_DIR,
            env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
        });

        py.stdout.on('data', (data) => {
            const lines = data.toString().split('\n').filter(l => l.trim());
            lines.forEach(l => console.log(`  [PY] ${l.trim()}`));
        });

        py.stderr.on('data', (data) => {
            console.error(`  [PY-ERR] ${data.toString().trim()}`);
        });

        py.on('close', (code) => {
            isRenewing = false;
            if (code === 0) {
                loadCookies();
                console.log('✅ Sesión renovada exitosamente.');
                resolve(true);
            } else {
                console.error(`❌ Python terminó con código ${code}`);
                reject(new Error('Fallo renovación de sesión'));
            }
        });
    });
}

// ─── Consultar vía API de Efecty ───
async function consultarEfecty(numero) {
    const payload = buildPayload(numero);

    const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
            ...HEADERS_BASE,
            'Cookie': sessionCookies
        },
        body: payload
    });

    const text = await response.text();

    console.log(`📊 [Efecty] Status: ${response.status} | Body (primeros 200): ${text.substring(0, 200)}`);

    // Detectar sesión caída
    if (response.status === 302 || response.status === 401 || response.status === 403 ||
        text.includes('Object moved') || text.includes('Account/Login') ||
        text.includes('La sesión ha finalizado') || text.includes('#DocumentNumber') ||
        text.includes('Ha ocurrido un error') || text.length === 0) {
        throw new Error('SESION_EXPIRADA');
    }

    const data = JSON.parse(text);
    return data;
}

function maskName(fullName) {
    if (!fullName) return '';
    return fullName
        .trim()
        .split(/\s+/)
        .map(word => {
            if (word.length <= 2) {
                return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() + '****';
            }
            return word.charAt(0).toUpperCase() + word.charAt(1).toLowerCase() + '****';
        })
        .join(' ');
}

function maskReference(ref) {
    if (!ref) return '';
    const str = String(ref).trim();
    if (str.length < 4) return str + '******';
    return str.slice(0, 2) + '******' + str.slice(-2);
}

// ─── Endpoint principal ───
app.post('/api/consultar', async (req, res) => {
    try {
        const { numero } = req.body;
        if (!numero) return res.status(400).json({ error: 'Número requerido' });

        // Caché
        const cached = cacheGet(numero);
        if (cached) {
            console.log(`⚡ [Caché] ${numero}`);
            return res.json(cached);
        }

        if (!sessionCookies) {
            console.log('⚠️ Sin sesión, renovando...');
            await renovarSesion();
            if (!sessionCookies) {
                return res.status(503).json({ error: 'Sesión no disponible. Intenta en 30s.' });
            }
        }

        console.log(`📡 Consultando: ${numero}`);

        // Intentar hasta 2 veces (con renovación si la sesión expira)
        for (let i = 0; i < 2; i++) {
            try {
                const data = await consultarEfecty(numero);

                if (data.Correcto && data.Datos && data.Datos.length > 0) {
                    // ✅ Encontrado — formatear respuesta
                    const d = data.Datos[0];
                    const valor = Number(d.Value || d.Valor || d.CollectSelectedValue || 0);
                    let nombreRaw = '';
                    let refRaw = numero;
                    let celularOCuentaRaw = '';

                    if (d.ControlList) {
                        for (const item of d.ControlList) {
                            const tag = (item.Name || '').toUpperCase();
                            if (tag === 'NOMBRE') nombreRaw = item.Value || '';
                            else if (tag === 'REFERENCIA2') refRaw = item.Value || numero;
                            else if (!celularOCuentaRaw) celularOCuentaRaw = item.Value || '';
                        }
                    }
                    if (!nombreRaw || nombreRaw.toUpperCase() === 'ENCONTRADO') {
                        nombreRaw = d.Nombre || 'USUARIO MOVISTAR';
                    }
                    if (!celularOCuentaRaw) celularOCuentaRaw = refRaw;

                    const maskedName = maskName(nombreRaw);
                    const maskedRef = maskReference(celularOCuentaRaw);
                    const invoiceSN = 'BE********' + Math.floor(100 + Math.random() * 900);

                    const respuesta = {
                        error: 0,
                        values: {
                            clientName: maskedName,
                            transactionValue: valor,
                            docNumber: refRaw,
                            referenceNumber: numero,
                            phoneNumber: null,
                            invoiceInformationQiItem: [
                                {
                                    accountNumberCustomerAccount: maskedRef,
                                    invoiceSNPaymentInfoRel: invoiceSN,
                                    serviceAmountTotal: valor
                                }
                            ]
                        },
                        raw: data
                    };

                    cacheSet(numero, respuesta);
                    console.log(`✅ ${numero} → ${maskedName} → $${valor}`);
                    return res.json(respuesta);

                } else if (data.Mensaje && data.Mensaje.includes('Error al consultar')) {
                    // ❌ No encontrado
                    console.log(`❌ ${numero} → Sin deuda`);
                    return res.json({ error: 1, message: 'Sin deuda activa', values: null });
                } else {
                    console.log(`⚠️ ${numero} → Respuesta inesperada: ${data.Mensaje || 'sin mensaje'}`);
                    return res.json({ error: 2, message: data.Mensaje || 'Respuesta inesperada', values: null });
                }

            } catch (err) {
                if (err.message === 'SESION_EXPIRADA' && i === 0) {
                    console.log('🔄 Sesión expirada, renovando...');
                    await renovarSesion();
                    continue;
                }
                throw err;
            }
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/estado', (req, res) => res.json({
    sesionActiva: !!sessionCookies,
    renovando: isRenewing
}));

// 🌐 SPA catch-all
app.get('/{*path}', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// ─── ARRANQUE ───
const PORT = process.env.PORT || 4000;
app.listen(PORT, '0.0.0.0', async () => {
    console.log(`🚀 Servidor en http://localhost:${PORT}`);
    console.log(`🏦 Backend: API Efecty → Movistar`);

    // Cargar cookies existentes
    if (!loadCookies()) {
        console.log('⚠️ No hay cookies guardadas. Renovando sesión...');
        try { await renovarSesion(); } catch (e) { console.error('❌', e.message); }
    }
});
