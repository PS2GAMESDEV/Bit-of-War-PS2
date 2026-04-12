import { ASSETS_PATH } from "../shared/lib/constants.js";
import { LANG } from "src/shared/lang/lang.js";
import Assets from "../shared/lib/assets.js";
import Gamepad from "src/shared/lib/gamepad.js";

import { Cutscene01 } from "./cutscene01.js";

let font = Assets.font("assets/font/font.ttf");

export function Menu(sceneManager) {
    this.sceneManager = sceneManager;

    this.pad = Gamepad.player(0);

    this.gray = Color.new(72, 72, 72);
    this.red = Color.new(255, 0, 0);
    this.white = Color.new(255, 255, 255);

    this.musicMenu = Assets.sound(ASSETS_PATH.SOUNDS + "/music/menu.wav");
    this.selectedSFX = Assets.sound(ASSETS_PATH.SOUNDS + "/sfx/selected.adp");
    this.selectorSFX = Assets.sound(ASSETS_PATH.SOUNDS + "/sfx/selector.adp");

    this.musicMenu.loop = true;

    this.bgMain = Assets.image(ASSETS_PATH.IMAGES + "/ui/main.png", { scale: 2 });
    this.bgLogo = Assets.image(ASSETS_PATH.IMAGES + "/ui/logo.png", { scale: 2 });

    this.selected = 0;
    this.currentScreen = null;

    this.music = 10;
    this.sfx = 10;
    this.vibration = true;

    this.currentLang = "en";
    this.langs = ["en", "br", "sp"];
    this.langIndex = this.langs.indexOf(this.currentLang);

    this._initScreens();
    this._changeScreen("main");
    this.musicMenu.play();
}

Menu.prototype.t = function (key) {
    return LANG[this.currentLang][key] || key;
};

Menu.prototype._drawText = function (x, y, text, color, scale = 0.7) {
    font.color = color;
    font.scale = scale;
    const textX = x === 0 ? 320 - font.getTextSize(text).width / 2 : x;
    font.print(textX, y, text);
};

Menu.prototype._changeScreen = function (name, newSelected = 0) {
    this.currentScreen = this.screens[name];
    this.selected = newSelected;
};

Menu.prototype._updateSelection = function (max) {
    const old = this.selected;
    if (this.pad.justPressed(Pads.UP)) this.selected--;
    if (this.pad.justPressed(Pads.DOWN)) this.selected++;
    this.selected = Math.min(Math.max(this.selected, 0), max);
    if (old !== this.selected) {
        this.selectorSFX.play();
    }
};

