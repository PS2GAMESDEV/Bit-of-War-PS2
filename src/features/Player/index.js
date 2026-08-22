import PlayerPhysics from "./physics.js";
import PlayerRenderer from "./renderer.js";
import PlayerController from "./controller.js";
import { ASSETS_PATH, BOX2D_SCALE } from "../../shared/config/constants.js";
import Assets from "../../shared/lib/assets.js";

export default class Player {
    constructor(world, options = {}) {
        this.physics = new PlayerPhysics(world, options);
        this.renderer = new PlayerRenderer(options);
        this.controller = new PlayerController(this);

        this.isAttacking = false;
        this.isBlocking = false;

        this.sfxJump = Assets.sound(ASSETS_PATH.SOUNDS + "/sfx/jump.adp");
        this.sfxBlades = Assets.sound(ASSETS_PATH.SOUNDS + "/sfx/blades.adp");
    }

    move(dirX) {
        if (this.isBlocking) {
            this.physics.moveHorizontally(0);
            return;
        }

        this.physics.moveHorizontally(dirX);

        if (dirX < 0) this.renderer.onMoveLeft();
        else if (dirX > 0) this.renderer.onMoveRight();
        else this.renderer.idle();
    }

    attack() {
        if (this.isAttacking) return;
        this.isAttacking = true;

        this.renderer.startAttack(() => {
            this.isAttacking = false;
            this.renderer.idle();
        });

        if (this.sfxBlades && !this.sfxBlades.playing()) {
            this.sfxBlades.play();
        }
    }

    block() {
        if (this.isAttacking) return;
        this.isBlocking = true;
        this.renderer.onBlock();
    }

    stopBlock() {
        this.isBlocking = false;
        this.renderer.idle();
    }

    jump() {
        this.physics.jump();

        if (this.sfxJump && !this.sfxJump.playing()) {
            this.sfxJump.play();
        }
    }

    update() {
        this.controller.update();

        const pos = this.physics.getPosition();
        this.renderer.draw(pos.x * BOX2D_SCALE, pos.y * BOX2D_SCALE);
    }
}