import { GAME_SCALE } from "../../shared/lib/constants.js";

export class Rubble {
    constructor(sheets) {
        this.sheets = sheets;
        this.piles = [];
    }

    spawn(x, y, flying) {
        const sheet = flying ? this.sheets.rubbleExplode : this.sheets.rubbled;
        this.piles.push(new Sprite.Instance(sheet, { clip: "fall", scale: GAME_SCALE, x, y }));
    }

    draw() {
        if (this.piles.length === 1) this.piles[0].draw();
        else if (this.piles.length > 1) Sprite.drawAll(this.piles);
    }
}
