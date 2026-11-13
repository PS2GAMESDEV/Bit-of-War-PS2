import { GAME_SCALE } from "../../shared/lib/constants.js";

/**
 * What a stone enemy leaves when it is struck (objects `rubbled` and
 * `rubbleexplode`, created at its origin). Ground enemies fall into a pile of
 * three frames, flyers burst in four; each plays once at 20 Hz and stays on
 * its last frame for the rest of the room.
 */
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
        for (const pile of this.piles) pile.draw();
    }
}
