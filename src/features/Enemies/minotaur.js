import { GAME_SCALE, MINOTAUR_RUN_SPEED, MINOTAUR_WALK_SPEED } from "../../shared/lib/constants.js";
import { Walker } from "./walker.js";

const FACES_RIGHT = true;

const SIGHT = 4 * 16 * GAME_SCALE;

export class Minotaur extends Walker {
    static health = 5;
    static dieSfx = "minotaurDie";

    constructor(sprite, world, x, y) {
        super(sprite, world, x, y, {
            facesRight: FACES_RIGHT,
            walkSpeed: MINOTAUR_WALK_SPEED,
            runSpeed: MINOTAUR_RUN_SPEED,
            sight: SIGHT
        });
    }
}
