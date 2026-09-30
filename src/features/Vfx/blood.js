import { GAME_SCALE } from "../../shared/lib/constants.js";

const LIFETIME = 0.12;   // seconds a splash stays on screen

// Which way the blood art looks in the sheet (flipped when the hit comes from the other side).
const FACES_RIGHT = false;

/**
 * The splash an enemy bleeds when the blade hits it. It is drawn centered on
 * the hit, pointing away from the attacker, and vanishes after LIFETIME.
 */
export class Blood {
    constructor(sheet) {
        this.sheet = sheet;
        this.splashes = [];
    }

    // (x, y): center of the enemy hit. `fromRight`: the attack came from its right.
    spawn(x, y, fromRight) {
        const sprite = new Sprite.Instance(this.sheet, {
            clip: "splash", scale: GAME_SCALE, origin: [0.5, 0.5], x, y,
            flipX: fromRight === FACES_RIGHT
        });
        this.splashes.push({ sprite, time: LIFETIME });
    }

    update(dt) {
        const splashes = this.splashes;

        for (let i = splashes.length - 1; i >= 0; i--) {
            if ((splashes[i].time -= dt) <= 0) splashes.splice(i, 1);
        }
    }

    draw() {
        for (const splash of this.splashes) splash.sprite.draw();
    }
}
