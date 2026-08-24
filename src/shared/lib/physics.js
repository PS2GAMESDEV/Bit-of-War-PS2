import { BOX2D_SCALE, GAME_GRAVITY, GAME_SCALE } from "../config/constants.js";

const SENSOR_COLLIDER_TYPES = new Set(["chest", "ladder", "door"]);

class Physics {
    static #instance;

    constructor() {
        if (Physics.#instance) return Physics.#instance;
        Physics.#instance = this;

        this.world = Box2D.createWorld({ gravity: { x: 0, y: GAME_GRAVITY } });

        this.bodies = new Map();
        this.nextId = 1;

        this.sensorListeners = new Set();
        this.contactListeners = new Set();

        this.debugMode = false;
        this.debugColors = {
            dynamic: Color.new(0, 255, 0, 100),
            static: Color.new(255, 0, 0, 100),
            sensor: Color.new(255, 255, 0, 80)
        };
    }

    step(deltaTime) {
        this.world.step(deltaTime);

        this.#dispatchContactEvents();
        this.#dispatchSensorEvents();
    }

    createBody(config, persistent = false) {
        const { userData, ...bodyConfig } = config;
        const body = this.world.createBody(bodyConfig);
        const id = this.nextId++;

        this.bodies.set(id, { body, persistent });
        body.setUserData({ ...(userData || {}), physicsId: id });

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

    onContactEvent(callback) {
        this.contactListeners.add(callback);
        return () => this.contactListeners.delete(callback);
    }

    onSensorEvent(callback) {
        this.sensorListeners.add(callback);
        return () => this.sensorListeners.delete(callback);
    }

    #dispatchContactEvents() {
        if (this.contactListeners.size === 0) return;

        const { begin, end } = this.world.getContactEvents();

        for (const { shapeA, shapeB } of begin) this.#notifyContact(shapeA, shapeB, true);
        for (const { shapeA, shapeB } of end) this.#notifyContact(shapeA, shapeB, false);
    }

    #notifyContact(shapeA, shapeB, began) {
        if (!shapeA.isValid() || !shapeB.isValid()) return;

        const dataA = shapeA.getBody().getUserData();
        const dataB = shapeB.getBody().getUserData();

        for (const listener of this.contactListeners) {
            listener({ dataA, dataB, began, shapeA, shapeB });
        }
    }

    #dispatchSensorEvents() {
        if (this.sensorListeners.size === 0) return;

        const { begin, end } = this.world.getSensorEvents();

        for (const { sensor, visitor } of begin) this.#notifySensor(sensor, visitor, true);
        for (const { sensor, visitor } of end) this.#notifySensor(sensor, visitor, false);
    }

    #notifySensor(sensorShape, visitorShape, began) {
        if (!sensorShape.isValid() || !visitorShape.isValid()) return;

        const sensorData = sensorShape.getBody().getUserData();
        const visitorData = visitorShape.getBody().getUserData();

        for (const listener of this.sensorListeners) {
            listener({ sensorData, visitorData, began, sensorShape, visitorShape });
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

        const x = aabb.lowerX * BOX2D_SCALE - cameraX;
        const y = aabb.lowerY * BOX2D_SCALE - cameraY;
        const w = (aabb.upperX - aabb.lowerX) * BOX2D_SCALE;
        const h = (aabb.upperY - aabb.lowerY) * BOX2D_SCALE;

        Draw.rect(x, y, w, h, color);
    }

    loadLevelColliders(level) {
        this.clearLevel();

        for (const collider of level.colliders) {
            const isSensor = SENSOR_COLLIDER_TYPES.has(collider.type);

            const halfWidth = (collider.width * GAME_SCALE / 2) / BOX2D_SCALE;
            const halfHeight = (collider.height * GAME_SCALE / 2) / BOX2D_SCALE;

            const cx = (collider.x * GAME_SCALE / BOX2D_SCALE) + halfWidth;
            const cy = (collider.y * GAME_SCALE / BOX2D_SCALE) + halfHeight;

            const { body } = this.createBody({
                type: Box2D.STATIC_BODY,
                position: { x: cx, y: cy },
                userData: { colliderType: collider.type },
            });

            body.createBoxShape({
                halfWidth,
                halfHeight,
                isSensor,
                enableContactEvents: !isSensor,
                enableSensorEvents: isSensor,
                radius: 0.1,
            });
        }
    }
}

export default new Physics();