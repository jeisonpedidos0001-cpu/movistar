import asyncio
import httpx
import json

async def test():
    with open('sesion_capturada.json', 'r') as f:
        c = json.load(f)
    
    headers = {
        'Accept': '*/*',
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-Requested-With': 'XMLHttpRequest',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    }
    if 'cookies' in c:
        cookie_list = [f"{ck['name']}={ck['value']}" for ck in c['cookies']]
    else:
        cookie_list = [f"{k}={v}" for k,v in c.items()]
    headers['Cookie'] = '; '.join(cookie_list)
    
    url = 'https://www.efectyvirtual.com/PortalEcommerce/Collect/GetInvoices?ProjectId=113837'
    numero = '3161909281'
    payload = f"references=%5B%7B%22Name%22%3A%22REFERENCIA%22%2C%22ControlType%22%3A%22TEXTBOX%22%2C%22DisplayText%22%3A%22No%2BCELULAR%2BO%2BCUENTA%3A%22%2C%22Format%22%3A%22NUMERICO%22%2C%22Enabled%22%3A%22True%22%2C%22Visible%22%3A%22True%22%2C%22Persist%22%3A%22False%22%2C%22Order%22%3A%226%22%2C%22Printable%22%3A%22True%22%2C%22MinValue%22%3A%220%22%2C%22MaxValue%22%3A%220%22%2C%22ItemObjectType%22%3A%22ECommerce.WCF.CollectService.CampoClaveTexto%22%2C%22Value%22%3A%22{numero}%22%2C%22ItemType%22%3A2%2C%22OptionList%22%3A%5B%5D%7D%5D&ProjectName=113837%2B-%2BMOVISTAR%2BFIJO%2BY%2BMOVIL%2BAPP"
    
    async with httpx.AsyncClient(verify=False) as client:
        r = await client.post(url, headers=headers, content=payload)
        print('Status:', r.status_code)
        try:
            print('JSON:', json.dumps(r.json(), indent=2))
        except:
            print('TEXT:', r.text[:500])

asyncio.run(test())
