import { VSoldier } from "./vsoldier.js";

// enMummy: the soldier's patrol, 79.6875% faster, with the same health.
export class Mummy extends VSoldier {
    constructor(sprite, world, x, y) {
        super(sprite, world, x, y);   // the original enMummy is the soldier with other art
    }
}
