import { Level } from "../features/Map/level.js";
import { Player } from "../features/Player/player.js";
import { PLAYER_CONTROLS as KEY } from "../shared/config/controls.js";
import {
    ASSETS_PATH, DOOR_CONFIG, GAME_SCALE, LAYER, SCREEN_HEIGHT, SCREEN_WIDTH,
    PLAYER_ANIMATIONS as ANIM, PLAYER_MOVEMENT as MOVE
} from "../shared/lib/constants.js";
import { GLYPHS, t } from "../shared/lang/lang.js";
import { Save } from "../shared/lib/save.js";
import { centeredX, formatTime, scaled } from "../shared/lib/ui.js";
import { Cutscene02 } from "./cutscene02.js";
// Only used at runtime (menu.js imports this file too).
import { Menu } from "./menu.js";

const LEVELS = Object.freeze([
    "GaiaArm.json", "OlympusMntI01.json", "OlympusMntClimb.json",
    "Summit.json", "BossHall1.json", "Boss1.json"
]);

// Level index -> cutscene shown before that level.
const CUTSCENES = Object.freeze({
    5: Cutscene02
});

const STATE = Object.freeze({ PLAYING: 0, TRANSITIONING: 1, COMPLETED: 2, PAUSED: 3, GAME_OVER: 4 });

// Pause menu rows (lang keys), top to bottom.
const PAUSE_OPTIONS = Object.freeze(["resume", "saveGame", "quit"]);
const GAME_OVER_OPTIONS = Object.freeze(["restartSave", "saveQuit", "quitNoSave"]);

const FADE_OUT = Color.new(0, 0, 0, 128);
const FADE_CLEAR = Color.new(0, 0, 0, 0);
const BLACK = Color.new(0, 0, 0);
const PAUSE_DIM = Color.new(0, 0, 0, 100);
const WHITE = Color.new(255, 255, 255);
const RED = Color.new(255, 0, 0);
const NOTICE_TIME = 2;
const FLASH_TIME = 0.1;
const CAMERA_LERP = 6;
const INSET = 4;

const grid = { frameWidth: 16, frameHeight: 16 };

const enemy = (name, clips = {}) => ({
    path: `images/enemies/${name}.png`,
    ...grid,
    clips: { idle: "0", walk: { frames: "0-1", fps: 6 }, ...clips }
});

const chest = name => ({ path: `images/objects/${name}.png`, ...grid });

const readMap = async index =>
    JSON.parse(await Thread.readFileAsync(`${ASSETS_PATH.MAPS}/${LEVELS[index]}`, { text: true }));

export default class Game extends Scene {
    static root = "assets";

