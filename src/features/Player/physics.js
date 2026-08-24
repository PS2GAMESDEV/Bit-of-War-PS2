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
            enableContactEvents: true,
            enableSensorEvents: true,
        });

        this.groundContacts = 0;
        this.activeSensors = new Set();

        this._unsubscribeContact = Physics.onContactEvent(
            ({ dataA, dataB, began }) => this.#handleContact(dataA, dataB, began)
        );
        this._unsubscribeSensor = Physics.onSensorEvent(
            ({ sensorData, visitorData, began }) => this.#handleSensor(sensorData, visitorData, began)
        );
    }

    #otherSide(dataA, dataB) {
        if (dataA?.isPlayer) return dataB;
        if (dataB?.isPlayer) return dataA;
        return null;
    }

    #handleContact(dataA, dataB, began) {
        const other = this.#otherSide(dataA, dataB);
        if (!other || other.colliderType !== "ground") return;

        this.groundContacts += began ? 1 : -1;
        if (this.groundContacts < 0) this.groundContacts = 0;
    }

    #handleSensor(sensorData, visitorData, began) {
        if (!visitorData?.isPlayer || !sensorData?.colliderType) return;

        if (began) this.activeSensors.add(sensorData.colliderType);
        else this.activeSensors.delete(sensorData.colliderType);
    }

    isGrounded() {
        return this.groundContacts > 0;
    }

    isTouching(colliderType) {
        return this.activeSensors.has(colliderType);
    }

    resetSensors() {
        this.activeSensors.clear();
        this.groundContacts = 0;
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
        this._unsubscribeContact?.();
        this._unsubscribeSensor?.();

        Physics.destroyBody(this.bodyId);
    }
}