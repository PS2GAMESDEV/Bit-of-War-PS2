import { Harpie } from "./harpie.js";

// enDragon: flies after the player like a harpie, 20% faster.
export class Dragon extends Harpie {
    static speed = Harpie.speed * 1.2;
}
