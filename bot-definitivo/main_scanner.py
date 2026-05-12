import asyncio
import json
import os
import sys
import time
import httpx
from datetime import datetime
from gestor_sesiones import renovar_sesion_oculta

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

# ─── Inicializar Config y Rutas ───────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
with open(os.path.join(BASE_DIR, "config.json"), "r") as f:
    config = json.load(f)

COOKIES_FILE = os.path.join(BASE_DIR, "sesion_capturada.json")
INPUT_FILE   = os.path.join(BASE_DIR, config.get("input_file", "../bot-movistar/numeros_limpios.txt"))
OUTPUT_FILE  = os.path.join(BASE_DIR, config.get("output_file", "resultados_api.txt"))
MALOS_FILE   = os.path.join(BASE_DIR, config.get("malos_file", "malos_api.txt"))
LOG_FILE     = os.path.join(BASE_DIR, config.get("log_file", "log_api.txt"))

API_URL = "https://www.efectyvirtual.com/PortalEcommerce/Collect/GetInvoices?ProjectId=113837"

PAYLOAD_TEMPLATE = (
    "references=%5B%7B%22Name%22%3A%22REFERENCIA%22%2C%22ControlType%22%3A%22TEXTBOX%22"
    "%2C%22DisplayText%22%3A%22No%2BCELULAR%2BO%2BCUENTA%3A%22%2C%22Format%22%3A%22NUMERICO%22"
    "%2C%22Enabled%22%3A%22True%22%2C%22Visible%22%3A%22True%22%2C%22Persist%22%3A%22False%22"
    "%2C%22Order%22%3A%226%22%2C%22Printable%22%3A%22True%22%2C%22MinValue%22%3A%220%22"
    "%2C%22MaxValue%22%3A%220%22%2C%22ItemObjectType%22%3A%22ECommerce.WCF.CollectService.CampoClaveTexto%22"
    "%2C%22Value%22%3A%22{numero}%22%2C%22ItemType%22%3A2%2C%22OptionList%22%3A%5B%5D%7D%5D"
    "&ProjectName=113837%2B-%2BMOVISTAR%2BFIJO%2BY%2BMOVIL%2BAPP"
)

HEADERS_BASE = {
    "Accept"          : "*/*",
    "Accept-Language" : "es-CO",
    "Content-Type"    : "application/x-www-form-urlencoded; charset=UTF-8",
    "X-Requested-With": "XMLHttpRequest",
    "Referer"         : "https://www.efectyvirtual.com/",
    "User-Agent"      : "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Origin"          : "https://www.efectyvirtual.com",
}

G = "\033[92m"; Y = "\033[93m"; R = "\033[91m"; X = "\033[0m"; B = "\033[1m"; C = "\033[96m"

class Estado:
    def __init__(self):
        self.buenos = 0
        self.malos = 0
        self.procesados = 0
        self.total = 0
        self.inicio = time.time()
        self.sesion_ok = True
        self.lock = asyncio.Lock()
        self.renovando = False

estado = Estado()

def cookies_a_header(cookies: dict) -> str:
    orden = [".ASPXAUTH", "ASP.NET_SessionId", "__RequestVerificationToken_L1BvcnRhbEVjb21tZXJjZQ2", "timeout"]
    
    # Normalizamos a un formato plano sin importar si viene de Playwright o API
    cookies_flat = {}
    if "cookies" in cookies:
        for c in cookies["cookies"]:
            # Ignoramos keys "Set-Cookie" crudos que ensucian el header
            if c["name"] != "Set-Cookie":
                cookies_flat[c["name"]] = c["value"]
    else:
        cookies_flat = cookies
        
    otras = [k for k in cookies_flat if k not in orden]
    return "; ".join(f"{k}={cookies_flat[k]}" for k in orden + otras if k in cookies_flat)

async def manejar_renovacion(client: httpx.AsyncClient):
    """Maneja el hilo de renovacion. Asegura que ocurra una sola vez en bloque."""
    async with estado.lock:
        if estado.renovando:
            return
        estado.renovando = True
        
    print(f"\n{R}{B}================================================================={X}")
    print(f"{R}{B}  ⚠️ SESION CAIDA. ACTIVANDO SALVAMENTO AUTOMATICO (CapSolver)...{X}")
    print(f"{R}{B}================================================================={X}\n")

    try:
        await renovar_sesion_oculta(config)
        with open(COOKIES_FILE, "r") as f:
            nuevas_cookies = json.load(f)
            
        client.headers["Cookie"] = cookies_a_header(nuevas_cookies)
        
        async with estado.lock:
            estado.sesion_ok = True
            
        print(f"\n{G}{B}================================================================={X}")
        print(f"{G}{B}  ✅ SALVAMENTO COMPLETADO. REANUDANDO NUMEROS POR API...{X}")
        print(f"{G}{B}================================================================={X}")
    except Exception as e:
        print(f"\n{R}❌ Falla critica al auto-renovar sesion: {e}{X}")
        sys.exit(1)
    finally:
        async with estado.lock:
            estado.renovando = False

