class SmartCache {
    constructor(ttlSeconds = 300) {
        this.cache = new Map();
        this.ttl = ttlSeconds * 1000; // Tiempo de vida en milisegundos (ej: 300s = 5 minutos)
    }

    set(numero, data) {
        this.cache.set(numero, {
            data: data,
            timestamp: Date.now()
        });
        console.log(`📦 [Caché] Número ${numero} guardado exitosamente.`);
    }

    get(numero) {
        const record = this.cache.get(numero);
        if (!record) return null;

        // Comprobar si caducó
        if (Date.now() - record.timestamp > this.ttl) {
            console.log(`🗑️ [Caché] Número ${numero} expirado. Limpiando...`);
            this.cache.delete(numero);
            return null;
        }

        console.log(`⚡ [Caché] ¡Acierto! Devolviendo datos de ${numero} instantáneamente.`);
        return record.data;
    }
}

module.exports = new SmartCache(300); // 5 minutos por defecto
