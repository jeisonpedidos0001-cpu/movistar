import asyncio
import json
import httpx

COOKIES_FILE = "sesion_capturada.json"
API_URL = "https://www.efectyvirtual.com/PortalEcommerce/Collect/GetInvoices?ProjectId=113837"
PAYLOAD_TEMPLATE = (
    "references=%5B%7B%22Name%22%3A%22REFERENCIA%22%2C%22ControlType%22%3A%22TEXTBOX%22"
    "%2C%22DisplayText%22%3A%22No+CELULAR+O+CUENTA%3A%22%2C%22Format%22%3A%22NUMERICO%22"
    "%2C%22Enabled%22%3A%22True%22%2C%22Visible%22%3A%22True%22%2C%22Persist%22%3A%22False%22"
    "%2C%22Order%22%3A%226%22%2C%22Printable%22%3A%22True%22%2C%22MinValue%22%3A%220%22"
    "%2C%22MaxValue%22%3A%220%22%2C%22ItemObjectType%22%3A%22ECommerce.WCF.CollectService.CampoClaveTexto%22"
    "%2C%22Value%22%3A%22{numero}%22%2C%22ItemType%22%3A2%2C%22OptionList%22%3A%5B%5D%7D%5D"
    "&ProjectName=113837+-+MOVISTAR+FIJO+Y+MOVIL+APP"
)

HEADERS_BASE = {
    "Accept": "*/*",
    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
    "X-Requested-With": "XMLHttpRequest",
    "User-Agent": "Mozilla/5.0",
}

def cookies_a_header(cookies: dict) -> str:
    orden = [".ASPXAUTH", "ASP.NET_SessionId", "__RequestVerificationToken_L1BvcnRhbEVjb21tZXJjZQ2"]
    if "cookies" in cookies:
        return "; ".join(f"{c['name']}={c['value']}" for c in cookies["cookies"])
    otras = [k for k in cookies if k not in orden]
    return "; ".join(f"{k}={cookies[k]}" for k in orden + otras if k in cookies)

async def probar_numero(numero):
    with open(COOKIES_FILE, "r") as f:
        c = json.load(f)

    client = httpx.AsyncClient(headers=HEADERS_BASE, verify=False)
    client.headers["Cookie"] = cookies_a_header(c)
    
    payload = PAYLOAD_TEMPLATE.format(numero=numero)
    r = await client.post(API_URL, content=payload)
    
    print(f"Status: {r.status_code}")
    print(f"Response: {r.text[:500]}...")
    await client.aclose()

asyncio.run(probar_numero("3161331611"))