def ts(): return datetime.now().strftime("%H:%M:%S")

async def guardar_bueno(numero, nombre, ref, valor):
    async with estado.lock:
        with open(OUTPUT_FILE, "a", encoding="utf-8") as f:
            f.write(f"{numero}|{nombre}|{ref}|{valor}\n")
        estado.buenos += 1
        estado.procesados += 1

async def guardar_malo(numero):
    async with estado.lock:
        with open(MALOS_FILE, "a", encoding="utf-8") as f:
            f.write(f"{numero}\n")
        estado.malos += 1
        estado.procesados += 1

def cargar_procesados():
    p = set()
    for arch in (OUTPUT_FILE, MALOS_FILE):
        if os.path.exists(arch):
            with open(arch, "r", encoding="utf-8") as f:
                for line in f:
                    if '|' in line:
                        p.add(line.split('|')[0].strip())
                    else:
                        if n:= line.strip(): p.add(n)
    return p

async def consultar(client, numero, semaforo, delay):
    if not estado.sesion_ok:
        return "sesion_expirada"

    async with semaforo:
        await asyncio.sleep(delay)
        idx = estado.procesados + 1
        pct = (idx / estado.total) * 100 if estado.total > 0 else 0
        
        velo = (estado.procesados / ((time.time() - estado.inicio) / 60)) if estado.procesados > 0 else 0
        rem  = ((estado.total - estado.procesados) / velo) if velo > 0 else 0
        sys.stdout.write(f"\r[{ts()}] {pct:04.1f}% | ✅{estado.buenos} ❌{estado.malos} | {velo:.0f}/min | ETA {rem/60:.1f}h     ")
        sys.stdout.flush()

        payload = PAYLOAD_TEMPLATE.format(numero=numero)

        try:
            r = await client.post(API_URL, content=payload.encode("utf-8"))
            if r.status_code in (302, 401, 403) or "Object moved" in r.text or "Account/Login" in r.url.path:
                estado.sesion_ok = False
                return "sesion_expirada"

            try:
                j = r.json()
            except:
                if "#DocumentNumber" in r.text or "Ha ocurrido un error" in r.text:
                    estado.sesion_ok = False
                    return "sesion_expirada"
                await guardar_malo(numero)
                return "temporal"

            correcto = j.get("Correcto", False)
            mensaje  = j.get("Mensaje", "")
            datos    = j.get("Datos", [])

            if correcto and datos:
                nombre = "ENCONTRADO_API"
                ref    = numero
                valor  = "0"
                if isinstance(datos, list) and len(datos) > 0:
                    d = datos[0]
                    valor = str(d.get("Value") if d.get("Value") is not None else d.get("Valor", "0")).strip()
                    
                    for item in d.get("ControlList", []):
                        name_tag = str(item.get("Name", "")).upper()
                        if name_tag == "NOMBRE":
                            nombre = str(item.get("Value", "ENCONTRADO_API")).strip().upper()
                        elif name_tag == "REFERENCIA2":
                            ref = str(item.get("Value", numero)).strip()
                    
                    if nombre == "ENCONTRADO_API":
                        nombre = str(d.get("Nombre") or "ENCONTRADO_API").strip().upper()
                
                await guardar_bueno(numero, nombre, ref, valor)
                return "bueno"
            elif "Error al consultar: ERROR" in mensaje or "no permite el recaudo de facturas por este valor" in mensaje:
                # ❌ Confirmado por Efecty: No encontrado / Sin deuda / $0
                await guardar_malo(numero)
                return "malo"
            elif "La sesión ha finalizado" in mensaje:
                # 🔄 Sesión muerta detectada, gatillar renovación
                estado.sesion_ok = False
                return "sesion_expirada"
            else:
                # ⏳ Error de sesion, timeout o servidor caido
                if mensaje:
                    sys.stdout.write(f"\n  {Y}[DEBUG] {numero}: {mensaje}{X}\n")
                return "temporal"

        except Exception as e:
            err_msg = str(e)
            sys.stdout.write(f"\r  {R}❌ Error de conexion ({numero}): {err_msg[:60]}...{X}\n")
            with open(LOG_FILE, "a") as f:
                f.write(f"[{datetime.now()}] ERROR {numero}: {err_msg}\n")
            await asyncio.sleep(1)
            return "temporal"

