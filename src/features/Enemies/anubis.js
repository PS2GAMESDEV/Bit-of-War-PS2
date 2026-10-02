import { Spearman } from "./spearman.js";

// enAnubis / enAnubisWarrior: the spearman's patrol, with a 25% faster charge.
export class Anubis extends Spearman {
    constructor(sprite, world, x, y) {
        super(sprite, world, x, y);
        this.runSpeed *= 1.25;
    }
}
