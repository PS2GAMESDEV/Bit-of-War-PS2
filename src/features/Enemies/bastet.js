import { GAME_SCALE } from "../../shared/lib/constants.js";

// One boss controller for the rider and the Sphinx. For now both parts stay
// at their map placements in idle, without movement or combat.
export class Bastet {
    constructor() {
        this.state = "idle";
        this.dead = false;
        this.parts = {};
    }

    addPart(name, sheet, x, y) {
        const sprite = new Sprite.Instance(sheet, {
            clip: this.state, scale: GAME_SCALE, x, y
        });
        this.parts[name] = sprite;
        return sprite;
    }

    get hurtbox() { return null; }

    update() {}

    sync() {}
}
