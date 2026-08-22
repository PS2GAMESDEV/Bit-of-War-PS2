import { ASSETS_PATH, GAME_SCALE } from "../../shared/config/constants.js";
import Assets from "../../shared/lib/assets.js";

export default class PlayerHUD {
    constructor() {
        this.hud = Assets.image(ASSETS_PATH.UI + "/hud.png");
        this.hud.width *= GAME_SCALE;
        this.hud.height *= GAME_SCALE;

        this.powerupSpace = Assets.image(ASSETS_PATH.UI + "/powerup.png")
        this.powerupSpace.width *= GAME_SCALE;
        this.powerupSpace.height *= GAME_SCALE;

        this.hud.x = 16 * GAME_SCALE;
        this.powerupSpace.x = this.hud.x + 14 * GAME_SCALE;
        this.powerupSpace.y = this.hud.height / 2 + this.powerupSpace.height / 4
    }

    draw() {
        this.hud.draw(this.hud.x, 0);
        this.powerupSpace.draw(this.powerupSpace.x, this.powerupSpace.y);
    }
}