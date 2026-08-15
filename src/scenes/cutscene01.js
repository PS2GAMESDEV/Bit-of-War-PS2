import Assets from "../shared/lib/assets.js";
import Gamepad from "../shared/lib/gamepad.js";
import { ASSETS_PATH } from "../shared/config/constants.js";

import Game from "./Game.js";

export function Cutscene01(sceneManager, next) {
    this.sceneManager = sceneManager;
    this.next = next;

    this.music = Assets.sound(ASSETS_PATH.SOUNDS + "/music/level1.ogg");

    this.textScroll = Assets.image(ASSETS_PATH.IMAGES + "/cutscenes/c01/text01.png", { scale: 2 });
    this.textEnd = Assets.image(ASSETS_PATH.IMAGES + "/cutscenes/c01/text02.png", { scale: 2 });
    this.textMask = Assets.image(ASSETS_PATH.IMAGES + "/cutscenes/black.png", { scale: 2 });
    this.arrow = Assets.image(ASSETS_PATH.IMAGES + "/ui/arrow.png", { scale: 1.5 });

    this.frames = [];
    for (let i = 0; i < 51; i++) {
        this.frames.push(
            Assets.image(`${ASSETS_PATH.IMAGES}/cutscenes/c01/${i}.png`, { optimize: true, scale: 2 })
        );
    }

    this.frameSpeed = 30;
    this.frameIndex = 0;
    this.frameTimer = 0;

    this.textScrollY = 448;

    this.scrollSpeed = 30;
    this.fastScrollSpeed = 120;

    this.normalFrameSpeed = 60;
    this.fastFrameSpeed = 360;

    this.waitTimer = 0;
    this.startWait = false;
    this.waitTime = 3;

    this.fast = false;

    this.music.play();
}

Cutscene01.prototype.update = function (dt) {
    this.fast = Gamepad.player(0).pressed(Pads.CROSS);

    this.textScrollY -= (this.fast ? this.fastScrollSpeed : this.scrollSpeed) * dt;

    this.frameTimer += (this.fast ? this.fastFrameSpeed : this.normalFrameSpeed) * dt;

    if (this.frameTimer >= this.frameSpeed) {
        this.frameTimer = 0;
        if (this.frameIndex < this.frames.length - 1) {
            this.frameIndex++;
        }
    }

    if (this.textScrollY <= -672 && !this.startWait) {
        this.startWait = true;
        this.waitTimer = 0;
    }

    if (this.startWait) {
        this.waitTimer += dt;
        if (this.waitTimer >= this.waitTime) {
            this.sceneManager.resumeScene(this.next);
        }
    }
};

Cutscene01.prototype.draw = function () {
    this.textScroll.draw(48, this.textScrollY);
    this.textMask.draw(48, 0);

    if (this.startWait) {
        this.textEnd.draw(48, 16);
    } else {
        this.frames[this.frameIndex].draw(48, 16);
    }

    if (this.fast) {
        this.arrow.draw(640 - 48, 448 - 32);
    }
};

Cutscene01.prototype.unload = function () {
    this.music.pause();
    Assets.free(this.music);
    Assets.free(this.textScroll);
    Assets.free(this.textEnd);
    Assets.free(this.textMask);
    Assets.free(this.arrow);

    for (let i = 0; i < this.frames.length; i++) {
        Assets.free(this.frames[i]);
    }
    this.frames = [];
};