import { GAME_SCALE } from "../../shared/lib/constants.js";
import { drawSpriteItems } from "../../shared/lib/spriteBatch.js";

const LIFETIME = 0.12;

const FACES_RIGHT = false;

export class Blood {
    constructor(sheet) {
        this.sheet = sheet;
        this.splashes = [];
        this._drawSprites = [];
    }

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
        drawSpriteItems(this.splashes, this._drawSprites);
    }
}
