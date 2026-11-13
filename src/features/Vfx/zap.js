import { GAME_SCALE, stepsToSeconds } from "../../shared/lib/constants.js";

const LIFETIME = stepsToSeconds(10);   // object `zapped`: removed after 10 steps

/**
 * The electric shock drawn on an ordinary enemy struck by the Lightning
 * power (object `zapped`, created at the enemy's origin; it plays
 * soundZappyPoo when created).
 */
export class Zap {
    constructor(sheet, sfx) {
        this.sheet = sheet;
        this.sfx = sfx;
        this.zaps = [];
    }

    spawn(x, y) {
        const sprite = new Sprite.Instance(this.sheet, { clip: "zap", scale: GAME_SCALE, x, y });
        this.zaps.push({ sprite, time: LIFETIME });
        this.sfx?.zappyPoo?.play();
    }

    update(dt) {
        for (let i = this.zaps.length - 1; i >= 0; i--) {
            if ((this.zaps[i].time -= dt) <= 0) this.zaps.splice(i, 1);
        }
    }

    draw() {
        for (const zap of this.zaps) zap.sprite.draw();
    }
}
