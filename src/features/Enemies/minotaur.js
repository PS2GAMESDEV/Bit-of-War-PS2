import { GAME_SCALE, MINOTAUR_RUN_SPEED, MINOTAUR_WALK_SPEED } from "../../shared/lib/constants.js";
import { Walker } from "./walker.js";

// Which way the enMinotaur art looks in the sheet (it is flipped to walk the other way).
const FACES_RIGHT = true;

// Sees the player up to 4 blocks ahead.
const SIGHT = 4 * 16 * GAME_SCALE;

// enMinotaur: patrols like the enUndead and runs at the player it sees.
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
