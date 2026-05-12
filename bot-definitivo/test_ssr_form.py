import asyncio
import httpx
import json

async def test():
    with open('sesion_capturada.json', 'r') as f:
        c = json.load(f)
    print('ASPXAUTH:', c.get('.ASPXAUTH', '')[:20])
    
    url = 'https://www.efectyvirtual.com/PortalEcommerce/Collect/Reference/113837?term=113837%20-%20MOVISTAR%20FIJO%20Y%20MOVIL%20APP'
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'es-CO,es;q=0.9,en-US;q=0.8,en;q=0.7',
        'Referer': 'https://www.efectyvirtual.com/PortalEcommerce/Home',
        'Sec-Ch-Ua': '"Chromium";v="143", "Not A(Brand";v="24"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"'
    }
    async with httpx.AsyncClient(headers=headers, verify=False) as client:
        orden = ['.ASPXAUTH', 'ASP.NET_SessionId', '__RequestVerificationToken_L1BvcnRhbEVjb21tZXJjZQ2']
        otras = [k for k in c if k not in orden]
        client.headers['Cookie'] = '; '.join(f'{k}={c[k]}' for k in orden + otras if k in c)
        r = await client.get(url, timeout=30.0)
        print('Status GET:', r.status_code)
        
        if r.status_code == 200:
            import bs4
            soup = bs4.BeautifulSoup(r.text, 'html.parser')
            token = soup.find('input', {'name': '__RequestVerificationToken'})
            token_val = token.get('value') if token else None
            print('Token:', token_val[:10] if token_val else 'None')
            
            if token_val:
                data = {
                    '__RequestVerificationToken': token_val,
                    'ControlReferenceBVM[0].Value': '3161793018',
                    'ProjectId': '113837',
                    'Term': '113837 - MOVISTAR FIJO Y MOVIL APP'
                }
                r2 = await client.post(url, data=data, timeout=30.0)
                soup2 = bs4.BeautifulSoup(r2.text, 'html.parser')
        
                name = soup2.find('input', {'id': 'Collects_0__ControlList_1__Value'})
                val = soup2.find('input', {'id': 'CollectSelectedValue'})
                print('Status POST:', r2.status_code)
                print('Name:', name.get('value') if name else 'None')
                print('Value:', val.get('value') if val else 'None')
        else:
            print('Failed to load page. Text:', r.text[:200])

asyncio.run(test())