    static assets = {
        images: {
            hud: "images/sprites/kratos/hud.png",
            powerup: "images/sprites/kratos/powerup.png",
            gameOver: "images/ui/gameOver.png"
        },
        fonts: {
            text: { path: "font/font.ttf", size: 18, preload: GLYPHS }
        },
        sheets: {
            atlas: "images/tiles/texture.json",
            kratos: {
                path: "images/sprites/kratos/spritesheet.png",
                ...grid,
                clips: {
                    [ANIM.CLIMB]: { frames: "0-1", fps: 6 },
                    [ANIM.ATK_L]: "2",
                    [ANIM.ATK_R]: "3",
                    [ANIM.BLOCK_L]: "4",
                    [ANIM.BLOCK_R]: "5",
                    [ANIM.WALK_L]: { frames: "6-7", fps: 6 },
                    [ANIM.WALK_R]: { frames: "8-9", fps: 6 },
                    [ANIM.JUMP_L]: "6",
                    [ANIM.JUMP_R]: "8",
                    [ANIM.IDLE_L]: "7",
                    [ANIM.IDLE_R]: "9",
                    [ANIM.DIE]: { frames: "10-11", fps: 1.5, mode: "once" }
                }
            },
            blade: {
                path: "images/sprites/kratos/blade.png",
                frameWidth: 48,
                frameHeight: 16,
                clips: { swing: { frames: "0-6", fps: 16, mode: "once" } }
            },
            torch: {
                path: "images/objects/spriteTorch.png",
                ...grid,
                clips: { burn: { frames: "0-5", fps: 12 } }
            },
            lifeChest: chest("obLifeChest"),
            magicChest: chest("obMagicChest"),
            harpie: enemy("enHarpie", { idle: "2", fly: { frames: "0-1", fps: 8 } }),
            minotaur: enemy("enMinotaur", { run: { frames: "2-3", fps: 12 } }),
            skelbow: enemy("enSkelbow", { shoot: { frames: "0-1", fps: 4, mode: "once" } }),
            arrow: {
                path: "images/objects/arrow.png",
                frameWidth: 10,
                frameHeight: 3,
                clips: { fly: "0" }
            },
            zeus: {
                path: "images/enemies/bossZeus.png",
                ...grid,
                clips: {
                    idle: "7",
                    attack: { frames: "0,3", fps: 6, mode: "once" },
                    die: { frames: "1,5,6", fps: 4, mode: "once" },
                    float: "2",
                    damage: "4"
                }
            },
            zeusTransport: {
                path: "images/enemies/zeusTransport.png",
                frameWidth: 32,
                frameHeight: 16,
                clips: { transport: { frames: "0-1", fps: 8 } }
            },
            lighting: {
                path: "images/objects/lighting.png",
                ...grid,
                clips: { fly: { frames: "0-1", fps: 30 } }
            },
            undead: enemy("enUndead"),
            blood: {
                path: "images/vfx/blood.png",
                ...grid,
                clips: { splash: "0" }
            }
        },
        sfx: {
            blades: "sounds/sfx/blades.adp",
            chests: "sounds/sfx/chests.adp",
            jump: "sounds/sfx/jump.adp",
            selector: "sounds/sfx/selector.adp",
            hurt: "sounds/sfx/soundHurt.adp",
            zeusShoot: "sounds/sfx/soundZeusLightningShoot.adp",
            zeusTransport: "sounds/sfx/soundZeusTransport.adp",
            harpieScreech: "sounds/sfx/soundHarpieScreech.adp",
            enemyDie: "sounds/sfx/soundEnDie.adp",
            minotaurDie: "sounds/sfx/soundMinotaur.adp"
        }
    };

    // `params.save` is the Progress read from the memory card (Load Game).
    async enter(assets, params) {
        const { images, sheets } = assets;
        const progress = params?.save ?? null;

        // Textures used every frame stay resident in VRAM.
        sheets.atlas.image.lock();
        sheets.kratos.image.lock();
        sheets.blade.image.lock();

        this.hud = images.hud;
        this.powerup = images.powerup;
        this.hudSize = scaled(images.hud, GAME_SCALE);
        this.powerupSize = scaled(images.powerup, GAME_SCALE);
        this.gameOverSize = scaled(images.gameOver, GAME_SCALE);
        this.drawHud = () => { this._drawHud(); this._drawOverlay(); };

        this.world = new Collision.World({ gravity: { x: 0, y: MOVE.GRAVITY }, autoStep: false });
        this.camera = new Camera2D.Camera({ current: true });
        this.player = new Player(assets);

        this.level = null;
        this.levelIndex = progress ? progress.levelIndex : 0;
        this.playTime = progress ? progress.playTime : 0;
        this.bestTime = null;
        this.notice = null;
        this.debug = false;
        this.state = STATE.PLAYING;
        this.menuSelected = 0;
        this.saving = false;

        // A loaded level that has a cutscene before it shows it first (from
        // update: a scene cannot push another while it is being entered);
        // resume() then builds the level with this progress.
        this.introCutscene = progress ? CUTSCENES[this.levelIndex] ?? null : null;
        this.resumeProgress = this.introCutscene ? progress : null;

        this._build(await readMap(this.levelIndex), progress);
    }

