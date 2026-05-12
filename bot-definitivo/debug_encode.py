import asyncio
import httpx

API_URL = "https://www.efectyvirtual.com/PortalEcommerce/Collect/GetInvoices?ProjectId=113837"
HEADERS_BASE = {
    "Accept": "*/*",
    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
    "X-Requested-With": "XMLHttpRequest",
    "User-Agent": "Mozilla/5.0",}

async def probar_httpx():
    # Number that is actually GOOD (e.g. 3161347202 with debt 42734)
    payload = "references=%5B%7B%22Name%22%3A%22REFERENCIA%22%2C%22ControlType%22%3A%22TEXTBOX%22%2C%22DisplayText%22%3A%22No%2BCELULAR%2BO%2BCUENTA%3A%22%2C%22Format%22%3A%22NUMERICO%22%2C%22Enabled%22%3A%22True%22%2C%22Visible%22%3A%22True%22%2C%22Persist%22%3A%22False%22%2C%22Order%22%3A%226%22%2C%22Printable%22%3A%22True%22%2C%22MinValue%22%3A%220%22%2C%22MaxValue%22%3A%220%22%2C%22ItemObjectType%22%3A%22ECommerce.WCF.CollectService.CampoClaveTexto%22%2C%22Value%22%3A%223161347202%22%2C%22ItemType%22%3A2%2C%22OptionList%22%3A%5B%5D%7D%5D&ProjectName=113837+-+MOVISTAR+FIJO+Y+MOVIL+APP"

    import json
    with open("sesion_capturada.json", "r") as f: c = json.load(f)
    
    def cookies_a_header(cookies):
        orden = [".ASPXAUTH", "ASP.NET_SessionId", "__RequestVerificationToken_L1BvcnRhbEVjb21tZXJjZQ2"]
        if "cookies" in cookies:
            return "; ".join(f"{cc['name']}={cc['value']}" for cc in cookies["cookies"])
        otras = [k for k in cookies if k not in orden]
        return "; ".join(f"{k}={cookies[k]}" for k in orden + otras if k in cookies)
        
    client = httpx.AsyncClient(verify=False)
    # STR TEST
    r_str = await client.post(API_URL, content=payload, headers=HEADERS_BASE | {"Cookie": cookies_a_header(c)})
    print("STR payload length:", len(payload))
    print("STR result:", r_str.text[:100])
    
    # BYTES TEST
    r_bytes = await client.post(API_URL, content=payload.encode("utf-8"), headers=HEADERS_BASE | {"Cookie": cookies_a_header(c)})
    print("BYTES result:", r_bytes.text[:100])

asyncio.run(probar_httpx())
