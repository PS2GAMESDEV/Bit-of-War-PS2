import Assets from "../shared/lib/assets.js";
import Gamepad from "../shared/lib/gamepad.js";
import { ASSETS_PATH } from "../shared/lib/constants.js";

import { OlympusMntClimb } from "./OlympusMntClimb.js"


export function Cutscene01(Scene) {
    
    let music = Assets.sound(ASSETS_PATH.SOUNDS + "/music/level1.ogg");
    
    let textScroll = Assets.image(ASSETS_PATH.IMAGES + "/cutscene/c01/text01.png").scale(2);
    let textEnd = Assets.image(ASSETS_PATH.IMAGES + "/cutscene/c01/text02.png").scale(2);
    let textMask = Assets.image(ASSETS_PATH.IMAGES + "/cutscene/black.png").scale(2);

    let frames = [];

    for (let i = 0; i < 51; i++) {
        frames.push(
            Assets.image(`${ASSETS_PATH.IMAGES}/cutscene/c01/${i}.png`).scale(2)
        );
    }

    const frameSpeed = 30;
    let frameIndex = 0;
    let frameTimer = 0;

    let textScrollY = 448;

    const scrollSpeed = 0.3;
    const fastScrollSpeed = 2;

    const normalFrameSpeed = 1;
    const fastFrameSpeed = 6;
    
    music.play();

    return {
        update(dt) {
            const fast = Gamepad.player(0).pressed(Pads.CROSS);

            textScrollY -= fast ? fastScrollSpeed : scrollSpeed;
            frameTimer += fast ? fastFrameSpeed : normalFrameSpeed;

            if (frameTimer >= frameSpeed) {
                frameTimer = 0;
                if (frameIndex < frames.length - 1) {
                    frameIndex++;
                }
            }
        },

        draw() {
            textScroll.draw(48, textScrollY);
            textMask.draw(48, 0);

            if (textScrollY > -672) {
                frames[frameIndex].draw(48, 16);
            } else {
                //textEnd.draw(48, 16);
                Scene.changeScene(OlympusMntClimb);
            }
        },

        unload() {
            music.pause();
            music.free();
            textScroll.free();
            textEnd.free();
            textMask.free();

            for(let i = 0; i < frames.length; i++) {
                frames[i].free();
            }

            //frames.length = 0;
        }
    };
}