    update(dt) {
        if (!this.level) return;

        if (this.introCutscene) {
            if (!Scene.busy) {
                const cutscene = this.introCutscene;
                this.introCutscene = null;
                Scene.push(cutscene, { drawBelow: false });
            }
            return;
        }

        const pad = Gamepad.player(0);

        if (this.notice && (this.notice.time -= dt) <= 0) this.notice = null;

        if (this.state === STATE.COMPLETED) {
            if (pad.justPressed(Gamepad.CROSS)) Scene.go(Menu);
            return;
        }

        if (this.state === STATE.PAUSED || this.state === STATE.GAME_OVER) {
            this._updateMenu(pad);
            return;
        }

        if (this.state === STATE.PLAYING) {
            this.playTime += dt;
            if (this.player.deathDone) {
                this.state = STATE.GAME_OVER;
                this.menuSelected = 0;
                return;
            }
            if (pad.justPressed(Gamepad.START) && !this.player.dead) {
                this.state = STATE.PAUSED;
                this.menuSelected = 0;
                return;
            }
        }

        if (pad.justPressed(Gamepad.L1)) this.debug = !this.debug;
        if (pad.justPressed(KEY.INTERACT)) this._interact();

        this.level.update(this.player.body, dt, this.camera.visibleRect());
        this.player.update(dt, pad); // steps the world, enemies included

        const hitbox = this.player.hitbox;
        if (hitbox) this.level.strike(hitbox, this.player.pos.x, this.player.struck);

        if (this.state === STATE.PLAYING && this.player.vulnerable) {
            const fromX = this.level.hitPlayer(this.player.body);
            if (fromX !== null) this.player.hurt(fromX);
        }
    }

    draw() {
        if (!this.level) return;

        Screen.clear(this.level.background);
        this.level.render(this.camera, () => this.player.draw());

        if (this.debug) this.world.drawDebug();

        Camera2D.screenSpace(this.drawHud);
    }

    // Everything needed to put the player back where he stopped. `midLevel`
    // false is the start of the current level (the player appears at the spawn).
    _progress(midLevel) {
        const chests = [];
        if (midLevel) this.level.chests.forEach((c, i) => { if (c.opened) chests.push(i); });

        return {
            levelIndex: this.levelIndex,
            playTime: this.playTime,
            player: midLevel ? { ...this.player.origin, facingLeft: this.player.facingLeft } : null,
            chests
        };
    }

    // Pause and game over menus: UP/DOWN pick a row, CROSS confirms (START
    // also resumes from the pause).
    _updateMenu(pad) {
        if (this.saving) return;

        const paused = this.state === STATE.PAUSED;
        if (paused && pad.justPressed(Gamepad.START)) return this._resume();

        const options = paused ? PAUSE_OPTIONS : GAME_OVER_OPTIONS;
        const previous = this.menuSelected;
        if (pad.justPressed(Gamepad.UP)) this.menuSelected--;
        if (pad.justPressed(Gamepad.DOWN)) this.menuSelected++;
        this.menuSelected = Math.min(Math.max(this.menuSelected, 0), options.length - 1);
        if (previous !== this.menuSelected) this.assets.sfx.selector?.play();

        if (!pad.justPressed(Gamepad.CROSS)) return;
        const option = options[this.menuSelected];
        if (option === "resume") this._resume();
        else if (option === "saveGame") this._saveGame();
        else if (option === "restartSave") this._restartFromSave();
        else if (option === "saveQuit") this._saveAndQuit();
        else Scene.go(Menu);
    }

    // Game over: the last checkpoint on the card, or the start of this level
    // when there is none.
    async _restartFromSave() {
        this.saving = true;
        const data = await Save.load();
        const progress = data?.progress ?? null;
        const index = progress ? progress.levelIndex : this.levelIndex;
        const map = await readMap(index);

        this.saving = false;
        this.levelIndex = index;
        if (progress) this.playTime = progress.playTime;
        this.player.revive();
        this._build(map, progress);
    }

    // Game over: saves the start of this level and goes back to the menu.
    async _saveAndQuit() {
        this.saving = true;
        const saved = await Save.saveProgress(this._progress(false));
        this.saving = false;

        if (saved) Scene.go(Menu);
        else this.notice = { key: "saveFailed", time: NOTICE_TIME };
    }

    _resume() {
        this.state = STATE.PLAYING;
    }

    // Writes the state to the memory card; the pause menu stays open.
    async _saveGame() {
        this.saving = true;
        const saved = await Save.saveProgress(this._progress(true));
        this.saving = false;
        this.notice = { key: saved ? "gameSaved" : "saveFailed", time: NOTICE_TIME };
    }

    // A cutscene was pushed over the game: free the level, hand the screen back.
    pause() {
        this._unload();
        Camera2D.main.makeCurrent();
    }

    // The cutscene ended: the level it interrupted is loaded now.
    async resume() {
        this.camera.makeCurrent();
        const progress = this.resumeProgress;
        this.resumeProgress = null;
        this._build(await readMap(this.levelIndex), progress);
        this.camera.fade(FADE_CLEAR, DOOR_CONFIG.FADE_IN);
    }

