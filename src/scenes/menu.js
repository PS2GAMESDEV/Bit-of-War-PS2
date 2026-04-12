import { ASSETS_PATH } from "../shared/lib/constants.js";
import { LANG } from "src/shared/lang/lang.js";
import Assets from "../shared/lib/assets.js";
import Gamepad from "src/shared/lib/gamepad.js";

import { Cutscene01 } from "./Cutscene01.js";

let font = Assets.font("assets/font/font.ttf");
export function Menu(Scene) {
    let pad = Gamepad.player(0);;

    const gray = Color.new(72, 72, 72);
    const red = Color.new(255, 0, 0);
    const white = Color.new(255, 255, 255);

    let musicMenu = Assets.sound(ASSETS_PATH.SOUNDS + "/music/menu.wav");
    let selectedSFX = Assets.sound(ASSETS_PATH.SOUNDS + "/sfx/selected.adp");
    let selectorSFX = Assets.sound(ASSETS_PATH.SOUNDS + "/sfx/selector.adp");

    musicMenu.loop = true;

    let bgMain = Assets.image(ASSETS_PATH.IMAGES + "/ui/main.png", { scale: 2 });
    let bgLogo = Assets.image(ASSETS_PATH.IMAGES + "/ui/logo.png", { scale: 2 });

    let selected = 0;
    let currentScreen;

    let music = 10;
    let sfx = 10;
    let vibration = true;

    let currentLang = "en";

    const langs = ["en", "br", "sp"];
    let index = langs.indexOf(currentLang);

    function t(key) {
        return LANG[currentLang][key] || key;
    }

    const drawText = (x, y, text, color, scale = 0.7) => {
        font.color = color;
        font.scale = scale;

        let textX = x === 0 ? 320 - font.getTextSize(text).width / 2 : x;

        font.print(textX, y, text);
    };

    const changeScreen = (name, newSelected = 0) => {
        currentScreen = screens[name];
        selected = newSelected;
    };

    const updateSelection = (max) => {
        const old = selected;

        if (pad.justPressed(Pads.UP)) selected--;
        if (pad.justPressed(Pads.DOWN)) selected++;

        selected = Math.min(Math.max(selected, 0), max);

        if (old !== selected) {
            selectorSFX.play();
        }
    };

    const screens = {
        main: {
            update() {
                updateSelection(3);

                if (pad.justPressed(Pads.CROSS)) {
                    if (selected === 0) Scene.changeScene(Cutscene01);
                    if (selected === 1) changeScreen("load");
                    if (selected === 2) changeScreen("options");
                    if (selected === 3) changeScreen("extras");
                }
            },

            draw() {
                bgMain.draw(48, 16);

                drawText(0, 244, t("newgame"), selected === 0 ? red : white);
                drawText(0, 264, t("load"), selected === 1 ? red : white);
                drawText(0, 284, t("options"), selected === 2 ? red : white);
                drawText(0, 304, t("extra"), selected === 3 ? red : white);
            }
        },

        load: {
            update() {
                if (pad.justPressed(Pads.CROSS)) {
                    changeScreen("main", 1);
                }
            },

            draw() {
                bgLogo.draw(0, 0);
                drawText(0, 205, t("LOAD"), gray, 0.8);
            }
        },

        options: {
            update() {
                updateSelection(4);

                let dir = 0;

                if (pad.justPressed(Pads.LEFT)) dir = -1;
                if (pad.justPressed(Pads.RIGHT)) dir = 1;

                if (dir !== 0) {
                    if (selected === 0) {
                        music = Math.min(Math.max(music + dir, 0), 10);
                        Sound.setVolume(music * 10);
                    }

                    if (selected === 1) {
                        sfx = Math.min(Math.max(sfx + dir, 0), 10);
                        selectorSFX.volume = sfx * 10;
                        selectedSFX.volume = sfx * 10;
                    }

                    if (selected === 3) {
                        index = (index + dir + langs.length) % langs.length;
                        currentLang = langs[index];
                        selectedSFX.play();
                    }
                }

                if (pad.justPressed(Pads.CROSS)) {
                    if (selected === 2) changeScreen("controls");
                    if (selected === 4) changeScreen("main", 2);
                }
            },

            draw() {
                bgLogo.draw(0, 0);

                drawText(0, 205, t("OPTIONS"), gray, 0.8);

                drawText(0, 245, t("music") + music, selected === 0 ? red : white);
                drawText(0, 265, t("sfx") + sfx, selected === 1 ? red : white);
                drawText(0, 285, t("controller"), selected === 2 ? red : white);
                drawText(0, 305, t("language"), selected === 3 ? red : white);

                drawText(0, 345, t("back"), selected === 4 ? red : white);
            }
        },

        controls: {
            update() {
                if (pad.justPressed(Pads.CROSS)) {
                    changeScreen("options", 2);
                }
            },

            draw() {
                bgLogo.draw(0, 0);

                drawText(0, 205, t("controller"), gray, 0.8);

                drawText(0, 245, "ATTACK: SQUARE", white);
                drawText(0, 265, "JUMP: CROSS", white);
                drawText(0, 285, "MOVE: < >", white);
                drawText(0, 305, "MAGIC: L2", white);
                drawText(0, 325, "BLOCK: L1", white);
            }
        },

        extras: {
            update() {
                updateSelection(3);

                if (pad.justPressed(Pads.CROSS)) {
                    if (selected === 1) changeScreen("challenges");
                    if (selected === 2) changeScreen("credits");
                    if (selected === 3) changeScreen("main", 3);
                }
            },

            draw() {
                bgLogo.draw(0, 0);

                drawText(0, 205, "EXTRAS", gray, 0.8);

                drawText(0, 245, t("gauntlet"), selected === 0 ? red : white);
                drawText(0, 265, t("challenges"), selected === 1 ? red : white);
                drawText(0, 285, t("credits"), selected === 2 ? red : white);

                drawText(0, 325, t("back"), selected === 3 ? red : white);
            }
        },

        challenges: {
            update() {
                if (pad.justPressed(Pads.CROSS)) {
                    changeScreen("extras", 1);
                }
            },

            draw() {
                drawText(0, 205, t("EXTRAS"), gray, 0.8);
            }
        },

        credits: {
            update() {
                if (pad.justPressed(Pads.CROSS)) {
                    changeScreen("extras", 2);
                }
            },

            draw() {
                bgLogo.draw(0, 0);

                drawText(0, 200, "PROGRAMMING", red, 0.8);
                drawText(0, 225, "GIBRAN KHALIL", white);
                drawText(0, 245, "EDUARDO SOUSA", white);
                drawText(0, 265, "DEV NOOB", white);

                drawText(0, 305, "ORIGINALLY CREATED BY", red, 0.7);
                drawText(0, 330, "HOLMODE GAMES", white);
            }
        }
    };

    changeScreen("main");
    musicMenu.play();

    return {
        update() {
            pad = Gamepad.player(0);
            currentScreen.update();
        },

        draw() {
            currentScreen.draw();
        },

        unload() {
            musicMenu.pause();
            musicMenu.free();
            bgMain.free();
            bgLogo.free();
        }
    };
}