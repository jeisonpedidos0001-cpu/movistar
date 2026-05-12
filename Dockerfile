FROM mcr.microsoft.com/playwright:v1.44.0-jammy

WORKDIR /app

# Instalamos dependencias del sistema: pip, alias de python3 y Xvfb (Virtual Framebuffer)
RUN apt-get update && apt-get install -y \
    python3-pip \
    python-is-python3 \
    xvfb \
    && rm -rf /var/lib/apt/lists/*

# Instalamos paquetes de Python requeridos por el gestor de sesiones
RUN pip install playwright httpx
RUN playwright install chromium

# Copiamos e instalamos dependencias de Node.js
COPY package*.json ./
RUN npm install

# Copiamos el resto del proyecto
COPY . .

# Compilamos la aplicación de React para producción
RUN npm run build

# Puerto expuesto
EXPOSE 4000

# Arrancamos el servidor Node dentro de Xvfb para soportar navegadores con headless=false sin errores de GUI
CMD ["xvfb-run", "--auto-servernum", "--server-args=-screen 0 1280x1024x24", "node", "backend-tokenApim/server.js"]