    exit() {
        this._unload();
        Camera2D.main.makeCurrent();
    }

    // `progress`, when given, puts the player and the opened chests back.
    _build(map, progress = null) {
        this.world.clear();
        this.level = new Level(map, this.assets.sheets, this.world, this.assets.sfx);

        const at = progress?.player ?? this.level.spawn;
        this.player.attach(this.world, at.x, at.y);
        this.player.facingLeft = at.facingLeft ?? false;

        for (const index of progress?.chests ?? []) {
            const chest = this.level.chests[index];
            if (!chest) continue;
            chest.opened = true;
            chest.sprite.frame = 1;
        }

        this.camera
            .setBounds(0, 0, this.level.width, this.level.height)
            .follow(this.player.pos, { lerp: CAMERA_LERP });

        this.state = STATE.PLAYING;
        std.gc();
    }

    _unload() {
        this.level = null;
        this.world.clear();
        this.camera.unfollow();
        std.gc();
    }

    _interact() {
        const { body } = this.player;

        for (const chest of this.level.chests) {
            if (!chest.opened && Collision.overlaps(body, chest)) this._openChest(chest);
        }

        if (this.state === STATE.PLAYING &&
            this.world.query(body.x + INSET, body.y + INSET, body.w - 2 * INSET, body.h - 2 * INSET, LAYER.DOOR).length > 0) {
            this._nextLevel();
        }
    }

    _openChest(chest) {
        chest.opened = true;
        chest.sprite.frame = 1;
        this.assets.sfx.chests.play();
        this.camera.flash(chest.flash, FLASH_TIME);
        this.player.openingChest = true;
    }

    async _nextLevel() {
        this.state = STATE.TRANSITIONING;
        this.player.canMove = false;

        const next = this.levelIndex + 1;
        const cutscene = CUTSCENES[next];
        const finished = next >= LEVELS.length;

        // The next map is read on a worker while the screen fades out.
        const [, map] = await Promise.all([
            this.camera.fade(FADE_OUT, DOOR_CONFIG.TRANSITION_DELAY),
            cutscene || finished ? null : readMap(next)
        ]);

        this.levelIndex = next;

        if (finished) {
            this.state = STATE.COMPLETED;
            this.bestTime = await Save.saveCompletion(this.playTime);
        } else {
            // Checkpoint at the start of the new level.
            Save.saveProgress(this._progress(false));

            if (cutscene) {
                Scene.push(cutscene, { drawBelow: false });
            } else {
                this._build(map);
                this.camera.fade(FADE_CLEAR, DOOR_CONFIG.FADE_IN);
            }
        }
    }

    _drawOverlay() {
        const font = this.assets.fonts.text;
        const line = (y, text, color) => {
            font.color = color;
            font.print(centeredX(font, text), y, text);
        };

        if (this.state === STATE.COMPLETED) {
            line(180, t("completed"), RED);
            line(220, t("time") + formatTime(this.playTime), WHITE);
            if (this.bestTime !== null) line(245, t("best") + formatTime(this.bestTime), WHITE);
            line(300, t("pressX"), WHITE);
        }
        if (this.state === STATE.GAME_OVER) {
            const { width, height } = this.gameOverSize;

            Draw.rect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT, BLACK);
            this.assets.images.gameOver.draw((SCREEN_WIDTH - width) / 2, (SCREEN_HEIGHT - height) / 2, this.gameOverSize);
            GAME_OVER_OPTIONS.forEach((key, i) => line(300 + i * 30, t(key), i === this.menuSelected ? RED : WHITE));
        }
        if (this.state === STATE.PAUSED) {
            Draw.rect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT, PAUSE_DIM);
            line(140, t("paused"), WHITE);
            PAUSE_OPTIONS.forEach((key, i) => line(220 + i * 30, t(key), i === this.menuSelected ? RED : WHITE));
        }
        if (this.notice) line(400, t(this.notice.key), RED);
    }

    _drawHud() {
        const x = 16 * GAME_SCALE;

        this.hud.draw(x, 0, this.hudSize);
        this.powerup.draw(
            x + 14 * GAME_SCALE,
            this.hudSize.height / 2 + this.powerupSize.height / 4,
            this.powerupSize
        );
    }
}
