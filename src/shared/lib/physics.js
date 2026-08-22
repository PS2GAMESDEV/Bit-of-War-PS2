import { PLAYER_MOVEMENT } from "../config/constants.js";

class Physics {
    static #instance;

    constructor() {
        if (Physics.#instance) return Physics.#instance;
        Physics.#instance = this;

        this.world = Box2D.createWorld({ gravity: { x: 0, y: 0 } });

        this.bodies = new Map();
        this.nextId = 1;

        this.debugMode = false;
        this.debugColors = {
            dynamic: Color.new(0, 255, 0, 100),
            static: Color.new(255, 0, 0, 100),
            sensor: Color.new(255, 255, 0, 80)
        };
    }

    step(deltaTime) {
        this.world.step(deltaTime);
    }

    createBody(config, persistent = false) {
        const body = this.world.createBody(config);
        const id = this.nextId++;

        this.bodies.set(id, { body, persistent });
        body.setUserData({ ...(config.userData || {}), physicsId: id });

        return { id, body };
    }

    destroyBody(id) {
        const entry = this.bodies.get(id);
        if (!entry) return false;

        entry.body.destroy();
        this.bodies.delete(id);
        return true;
    }

    clearLevel() {
        for (const [id, entry] of [...this.bodies]) {
            if (entry.persistent) continue;
            entry.body.destroy();
            this.bodies.delete(id);
        }
    }

    toggleDebug() {
        this.debugMode = !this.debugMode;
        return this.debugMode;
    }

    setDebugMode(flag) {
        this.debugMode = flag;
    }

    renderDebug(cameraX = 0, cameraY = 0) {
        if (!this.debugMode) return;

        for (const { body } of this.bodies.values()) {
            const isStatic = body.getType() === Box2D.STATIC_BODY;

            for (const shape of body.getShapes()) {
                const color = shape.isSensor()
                    ? this.debugColors.sensor
                    : (isStatic ? this.debugColors.static : this.debugColors.dynamic);

                this.#drawShape(shape, color, cameraX, cameraY);
            }
        }
    }

    #drawShape(shape, color, cameraX, cameraY) {
        const aabb = shape.getAABB();
        const x = aabb.lowerX - cameraX;
        const y = aabb.lowerY - cameraY;
        const w = aabb.upperX - aabb.lowerX;
        const h = aabb.upperY - aabb.lowerY;

        Draw.rect(x, y, w, h, color);
    }
}

export default new Physics();