import { GLYPHS, LANGS, getLang, setLang, t } from "../shared/lang/lang.js";
import { centeredX, formatTime, scaled } from "../shared/lib/ui.js";
import { Save } from "../shared/lib/save.js";
import { loadSettings, saveSettings, settings } from "../shared/lib/settings.js";
import { Cutscene01 } from "./cutscene01.js";
import Game, { LEVELS } from "./Game.js";
import { log } from "../shared/lib/boot_log.js";

// Diagnostic: true skips music.play(); the music is already ruled out (same freeze without it).
const DIAG_NO_MUSIC = false;

// Diagnostic: which draws the menu skips, to find the one that hangs the frame.
//   ""       nothing skipped (the freeze)
//   "text"   no font.print at all: only the images are drawn
//   "images" no image draw on the main screen: only the text is drawn
const DIAG_SKIP = "";

// Temporary testing menu; disable to hide the level selector.
const TEMP_LEVEL_SELECT = true;
const LEVEL_ROWS = 6;

const GRAY =Color.new(72, 72, 72);
const RED = Color.new(255, 0, 0);
const WHITE = Color.new(255, 255, 255);

const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

export class Menu extends Scene {
    static root = "assets";

    static assets = {
        images: {
            main: "images/ui/main.png",
            logo: "images/ui/logo.png"
        },
        fonts: {
            text: { path: "font/font.ttf", size: 18, preload: GLYPHS },
            header: { path: "font/font.ttf", size: 21, preload: GLYPHS }
        },
        music: { menu: { path: "sounds/music/menu.wav", loop: true } },
        sfx: {
            selected: "sounds/sfx/selected.adp",
            selector: "sounds/sfx/selector.adp"
        }
    };

    async enter({ images, fonts, music }, params) {
        log("Menu.enter");
        this.pad = Gamepad.player(0);
        this.text = fonts.text;
        this.header = fonts.header;
        this.mainSize = scaled(images.main, 2);
        this.logoSize = scaled(images.logo, 2);

        this.selected = 0;
        // Volumes and language stored on the memory card (read once per run).
        await loadSettings();
        this.langIndex = LANGS.indexOf(getLang());

        this.screens = this._screens();
        if (TEMP_LEVEL_SELECT && Number.isInteger(params?.testLevelIndex)) {
            this._go("levels", clamp(params.testLevelIndex, 0, LEVELS.length - 1));
        } else {
            this._go("main");
        }
        log("Menu.enter: before music.play");
        if (!DIAG_NO_MUSIC) music.menu.play();
        log("Menu.enter: done");
    }

    exit() {
        this.assets.music.menu.stop();
    }

    update() {
        // Diagnostic: first frames, then a heartbeat every ~2 s.
        this.dbgU = (this.dbgU || 0) + 1;
        if (this.dbgU <= 3 || this.dbgU % 120 === 0) log(`Menu.update #${this.dbgU} busy=${Scene.busy}`);
        if (!Scene.busy) this.screen.update();
    }

    draw() {
        this.dbgD = (this.dbgD || 0) + 1;
        if (this.dbgD <= 3 || this.dbgD % 120 === 0) log(`Menu.draw #${this.dbgD} begin`);
        this.screen.draw();
        if (this.dbgD <= 3) log(`Menu.draw #${this.dbgD} end`);
    }

    _t(key) {
        return t(key);
    }

    _logo(title) {
        this.assets.images.logo.draw(0, 0, this.logoSize);
        this._print(205, title, GRAY, this.header);
    }

    // Load Game: shows the screen at once and fills `slot` when the card has been read
    // (undefined while reading, null without a save).
    async _openLoad() {
        this.slot = undefined;
        this._go("load");
        this.slot = await Save.load();
    }

    _go(name, selected = 0) {
        this.screen = this.screens[name];
        this.selected = selected;
    }

    _print(y, text, color, font = this.text) {
        if (DIAG_SKIP === "text") return;
        font.color = color;
        font.print(centeredX(font, text), y, text);
    }

    // Prints `labels` one per row, highlighting the selected one.
    _list(y, step, labels) {
        for (let i = 0; i < labels.length; i++) {
            this._print(y + i * step, labels[i], i === this.selected ? RED : WHITE);
        }
    }

    _move(last) {
        const previous = this.selected;
        if (this.pad.justPressed(Gamepad.UP)) this.selected--;
        if (this.pad.justPressed(Gamepad.DOWN)) this.selected++;
        this.selected = clamp(this.selected, 0, last);
        if (previous !== this.selected) this.assets.sfx.selector.play();
    }

