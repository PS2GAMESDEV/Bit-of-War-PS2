import { GAME_SCALE } from "../../shared/lib/constants.js";
import { Vbow } from "./vbow.js";

// enScorpion / enScorpionR: fires animated spikes more often than a vbow.
export class Scorpion extends Vbow {
    static cooldown = 0.8;
    static arrowSheetName = "scorpionSpike";
    static arrowWidth = 16 * GAME_SCALE;
    static arrowHeight = 16 * GAME_SCALE;
}
