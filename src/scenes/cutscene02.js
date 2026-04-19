import { ASSETS_PATH } from "../shared/lib/constants.js";
import Assets from "../shared/lib/assets.js";
import Gamepad from "../shared/lib/gamepad.js";


export function Cutscene02(sceneManager, next) {
    this.sceneManager = sceneManager;
    this.next = next;

    this.selectorSFX = Assets.sound(ASSETS_PATH.SOUNDS + "/sfx/selector.adp");
    this.arrow = Assets.image(ASSETS_PATH.IMAGES + "/ui/arrow.png", { scale: 1.5 });

    this.frames = [];
    for (let i = 0; i < 12; i++) {
        this.frames.push(
            Assets.image(`${ASSETS_PATH.IMAGES}/cutscenes/c02/${i}.png`, { optimize: true, scale: 2 })
        );
    }

    this.currentFrame = 0;
    this.timer = 0;
    this.frameDuration = 12;
    this.lastFrame = this.frames.length - 1;
    this.arrowTimer = 0;
    this.showArrow = true;
    this.arrowSpeed = 20;
}

Cutscene02.prototype.update = function (dt) {
    this.timer++;

    if (this.timer >= this.frameDuration) {
        this.timer = 0;
        if (this.currentFrame < 4) {
            this.currentFrame++;
        } else if (this.currentFrame > 7 && this.currentFrame < this.lastFrame) {
            this.currentFrame++;
        }
    }

    if (Gamepad.player(0).justPressed(Pads.CROSS) && this.currentFrame >= 4 && this.currentFrame <= 7) {
        if (this.currentFrame < this.lastFrame) {
            if (this.currentFrame < 7) this.selectorSFX.play();
            this.currentFrame++;
        }
    }

    this.arrowTimer++;
    if (this.arrowTimer >= this.arrowSpeed) {
        this.arrowTimer = 0;
        this.showArrow = !this.showArrow;
    }

    if (this.currentFrame === this.lastFrame) {
        this.sceneManager.resumeScene(this.next);
    }
};

Cutscene02.prototype.draw = function () {
    this.frames[this.currentFrame].draw(48, 16);

    if (this.currentFrame >= 4 && this.currentFrame <= 7 && this.showArrow) {
        this.arrow.draw(562, 419);
    }
};

Cutscene02.prototype.unload = function () {
    this.selectorSFX.free();
    this.arrow.free();
    this.frames.forEach(f => f.free());
};