    _screens() {
        const menu = this;
        const { images, sfx } = this.assets;
        const confirm = () => this.pad.justPressed(Gamepad.CROSS);
        return {
            main: {
                update() {
                    menu._move(TEMP_LEVEL_SELECT ? 4 : 3);
                    if (!confirm()) return;
                    if (menu.selected === 0) Scene.go(Cutscene01);
                    else if (menu.selected === 1) menu._openLoad();
                    else menu._go(["", "", "options", "extras", "levels"][menu.selected]);
                },
                draw() {
                    if (DIAG_SKIP !== "images") images.main.draw(48, 16, menu.mainSize);
                    const labels = [menu._t("newgame"), menu._t("load"), menu._t("options"), menu._t("extra")];
                    if (TEMP_LEVEL_SELECT) labels.push(menu._t("testLevels"));
                    menu._list(244, 20, labels);
                }
            },

            levels: {
                update() {
                    menu._move(LEVELS.length);
                    if (menu.pad.justPressed(Gamepad.CIRCLE) || (confirm() && menu.selected === LEVELS.length)) {
                        menu._go("main", 4);
                    } else if (confirm()) {
                        Scene.go(Game, { params: { testLevelIndex: menu.selected } });
                    }
                },
                draw() {
                    menu._logo(menu._t("testLevels"));
                    const first = Math.min(Math.max(0, menu.selected - LEVEL_ROWS + 1), Math.max(0, LEVELS.length - LEVEL_ROWS));
                    LEVELS.slice(first, first + LEVEL_ROWS).forEach((file, row) => {
                        const index = first + row;
                        menu._print(245 + row * 20, `${index + 1}. ${file.replace(/\.json$/, "")}`, index === menu.selected ? RED : WHITE);
                    });
                    menu._print(385, menu._t("back"), menu.selected === LEVELS.length ? RED : WHITE);
                    menu._print(420, menu._t("testLevelControls"), GRAY);
                }
            },

            load: {
                update() {
                    const slot = menu.slot;
                    if (slot === undefined) return; // still reading the card

                    if (menu.pad.justPressed(Gamepad.CIRCLE) || (confirm() && !slot?.progress)) {
                        menu._go("main", 1);
                    } else if (confirm()) {
                        Scene.go(Game, { params: { save: slot.progress } });
                    }
                },
                draw() {
                    menu._logo(menu._t("LOAD"));

                    const slot = menu.slot;
                    if (slot === undefined) return menu._print(245, menu._t("reading"), WHITE);
                    if (slot === null || !slot.progress) {
                        menu._print(245, menu._t(slot === null && !Save.isReady() ? "noCard" : "noSave"), WHITE);
                    } else {
                        menu._print(245, menu._t("level") + (slot.progress.levelIndex + 1), RED);
                        menu._print(270, menu._t("time") + formatTime(slot.progress.playTime), WHITE);
                    }
                    if (slot?.bestTime != null) menu._print(305, menu._t("best") + formatTime(slot.bestTime), GRAY);
                }
            },

            options: {
                update() {
                    menu._move(4);

                    const dir = (menu.pad.justPressed(Gamepad.RIGHT) ? 1 : 0) - (menu.pad.justPressed(Gamepad.LEFT) ? 1 : 0);
                    if (dir !== 0) {
                        if (menu.selected === 0) {
                            settings.music = clamp(settings.music + dir, 0, 10);
                            Sound.setVolume(settings.music * 10);
                        } else if (menu.selected === 1) {
                            settings.sfx = clamp(settings.sfx + dir, 0, 10);
                            Sound.setSfxVolume(settings.sfx * 10);
                        } else if (menu.selected === 3) {
                            menu.langIndex = (menu.langIndex + dir + LANGS.length) % LANGS.length;
                            setLang(LANGS[menu.langIndex]);
                            sfx.selected.play();
                        }
                    }

                    if (!confirm()) return;
                    if (menu.selected === 2) menu._go("controls");
                    if (menu.selected === 4) {
                        saveSettings(); // volumes and language go to the memory card
                        menu._go("main", 2);
                    }
                },
                draw() {
                    menu._logo(menu._t("OPTIONS"));
                    menu._list(245, 20, [
                        menu._t("music") + settings.music,
                        menu._t("sfx") + settings.sfx,
                        menu._t("controller"),
                        menu._t("language")
                    ]);
                    menu._print(345, menu._t("back"), menu.selected === 4 ? RED : WHITE);
                }
            },

            controls: {
                update() {
                    if (confirm()) menu._go("options", 2);
                },
                draw() {
                    menu._logo(menu._t("controller"));
                    ["ATTACK: SQUARE", "JUMP: CROSS", "MOVE: < >", "MAGIC: L2", "BLOCK: L1"]
                        .forEach((line, i) => menu._print(245 + i * 20, line, WHITE));
                }
            },

            extras: {
                update() {
                    menu._move(3);
                    if (!confirm()) return;
                    if (menu.selected === 1) menu._go("challenges");
                    if (menu.selected === 2) menu._go("credits");
                    if (menu.selected === 3) menu._go("main", 3);
                },
                draw() {
                    menu._logo("EXTRAS");
                    menu._list(245, 20, [menu._t("gauntlet"), menu._t("challenges"), menu._t("credits")]);
                    menu._print(325, menu._t("back"), menu.selected === 3 ? RED : WHITE);
                }
            },

            challenges: {
                update() {
                    if (confirm()) menu._go("extras", 1);
                },
                draw() {
                    menu._print(205, menu._t("EXTRAS"), GRAY, menu.header);
                }
            },

            credits: {
                update() {
                    if (confirm()) menu._go("extras", 2);
                },
                draw() {
                    images.logo.draw(0, 0, menu.logoSize);
                    menu._print(200, "PROGRAMMING", RED, menu.header);
                    menu._print(225, "GIBRAN KHALIL", WHITE);
                    menu._print(245, "EDUARDO SOUSA", WHITE);
                    menu._print(265, "DEV NOOB", WHITE);
                    menu._print(305, "ORIGINALLY CREATED BY", RED);
                    menu._print(330, "HOLMODE GAMES", WHITE);
                }
            }
        };
    }
}
