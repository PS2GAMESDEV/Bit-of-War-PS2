import { UNDEAD_SPEED } from "../../shared/lib/constants.js";
import { Walker } from "./walker.js";

// Which way the enUndead art looks in the sheet (it is flipped to walk the other way).
const FACES_RIGHT = true;

// enUndead: patrols, never chases.
export class Undead extends Walker {
    static health = 3;

    constructor(sprite, world, x, y) {
        super(sprite, world, x, y, { facesRight: FACES_RIGHT, walkSpeed: UNDEAD_SPEED });
    }
}