Menu.prototype._initScreens = function () {
    const self = this;

    this.screens = {
        main: {
            update() {
                self._updateSelection(3);
                if (self.pad.justPressed(Pads.CROSS)) {
                    if (self.selected === 0) self.sceneManager.changeScene(Cutscene01);
                    if (self.selected === 1) self._changeScreen("load");
                    if (self.selected === 2) self._changeScreen("options");
                    if (self.selected === 3) self._changeScreen("extras");
                }
            },
            draw() {
                self.bgMain.draw(48, 16);
                self._drawText(0, 244, self.t("newgame"), self.selected === 0 ? self.red : self.white);
                self._drawText(0, 264, self.t("load"),    self.selected === 1 ? self.red : self.white);
                self._drawText(0, 284, self.t("options"), self.selected === 2 ? self.red : self.white);
                self._drawText(0, 304, self.t("extra"),   self.selected === 3 ? self.red : self.white);
            }
        },

        load: {
            update() {
                if (self.pad.justPressed(Pads.CROSS)) self._changeScreen("main", 1);
            },
            draw() {
                self.bgLogo.draw(0, 0);
                self._drawText(0, 205, self.t("LOAD"), self.gray, 0.8);
            }
        },

        options: {
            update() {
                self._updateSelection(4);
                let dir = 0;
                if (self.pad.justPressed(Pads.LEFT))  dir = -1;
                if (self.pad.justPressed(Pads.RIGHT)) dir = 1;

                if (dir !== 0) {
                    if (self.selected === 0) {
                        self.music = Math.min(Math.max(self.music + dir, 0), 10);
                        Sound.setVolume(self.music * 10);
                    }
                    if (self.selected === 1) {
                        self.sfx = Math.min(Math.max(self.sfx + dir, 0), 10);
                        self.selectorSFX.volume = self.sfx * 10;
                        self.selectedSFX.volume = self.sfx * 10;
                    }
                    if (self.selected === 3) {
                        self.langIndex = (self.langIndex + dir + self.langs.length) % self.langs.length;
                        self.currentLang = self.langs[self.langIndex];
                        self.selectedSFX.play();
                    }
                }

                if (self.pad.justPressed(Pads.CROSS)) {
                    if (self.selected === 2) self._changeScreen("controls");
                    if (self.selected === 4) self._changeScreen("main", 2);
                }
            },
            draw() {
                self.bgLogo.draw(0, 0);
                self._drawText(0, 205, self.t("OPTIONS"),  self.gray, 0.8);
                self._drawText(0, 245, self.t("music") + self.music,  self.selected === 0 ? self.red : self.white);
                self._drawText(0, 265, self.t("sfx") + self.sfx,      self.selected === 1 ? self.red : self.white);
                self._drawText(0, 285, self.t("controller"),           self.selected === 2 ? self.red : self.white);
                self._drawText(0, 305, self.t("language"),             self.selected === 3 ? self.red : self.white);
                self._drawText(0, 345, self.t("back"),                 self.selected === 4 ? self.red : self.white);
            }
        },

        controls: {
            update() {
                if (self.pad.justPressed(Pads.CROSS)) self._changeScreen("options", 2);
            },
            draw() {
                self.bgLogo.draw(0, 0);
                self._drawText(0, 205, self.t("controller"), self.gray, 0.8);
                self._drawText(0, 245, "ATTACK: SQUARE", self.white);
                self._drawText(0, 265, "JUMP: CROSS",    self.white);
                self._drawText(0, 285, "MOVE: < >",      self.white);
                self._drawText(0, 305, "MAGIC: L2",      self.white);
                self._drawText(0, 325, "BLOCK: L1",      self.white);
            }
        },

        extras: {
            update() {
                self._updateSelection(3);
                if (self.pad.justPressed(Pads.CROSS)) {
                    if (self.selected === 1) self._changeScreen("challenges");
                    if (self.selected === 2) self._changeScreen("credits");
                    if (self.selected === 3) self._changeScreen("main", 3);
                }
            },
            draw() {
                self.bgLogo.draw(0, 0);
                self._drawText(0, 205, "EXTRAS",              self.gray, 0.8);
                self._drawText(0, 245, self.t("gauntlet"),    self.selected === 0 ? self.red : self.white);
                self._drawText(0, 265, self.t("challenges"),  self.selected === 1 ? self.red : self.white);
                self._drawText(0, 285, self.t("credits"),     self.selected === 2 ? self.red : self.white);
                self._drawText(0, 325, self.t("back"),        self.selected === 3 ? self.red : self.white);
            }
        },

        challenges: {
            update() {
                if (self.pad.justPressed(Pads.CROSS)) self._changeScreen("extras", 1);
            },
            draw() {
                self._drawText(0, 205, self.t("EXTRAS"), self.gray, 0.8);
            }
        },

        credits: {
            update() {
                if (self.pad.justPressed(Pads.CROSS)) self._changeScreen("extras", 2);
            },
            draw() {
                self.bgLogo.draw(0, 0);
                self._drawText(0, 200, "PROGRAMMING",          self.red, 0.8);
                self._drawText(0, 225, "GIBRAN KHALIL",        self.white);
                self._drawText(0, 245, "EDUARDO SOUSA",        self.white);
                self._drawText(0, 265, "DEV NOOB",             self.white);
                self._drawText(0, 305, "ORIGINALLY CREATED BY",self.red, 0.7);
                self._drawText(0, 330, "HOLMODE GAMES",        self.white);
            }
        }
    };
};

Menu.prototype.update = function (dt) {
    this.pad = Gamepad.player(0);
    this.currentScreen.update();
};

Menu.prototype.draw = function () {
    this.currentScreen.draw();
};

Menu.prototype.unload = function () {
    this.musicMenu.pause();
    this.musicMenu.free();
    this.bgMain.free();
    this.bgLogo.free();
};