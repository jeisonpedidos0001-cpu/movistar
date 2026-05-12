import asyncio
import json
import os
import sys
from playwright.async_api import async_playwright
from captcha_solver import resolver_captcha

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

TARGET_URL = "https://www.efectyvirtual.com/PortalEcommerce/Collect/Reference/113837?term=113837%20-%20MOVISTAR%20FIJO%20Y%20MOVIL%20APP"
SITE_KEY   = "6LfZufESAAAAALIPtbkdY_jppqMtih1alVWCEzNR"

async def renovar_sesion_oculta(config: dict) -> dict:
    """
    1. Abre un navegador invisible (Playwright)
    2. Dispara en paralelo a CapSolver para ganar tiempo
    3. Llena usuario/pass
    4. Inyecta la solucion de CapSolver
    5. Hace submit escondido
    6. Roba las cookies nuevas cuando carga el portal
    """
    
    print("\n  [GESTOR] 🔐 INICIANDO RENOVACION AUTOMATICA DE SESION...")
    user = config["efecty_user"]
    pwd  = config["efecty_pass"]
    api_key = config["capsolver_api_key"]
    headless_mode = config.get("headless_login", True)
    
    # Iniciar la tarea de CapSolver (asincronica) apenas entramos para no perder tiempo
    print("  [GESTOR] ⚡ Solicitando solucion al CAPTCHA de fondo...")
    tarea_captcha = asyncio.create_task(
        resolver_captcha(api_key, SITE_KEY, "https://www.efectyvirtual.com/PortalEcommerce/Account/Login")
    )
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=headless_mode,
            args=[
                "--disable-blink-features=AutomationControlled",
                "--no-default-browser-check", "--disable-default-apps"
            ]
        )
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
            viewport={"width": 1100, "height": 800}
        )
        page = await context.new_page()
        
        print("  [GESTOR] 🌐 Navegando a EfectyVirtual...")
        try:
            await page.goto(TARGET_URL, wait_until="domcontentloaded", timeout=30000)
            await asyncio.sleep(2)
        except:
            pass # puede quedarse cargando pero no importa
            
        tiene_form = await page.query_selector("#ControlReferenceBVM_0__Value")
        if tiene_form:
            # Si entramos y magia, no habia caido (poco probable), robamos y salimos
            print("  [GESTOR] ⚠️ La sesion estaba viva. Extrayendo cookies y saliendo...")
            await context.storage_state(path=os.path.join(os.path.dirname(os.path.abspath(__file__)), "sesion_capturada.json"))
            await browser.close()
            return {}
            
        print(f"  [GESTOR] 🤖 Inyectando credenciales ({user})...")
        try:
            await page.wait_for_selector("#DocumentNumber", timeout=15000)
            await page.fill("#DocumentNumber", user)
            await page.fill("#Password", pwd)
        except Exception as e:
            print("  [GESTOR] ❌ Falla critica. No se encontraron los campos de login.")
            await browser.close()
            raise e

        # Esperar que la IA haya resuelto el Captcha
        print("  [GESTOR] ⏳ Esperando token inteligente de CapSolver...")
        token_ia = await tarea_captcha
        
        print("  [GESTOR] 🥷🏽 Token recibido, inyectandolo en la sesion web...")
        # Efecty requiere que el token reCAPTCHA se aloje en #CaptchaInputText y luego procesar doPost()
        await page.evaluate(f"""
            document.getElementById('g-recaptcha-response').innerHTML = '{token_ia}';
            document.getElementById('CaptchaInputText').value = '{token_ia}';
            if (typeof verifyCallback === 'function') {{
                try {{
                    verifyCallback('{token_ia}');
                }} catch (e) {{}}
            }}
            if (typeof doPost === 'function') {{
                doPost();
            }} else {{
                document.forms[0].submit();
            }}
        """)
            
        # Esperar a que pase del Login (el portal puede llevarnos al Dashboard principal)
        print("  [GESTOR] 🔄 Validando acceso (esperando salto de pagina)...")
        try:
            # Esperamos a que la URL ya no sea 'Login'
            await page.wait_for_function("window.location.href.indexOf('Login') === -1", timeout=15000)
            print("  [GESTOR] ✅ Credenciales aceptadas y CAPTCHA superado.")
        except Exception as e:
            await page.screenshot(path="fallo_login_paso1.png")
            await browser.close()
            raise Exception("No se salio de la pagina de Login. Captura: fallo_login_paso1.png")

        # === NAVEGACIÓN HUMANA PARA CALENTAR LA SESIÓN ===
        print("  [GESTOR] 🚀 Autenticacion del portal confirmada. Iniciando flujo humano...")
        
        try:
            # 1. Ir a Metodos de Pago
            print("  [GESTOR] 💳 Accediendo a Metodos de Pago...")
            await page.goto("https://www.efectyvirtual.com/PortalEcommerce/Collect/PaymentMethod", wait_until="networkidle", timeout=30000)
            
            # 2. Seleccionar 'Mi Cuenta' (Aceptar)
            print("  [GESTOR] 🏦 Seleccionando 'Mi Cuenta'...")
            btn_mi_cuenta = page.locator(".metodosdepago.pagocuenta button.botonamarillo")
            await btn_mi_cuenta.click()
            await page.wait_for_load_state("networkidle", timeout=30000)
            
            # 3. Buscar el convenio Movistar (113837)
            print("  [GESTOR] 🔍 Buscando convenio Movistar (113837)...")
            await page.wait_for_selector("#search-box-id", timeout=20000)
            await page.fill("#search-box-id", "113837")
            
            # Esperar a que el autocompletado aparezca y seleccionarlo
            selector_resultado = "li.ui-menu-item:has-text('113837')"
            await page.wait_for_selector(selector_resultado, timeout=20000)
            await page.click(selector_resultado)
            await page.wait_for_load_state("networkidle")

            # === PASO CRÍTICO: Clic en la 'Manito' (Icono Selección) ===
            print("  [GESTOR] 👆 Seleccionando convenio en la tabla (icono manito)...")
            selector_manito = "a[href*='Reference/113837']"
            await page.wait_for_selector(selector_manito, timeout=20000)
            await page.click(selector_manito)
            
            # 4. Esperar a que el formulario final de consulta cargue
            print("  [GESTOR] 📋 Cargando formulario de consulta...")
            await page.wait_for_selector("#ControlReferenceBVM_0__Value", timeout=30000)
            print("  [GESTOR] 🔥 CONTEXTO ASEGURADO. Sesión lista para API.")
            await asyncio.sleep(2)
            
        except Exception as e:
            print(f"  [GESTOR] ❌ FALLA CRÍTICA EN FLUJO HUMANO: {str(e)[:100]}")
            await page.screenshot(path="fallo_calentamiento.png")
            await browser.close()
            # Elevamos el error para que el bot principal sepa que esta sesión NO SIRVE
            raise Exception("No se pudo calentar la sesión (activar el convenio).")
            
        base_dir = os.path.dirname(os.path.abspath(__file__))
        await context.storage_state(path=os.path.join(base_dir, "sesion_capturada.json"))
            
        await browser.close()
        print("  [GESTOR] 🍪 Cookies frescas robadas y blindadas. Sesion asegurada.")
        return {}

if __name__ == "__main__":
    with open("config.json", "r") as f:
        conf = json.load(f)
    print("Test Gestor...")
    cookies = asyncio.run(renovar_sesion_oculta(conf))
    print(f"Cookies logradas: {len(cookies)} cookies en diccionario")
