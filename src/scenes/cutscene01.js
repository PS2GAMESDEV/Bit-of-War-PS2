import Assets from "../shared/lib/assets.js";
import Gamepad from "../shared/lib/gamepad.js";
import { ASSETS_PATH } from "../shared/lib/constants.js";

import { OlympusMntClimb } from "./OlympusMntClimb.js";

export function Cutscene01(Scene) {

    let music = Assets.sound(ASSETS_PATH.SOUNDS + "/music/level1.ogg");

    let textScroll = Assets.image(ASSETS_PATH.IMAGES + "/cutscenes/c01/text01.png", { scale: 2 });
    let textEnd = Assets.image(ASSETS_PATH.IMAGES + "/cutscenes/c01/text02.png", { scale: 2 });
    let textMask = Assets.image(ASSETS_PATH.IMAGES + "/cutscenes/black.png", { scale: 2 });

    let arrow = Assets.image(ASSETS_PATH.IMAGES + "/ui/arrow.png", { scale: 1.5 });

    let frames = [];

    for (let i = 0; i < 51; i++) {
        frames.push(
            Assets.image(`${ASSETS_PATH.IMAGES}/cutscenes/c01/${i}.png`, { optimize: true, scale: 2 })
        );
    }

    const frameSpeed = 30;
    let frameIndex = 0;
    let frameTimer = 0;

    let textScrollY = 448;

    const scrollSpeed = 30;
    const fastScrollSpeed = 120;

    const normalFrameSpeed = 60;
    const fastFrameSpeed = 360;

    let waitTimer = 0;
    let startWait = false;
    const waitTime = 3;

    let fast;

    music.play();

    return {
        update(dt) {
            fast = Gamepad.player(0).pressed(Pads.CROSS);

            textScrollY -= (fast ? fastScrollSpeed : scrollSpeed) * dt;

            frameTimer += (fast ? fastFrameSpeed : normalFrameSpeed) * dt;

            if (frameTimer >= frameSpeed) {
                frameTimer = 0;
                if (frameIndex < frames.length - 1) {
                    frameIndex++;
                }
            }

            if (textScrollY <= -672 && !startWait) {
                startWait = true;
                waitTimer = 0;
            }

            if (startWait) {
                waitTimer += dt;

                if (waitTimer >= waitTime) {
                    Scene.changeScene(OlympusMntClimb);
                }
            }
        },

        draw() {
            textScroll.draw(48, textScrollY);
            textMask.draw(48, 0);

            if (startWait) {
                textEnd.draw(48, 16);
            } else {
                frames[frameIndex].draw(48, 16);
            }

            if (fast) {
                arrow.draw(640 - 48, 448 - 32);
            }

        },

        unload() {
            music.pause();
            music.free();
            textScroll.free();
            textEnd.free();
            textMask.free();
            arrow.free();

            for (let i = 0; i < frames.length; i++) {
                frames[i].free();
            }

        }
    };
}