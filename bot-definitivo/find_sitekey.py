import urllib.request
import re

url = "https://www.efectyvirtual.com/PortalEcommerce/Account/Login"
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
try:
    with urllib.request.urlopen(req) as response:
        html = response.read().decode('utf-8', errors='ignore')
        match = re.search(r'data-sitekey=[\"\']([^\"\']+)[\"\']', html)
        if match:
            print(f"SITEKEY_ENCONTRADA: {match.group(1)}")
        else:
            match2 = re.search(r"sitekey['\"\s:]+([^'\",\s}]+)", html, re.IGNORECASE)
            print(f"SITEKEY_ALTERNATIVA: {match2.group(1)}" if match2 else "SITEKEY_NO_ENCONTRADA")
except Exception as e:
    print(f"Error: {e}")
