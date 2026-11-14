import { GAME_SCALE, stepsToSeconds } from "../../shared/lib/constants.js";
import { drawSpriteItems } from "../../shared/lib/spriteBatch.js";

const LIFETIME = stepsToSeconds(10);

export class Zap {
    constructor(sheet, sfx) {
        this.sheet = sheet;
        this.sfx = sfx;
        this.zaps = [];
        this._drawSprites = [];
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
        drawSpriteItems(this.zaps, this._drawSprites);
    }
}
