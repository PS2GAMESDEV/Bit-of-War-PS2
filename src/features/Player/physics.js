import { BOX2D_SCALE, GAME_SCALE } from "../../shared/config/constants.js";
import { X_SPEED, JUMP_FORCE } from "./constants.js";
import Physics from "../../shared/lib/physics.js";

export default class PlayerPhysics {
    constructor(options = {}) {
        const { id, body } = Physics.createBody({
            type: Box2D.DYNAMIC_BODY,
            position: {
                x: options.x / BOX2D_SCALE,
                y: options.y / BOX2D_SCALE
            },
            fixedRotation: true,
            userData: { isPlayer: true }
        }, true);

        this.bodyId = id;
        this.body = body;

        this.halfWidthPx = 8 * GAME_SCALE;
        this.halfHeightPx = 8 * GAME_SCALE;

        this.shape = this.body.createBoxShape({
            halfWidth: this.halfWidthPx / BOX2D_SCALE,
            halfHeight: this.halfHeightPx / BOX2D_SCALE,
            friction: 0.0,
            enableSensorEvents: true,
        });

        this.activeSensors = new Set();

        this._unsubscribeSensor = Physics.onSensorEvent(
            ({ sensorData, visitorData, began }) => this.#handleSensor(sensorData, visitorData, began)
        );
    }

    #handleSensor(sensorData, visitorData, began) {
        if (!visitorData?.isPlayer || !sensorData?.colliderType) return;

        if (began) this.activeSensors.add(sensorData.colliderType);
        else this.activeSensors.delete(sensorData.colliderType);
    }

    isGrounded() {
        const pos = this.body.getPosition();
        const halfW = this.halfWidthPx / BOX2D_SCALE;
        const halfH = this.halfHeightPx / BOX2D_SCALE;

        const inset = 4 / BOX2D_SCALE;
        const lowerX = pos.x - halfW + inset;
        const upperX = pos.x + halfW - inset;
        const lowerY = pos.y + halfH - (2 / BOX2D_SCALE);
        const upperY = pos.y + halfH + (4 / BOX2D_SCALE);

        const shapes = Physics.world.queryAABB(lowerX, lowerY, upperX, upperY);
        if (shapes && shapes.length > 0) {
            for (let i = 0; i < shapes.length; i++) {
                const shape = shapes[i];
                if (!shape || !shape.isValid()) continue;
                const body = shape.getBody();
                if (!body || !body.isValid()) continue;
                const data = body.getUserData();
                if (data?.colliderType === "ground") {
                    return true;
                }
            }
        }

        const rayLen = 5 / BOX2D_SCALE;
        const startY = pos.y + halfH - (2 / BOX2D_SCALE);
        const leftX = pos.x - halfW + inset;
        const rightX = pos.x + halfW - inset;

        const hitLeft = Physics.world.castRay(leftX, startY, 0, rayLen);
        if (hitLeft?.shape?.isValid()) {
            const body = hitLeft.shape.getBody();
            if (body?.isValid() && body.getUserData()?.colliderType === "ground") {
                return true;
            }
        }

        const hitRight = Physics.world.castRay(rightX, startY, 0, rayLen);
        if (hitRight?.shape?.isValid()) {
            const body = hitRight.shape.getBody();
            if (body?.isValid() && body.getUserData()?.colliderType === "ground") {
                return true;
            }
        }

        return false;
    }

    isTouching(colliderType) {
        return this.activeSensors.has(colliderType);
    }

    resetSensors() {
        this.activeSensors.clear();
    }

    setPosition(x, y) {
        this.body.setTransform(x / BOX2D_SCALE, y / BOX2D_SCALE, 0);
        this.body.setLinearVelocity(0, 0);
    }

    moveHorizontally(dirX) {
        const currentVel = this.body.getLinearVelocity();
        this.body.setLinearVelocity(dirX * X_SPEED, currentVel.y);
    }

    jump() {
        const currentVel = this.body.getLinearVelocity();
        this.body.setLinearVelocity(currentVel.x, -JUMP_FORCE);
    }

    getVerticalVelocity() {
        return this.body.getLinearVelocity().y;
    }

    getPosition() {
        return this.body.getPosition();
    }

    getCenterPositionPx() {
        const center = this.body.getPosition();
        return { x: center.x * BOX2D_SCALE, y: center.y * BOX2D_SCALE };
    }

    getRenderPosition() {
        const center = this.body.getPosition();
        return {
            x: center.x * BOX2D_SCALE - this.halfWidthPx,
            y: center.y * BOX2D_SCALE - this.halfHeightPx,
        };
    }

    destroy() {
        this._unsubscribeSensor?.();

        Physics.destroyBody(this.bodyId);
    }
}