async def main():
    print(f"\n{B}{G}🤖 BOT DEFINITIVO — Efecty / Movistar (Con Auto-Recover CapSolver){X}\n")
    print(f"  {C}* MODO ULTRARAPIDO API RECUPERADO *{X}\n")
    
    todosp = cargar_procesados()
    if not os.path.exists(INPUT_FILE):
        print(f"❌ No existe archivo de entrada {INPUT_FILE}")
        return

    with open(INPUT_FILE, "r") as f:
        pendientes = [n.strip() for n in f if n.strip() and n.strip() not in todosp]
        
    estado.total = len(pendientes)
    print(f"  Numeros por procesar: {estado.total}")
    
    if estado.total == 0:
        return
        
    client = httpx.AsyncClient(headers=HEADERS_BASE, verify=False, timeout=15.0)
    
    if os.path.exists(COOKIES_FILE):
        with open(COOKIES_FILE, "r") as f:
            c = json.load(f)
            client.headers["Cookie"] = cookies_a_header(c)
    else:
        estado.sesion_ok = False
        
    semaforo = asyncio.Semaphore(config.get("bot_workers", 12))
    delay_sec = config.get("bot_delay_seconds", 0.4)
    BATCH = 1000
    FALLIDOS_FILE = os.path.join(BASE_DIR, "pendientes_especiales.txt")
    intentos_numeros = {}
    fallos_sesion_seguidos = 0
    
    print("\n🚀 Iniciando procesamiento masivo...")
    estado.inicio = time.time()
    
    try:
        for start in range(0, len(pendientes), BATCH):
            lote = pendientes[start : start + BATCH]
            
            while lote:
                if not estado.sesion_ok:
                    try:
                        await manejar_renovacion(client)
                        fallos_sesion_seguidos = 0 # Reset si logramos renovar
                    except:
                        fallos_sesion_seguidos += 1
                        if fallos_sesion_seguidos >= 3:
                            print(f"\n{R}🛑 ABORTO DE SEGURIDAD: 3 fallos seguidos de renovacion.{X}")
                            return
                        await asyncio.sleep(10)
                        continue
                
                tareas = [consultar(client, n, semaforo, delay_sec) for n in lote]
                resultados = await asyncio.gather(*tareas, return_exceptions=True)
                
                reintentar = []
                procesados_en_este_lote = 0
                
                for num, res in zip(lote, resultados):
                    if isinstance(res, Exception):
                        reintentar.append(num)
                        continue
                        
                    if res == "bueno":
                        sys.stdout.write(f"\r  {G}{B}✅ {num} -> DEUDA LOCALIZADA!{X}\n")
                        procesados_en_este_lote += 1
                    elif res == "sesion_expirada" or res == "temporal":
                        # Sistema de reintentos (Max 3)
                        intentos = intentos_numeros.get(num, 0) + 1
                        intentos_numeros[num] = intentos
                        
                        if intentos >= 3:
                            sys.stdout.write(f"\r  {Y}⚠️ {num} -> EXCLUIDO tras 3 fallos.{X}\n")
                            with open(FALLIDOS_FILE, "a") as f:
                                f.write(f"{num}\n")
                        else:
                            reintentar.append(num)
                    else:
                        procesados_en_este_lote += 1
                
                # Si el lote era de 100 y no procesamos nada, es que la sesión está "fria" (aunque diga OK)
                if lote and procesados_en_este_lote == 0 and estado.sesion_ok:
                    print(f"\n  {Y}⚠️ Advertencia: Lote fallido al 100%. Forzando nueva sesion...{X}")
                    estado.sesion_ok = False
                    
                lote = reintentar
                if lote:
                    await asyncio.sleep(2) # Respiro antes de reintentar fallidos
    except KeyboardInterrupt:
        pass
    finally:
        await client.aclose()
        print("\n\n🏁 PROCESO FINALIZADO O DETENIDO.")

if __name__ == "__main__":
    asyncio.run(main())

