import httpx
import asyncio
import sys

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")


async def resolver_captcha(api_key: str, site_key: str, website_url: str) -> str:
    """
    Se comunica con la API de CapSolver para resolver un reCAPTCHA v2.
    Devuelve el token (g-recaptcha-response) cuando este listo.
    """
    print("  [CapSolver] 🤖 Solicitando resolucion de CAPTCHA a la IA...")
    
    url_create = "https://api.capsolver.com/createTask"
    url_result = "https://api.capsolver.com/getTaskResult"
    
    payload_create = {
        "clientKey": api_key,
        "task": {
            "type": "ReCaptchaV2TaskProxyless",
            "websiteURL": website_url,
            "websiteKey": site_key
        }
    }

    async with httpx.AsyncClient() as client:
        # Paso 1: Crear la tarea
        resp_create = await client.post(url_create, json=payload_create, timeout=10.0)
        data_create = resp_create.json()
        
        if data_create.get("errorId", 0) != 0:
            raise Exception(f"Error creando tarea en CapSolver: {data_create.get('errorDescription')}")
            
        task_id = data_create.get("taskId")
        print(f"  [CapSolver] ⏳ Tarea creada (ID: {task_id}). Esperando solucion...")
        
        # Paso 2: Sondear hasta que este listo (normalmente toma ~10-20 segs)
        payload_result = {
            "clientKey": api_key,
            "taskId": task_id
        }
        
        for i in range(20):  # Esperar hasta 60 segundos
            await asyncio.sleep(3)
            # Re-probar resultado
            resp_result = await client.post(url_result, json=payload_result, timeout=10.0)
            data_result = resp_result.json()
            
            status = data_result.get("status")
            if status == "ready":
                token = data_result.get("solution", {}).get("gRecaptchaResponse")
                print("  [CapSolver] ✅ CAPTCHA RESUELTO EXITOSAMENTE!")
                return token
            elif status == "processing":
                # Sigue procesando
                continue
            else:
                raise Exception(f"Error resolviendo CAPTCHA: {data_result}")
                
        raise Exception("Timeout esperando solucion del CAPTCHA")

# Codigo de prueba unitaria rápido
if __name__ == "__main__":
    import json
    with open("config.json") as f:
        config = json.load(f)
    api_key  = config["capsolver_api_key"]
    site_key = "6LfZufESAAAAALIPtbkdY_jppqMtih1alVWCEzNR"
    url      = "https://www.efectyvirtual.com/PortalEcommerce/Account/Login"
    
    token = asyncio.run(resolver_captcha(api_key, site_key, url))
    print(f"Token obtenido (primeros 50 chars): {token[:50]}...")
