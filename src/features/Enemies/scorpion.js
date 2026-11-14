import { GAME_SCALE, pxPerStep } from "../../shared/lib/constants.js";
import { Vbow } from "./vbow.js";

export class Scorpion extends Vbow {
    static arrowSpeed = pxPerStep(8);
    static arrowLift = 5 * GAME_SCALE;
    static arrowSheetName = "scorpionSpike";
    static arrowWidth = 16 * GAME_SCALE;
    static arrowHeight = 16 * GAME_SCALE;
}
