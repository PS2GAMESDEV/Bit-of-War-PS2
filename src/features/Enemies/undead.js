import { UNDEAD_SPEED } from "../../shared/lib/constants.js";
import { Walker } from "./walker.js";

const FACES_RIGHT = true;

export class Undead extends Walker {
    static health = 2;

    constructor(sprite, world, x, y) {
        super(sprite, world, x, y, { facesRight: FACES_RIGHT, walkSpeed: UNDEAD_SPEED });
    }
}
