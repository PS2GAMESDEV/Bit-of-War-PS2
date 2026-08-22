import { GAME_SCALE } from "../../shared/config/constants.js";

export default class PlayerHUD {
    constructor(assets) {
        this.hud = assets.images["images/ui/hud.png"];
        this.powerupSpace = assets.images["images/ui/powerup.png"];

        if (!this.hud || !this.powerupSpace) {
            throw new Error('[PlayerHUD] assets de HUD não encontrados nos assets carregados');
        }

        this.hud.width *= GAME_SCALE;
        this.hud.height *= GAME_SCALE;

        this.powerupSpace.width *= GAME_SCALE;
        this.powerupSpace.height *= GAME_SCALE;

        this.hud.x = 8 * GAME_SCALE;
        this.powerupSpace.x = this.hud.x + 14 * GAME_SCALE;
        this.powerupSpace.y = this.hud.height / 2 + this.powerupSpace.height / 4;
    }

    draw() {
        this.hud.draw(this.hud.x, 0);
        this.powerupSpace.draw(this.powerupSpace.x, this.powerupSpace.y);
    }
}