import { PLAYER_ONE } from "../../shared/config/constants.js";
import { PLAYER_CONTROLS } from "../../shared/config/settings.js";

export default class PlayerController {
    constructor(player) {
        this.player = player;
        this.wasBlocking = false;
    }

    update() {
        let moveDir = 0;
        if (PLAYER_ONE.pressed(Pads.LEFT)) moveDir = -1;
        if (PLAYER_ONE.pressed(Pads.RIGHT)) moveDir = 1;
        this.player.move(moveDir);

        if (PLAYER_ONE.justPressed(PLAYER_CONTROLS.ATK)) {
            this.player.attack();
        }

        const isBlockingNow = PLAYER_ONE.pressed(PLAYER_CONTROLS.BLOCK);
        if (isBlockingNow && !this.wasBlocking) {
            this.player.block();
        } else if (!isBlockingNow && this.wasBlocking) {
            this.player.stopBlock();
        }
        this.wasBlocking = isBlockingNow;

        if (PLAYER_ONE.justPressed(PLAYER_CONTROLS.JUMP)) {
            this.player.jump();
        }
    }
}