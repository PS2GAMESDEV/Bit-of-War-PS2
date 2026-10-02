import { Skelbow } from "./skelbow.js";

// enVbow / enVbowR: the same archer, with faster arrows and shorter pauses.
export class Vbow extends Skelbow {
    static cooldown = 1.2;
    static arrowSpeed = Skelbow.arrowSpeed * 1.25;
}
