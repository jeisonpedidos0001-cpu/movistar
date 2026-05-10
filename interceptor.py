from playwright.sync_api import sync_playwright
import json
import time

def run():
    with sync_playwright() as p:
        print("🚀 Iniciando navegador con camuflaje...")
        
        # Lanzamos de forma limpia para evitar el error de argumentos
        browser = p.chromium.launch(
            headless=False,
            ignore_default_args=["--enable-automation"]
        )
        
        # Creamos un contexto con un User-Agent de un navegador real
        context = browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
        )
        
        page = context.new_page()
        
        # Script para ocultar que es un bot
        page.add_init_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
        
        print("🌍 Abriendo el portal de Movistar...")
        page.goto("https://payment.telefonicawebsites.co/")
        
        print("\n=======================================================")
        print("🤖 NAVEGADOR CAMUFLADO Y ESCUCHANDO")
        print("=======================================================")
        print("Instrucciones:")
        print("1. Ingresa el número en el navegador.")
        print("2. Haz la consulta.")
        print("⏳ Esperando el tokenAPim...\n")

        def interceptar_peticion(request):
            if "data-payment" in request.url and request.method == "POST":
                print("\n✅ ¡DATOS CAPTURADOS!")
                try:
                    post_data = request.post_data
                    if post_data:
                        datos = json.loads(post_data)
                        with open("captura_movistar.json", "w", encoding="utf-8") as f:
                            json.dump(datos, f, indent=4)
                        print("\n💾 Payload guardado en 'captura_movistar.json'")
                        print("Ya puedes cerrar el navegador o presionar ENTER en la consola.")
                except Exception as e:
                    print(f"Error: {e}")

        page.on("request", interceptar_peticion)

        input("Presiona [ENTER] para terminar...\n")
        browser.close()

if __name__ == "__main__":
    run()
