import { GLYPHS, LANGS, getLang, setLang, t } from "../shared/lang/lang.js";
import { centeredX, formatTime, scaled } from "../shared/lib/ui.js";
import { Save } from "../shared/lib/save.js";
import { loadSettings, saveSettings, settings } from "../shared/lib/settings.js";
import Game, { LEVELS } from "./Game.js";

const DIAG_NO_MUSIC = false;

const DIAG_SKIP = "";

const TEMP_LEVEL_SELECT = false;
const LEVEL_ROWS = 6;

const GRAY =Color.new(72, 72, 72);
const RED = Color.new(255, 0, 0);
const WHITE = Color.new(255, 255, 255);
const BLACK = Color.new(0, 0, 0);

const LEVEL_SELECT_HOLD = Gamepad.L1;
const LEVEL_SELECT_PRESS = Gamepad.R1;

const WORLDS = Object.freeze([
    { label: "Level 1 - Mt. Olympus", level: 0, weapons: 1 },
    { label: "Level 2 - Armada", level: 6, weapons: 2 },
    { label: "Level 3 - Desert", level: 11, weapons: 3 },
    { label: "Level 4 - Fusion", level: 16, weapons: 4 }
]);

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
        this.pad = Gamepad.player(0);
        this.text = fonts.text;
        this.header = fonts.header;
        this.mainSize = scaled(images.main, 2);
        this.logoSize = scaled(images.logo, 2);

        this.selected = 0;

        await loadSettings();
        this.langIndex = LANGS.indexOf(getLang());

        this.unlockAll = false;
        this.screens = this._screens();
        if (TEMP_LEVEL_SELECT && Number.isInteger(params?.testLevelIndex)) {
            this._go("levels", clamp(params.testLevelIndex, 0, LEVELS.length - 1));
        } else {
            this._go("main");
        }
        if (!DIAG_NO_MUSIC) music.menu.play();
    }

    exit() {
        this.assets.music.menu.stop();
    }

    update() {

        if (!Scene.busy) this.screen.update();
    }

    draw() {
        this.screen.draw();
    }

    _t(key) {
        return t(key);
    }

    _logo(title) {
        this.assets.images.logo.draw(0, 0, this.logoSize);
        this._print(205, title, GRAY, this.header);
    }

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

                    if (menu.pad.pressed(LEVEL_SELECT_HOLD) && menu.pad.justPressed(LEVEL_SELECT_PRESS)) {
                        menu._go("levelSelect");
                        return;
                    }
                    menu._move(TEMP_LEVEL_SELECT ? 4 : 3);
                    if (!confirm()) return;

                    if (menu.selected === 0) Scene.go(Game);
                    else if (menu.selected === 1) menu._openLoad();
                    else if (menu.selected === 2) Scene.go(Game, { params: { gauntlet: true } });
                    else menu._go(["", "", "", "options", "levels"][menu.selected]);
                },
                draw() {
                    if (DIAG_SKIP !== "images") images.main.draw(48, 16, menu.mainSize);
                    const labels = [menu._t("newgame"), menu._t("load"), menu._t("gauntlet"), menu._t("options")];
                    if (TEMP_LEVEL_SELECT) {
                        labels.push(menu._t("testLevels"));

                        Draw.rect(120, 244 + 4 * 20 - 2, 400, 24, BLACK);
                    }
                    menu._list(244, 20, labels);
                }
            },

            levelSelect: {
                update() {
                    menu._move(4);
                    if (menu.pad.justPressed(Gamepad.CIRCLE)) { menu._go("main", 0); return; }
                    if (!confirm()) return;
                    if (menu.selected === 4) {
                        menu.unlockAll = !menu.unlockAll;
                        sfx.selected.play();
                        return;
                    }
                    const world = WORLDS[menu.selected];
                    Scene.go(Game, { params: {
                        skipIntro: true,
                        save: {
                            levelIndex: world.level, playTime: 0, player: null, chests: [], resources: null,
                            unlockedPowers: menu.unlockAll ? 4 : world.weapons, selectedPower: 0
                        }
                    } });
                },
                draw() {
                    menu._print(60 * 2 + 16, "- LEVEL SELECT -", WHITE);
                    for (let i = 0; i < 4; i++) menu._print(80 * 2 + 16 + i * 20, WORLDS[i].label, i === menu.selected ? RED : WHITE);
                    menu._print(80 * 2 + 16 + 80, menu.unlockAll ? "Weapons - Unlock All" : "Weapons - Normal", menu.selected === 4 ? RED : WHITE);
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
                    if (slot === undefined) return;

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
                    menu._move(6);

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
                    if (menu.selected === 4) menu._go("credits");
                    if (menu.selected === 5) {
                        saveSettings();
                        menu._go("main", 3);
                    }
                },
                draw() {
                    menu._logo(menu._t("OPTIONS"));
                    menu._list(245, 20, [
                        menu._t("music") + settings.music,
                        menu._t("sfx") + settings.sfx,
                        menu._t("controller"),
                        menu._t("language"),
                        menu._t("credits")
                    ]);
                    menu._print(365, menu._t("back"), menu.selected === 5 ? RED : WHITE);
                }
            },

            controls: {
                update() {
                    if (confirm()) menu._go("options", 2);
                },
                draw() {
                    menu._logo(menu._t("controller"));
                    ["ATTACK: SQUARE", "JUMP: CROSS", "MOVE: < >", "MAGIC: L2 / SELECT: TRIANGLE", "BLOCK: L1 / OPEN: CIRCLE"]
                        .forEach((line, i) => menu._print(245 + i * 20, line, WHITE));
                }
            },

            credits: {
                update() {
                    if (confirm()) menu._go("options", 4);
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
