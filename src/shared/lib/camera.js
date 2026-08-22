import { SCREEN_HEIGHT, SCREEN_WIDTH } from "../config/constants.js";

export default class Camera {
    constructor({ smooth = 0.1 } = {}) {
        this.x = 0;
        this.y = 0;
        this.smooth = smooth;
        this.bounds = { minX: 0, maxX: Infinity, minY: 0, maxY: Infinity };
    }

    setBounds(minX, maxX, minY, maxY) {
        this.bounds = { minX, maxX, minY, maxY };
    }

    snapTo(targetX, targetY) {
        this.x = targetX - SCREEN_WIDTH / 2;
        this.y = targetY - SCREEN_HEIGHT / 2;
        this.#clamp();
    }

    update(targetX, targetY) {
        const targetCamX = targetX - SCREEN_WIDTH / 2;
        const targetCamY = targetY - SCREEN_HEIGHT / 2;

        this.x += (targetCamX - this.x) * this.smooth;
        this.y += (targetCamY - this.y) * this.smooth;

        this.#clamp();
    }

    #clamp() {
        this.x = Camera.#clampAxis(this.x, this.bounds.minX, this.bounds.maxX, SCREEN_WIDTH);
        this.y = Camera.#clampAxis(this.y, this.bounds.minY, this.bounds.maxY, SCREEN_HEIGHT);
    }

    static #clampAxis(value, min, max, screenSize) {
        const usableMax = max - screenSize;

        if (usableMax <= min) {
            return min - (screenSize - (max - min)) / 2;
        }

        return Math.max(min, Math.min(usableMax, value));
    }

    worldToScreen(worldX, worldY) {
        return { x: worldX - this.x, y: worldY - this.y };
    }

    screenToWorld(screenX, screenY) {
        return { x: screenX + this.x, y: screenY + this.y };
    }
}