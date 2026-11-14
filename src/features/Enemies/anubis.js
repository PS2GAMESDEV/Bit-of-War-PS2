import { Spearman } from "./spearman.js";

export class Anubis extends Spearman {
    constructor(sprite, world, x, y) {
        super(sprite, world, x, y);
        this.runSpeed *= 1.2;
    }
}
