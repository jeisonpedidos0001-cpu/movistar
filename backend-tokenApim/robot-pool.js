const Robot = require('./robot');

const TAMANO_POOL = parseInt(process.env.ROBOT_COUNT || '3');

class RobotPool {
    constructor() {
        this.robots = [];
        this.cola = []; // { numero, resolve, reject }
    }

    async iniciar() {
        console.log(`🏭 [Pool] Iniciando ${TAMANO_POOL} robots en paralelo...`);
        // Arrancar todos los robots en paralelo
        const promesas = [];
        for (let i = 1; i <= TAMANO_POOL; i++) {
            const robot = new Robot(i);
            this.robots.push(robot);
            promesas.push(robot.iniciar());
        }
        await Promise.all(promesas);
        console.log(`🏭 [Pool] ¡${TAMANO_POOL} robots listos!`);
    }

    // Busca el primer robot libre
    _robotLibre() {
        return this.robots.find(r => !r.busy);
    }

    // Encola una consulta y devuelve una Promesa
    consultar(numero) {
        return new Promise((resolve, reject) => {
            this.cola.push({ numero, resolve, reject });
            console.log(`📥 [Pool] Número ${numero} en fila. Cola: ${this.cola.length} pendientes.`);
            this._procesar();
        });
    }

    // Intenta asignar consultas de la cola a robots libres
    _procesar() {
        while (this.cola.length > 0) {
            const robot = this._robotLibre();
            if (!robot) break; // Todos ocupados, esperar

            const { numero, resolve, reject } = this.cola.shift();
            robot.consultar(numero)
                .then(resolve)
                .catch(async (err) => {
                    console.error(`❌ [Pool] Robot-${robot.id} falló para ${numero}: ${err.message}`);
                    // Reiniciar el robot que falló para que el siguiente lo pueda usar
                    robot.reiniciar().catch(e => console.error(`Error reiniciando Robot-${robot.id}:`, e.message));
                    reject(err);
                })
                .finally(() => {
                    // Procesar el siguiente en la cola cuando este robot termine
                    setTimeout(() => this._procesar(), 100);
                });
        }
    }

    // Info del estado actual del pool
    estado() {
        const libres = this.robots.filter(r => !r.busy).length;
        return {
            robots: TAMANO_POOL,
            libres,
            ocupados: TAMANO_POOL - libres,
            cola: this.cola.length
        };
    }
}

module.exports = new RobotPool();
