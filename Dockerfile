FROM mcr.microsoft.com/playwright:v1.44.0-jammy

WORKDIR /app

# Instalamos dependencias del sistema necesarias
RUN apt-get update && apt-get install -y \
    python3-pip \
    python-is-python3 \
    xvfb \
    && rm -rf /var/lib/apt/lists/*

# Instalamos paquetes de Python
RUN pip install playwright httpx
RUN playwright install chromium

# Copiamos package.json e instalamos dependencias de Node.js
COPY package*.json ./
RUN npm install

# Copiamos el resto del código
COPY . .

# Compilamos el frontend
RUN npm run build

# Informar versiones para debug
RUN node -v && python --version

# Puerto que Railway requiere
ENV PORT=4000
EXPOSE 4000

# Arrancamos el servidor directamente para ver logs de Node.js
# Si esto funciona, el servidor debería mostrar "Iniciando proceso..." al arrancar.
CMD ["node", "backend-tokenApim/server.js"]
