import { Level } from "../features/Map/level.js";
import { Player } from "../features/Player/player.js";
import { PLAYER_CONTROLS as KEY } from "../shared/config/controls.js";
import {
    ASSETS_PATH, DOOR_CONFIG, GAME_SCALE, LAYER, SCREEN_HEIGHT, SCREEN_WIDTH, ORIGINAL_HZ, stepsToSeconds,
    PLAYER_ANIMATIONS as ANIM, PLAYER_MOVEMENT as MOVE
} from "../shared/lib/constants.js";
import { GLYPHS, t } from "../shared/lang/lang.js";
import { Save } from "../shared/lib/save.js";
import { centeredX, formatTime, scaled } from "../shared/lib/ui.js";
import { Menu } from "./menu.js";
import { formatClock as formatClockText } from "../shared/lib/gauntlet.js";
import { Scene02 } from "./scene1-2.js";
import { Scene03 } from "./scene2-1.js";
import { Scene04 } from "./scene2-2.js";
import { SHADOW_SHEETS } from "../features/Enemies/shadowKratos.js";
import { Story, STORY_BEFORE_LEVEL } from "./story.js";
import {
    GAUNTLET_ROUTE, GAUNTLET_MUSIC, GauntletClock, DEVELOPER_TIME, TOTALS_DELAY,
    isNewRecord, previousBest
} from "../shared/lib/gauntlet.js";

export const LEVELS = Object.freeze([
    "GaiaArm.json", "OlympusMntI01.json", "OlympusMntClimb.json",
    "Summit.json", "BossHall1.json", "Boss1.json", "ThorArmada1.json",
    "ThorInterior1.json", "ThorArmada2.json", "ThorInterior2.json",
    "Boss2.json", "Desert1.json", "DesertInterior1.json",
    "Desert2.json", "Desert3.json", "BossHall3.json",
    "FusionExternal1.json", "FusionGuantlet1.json", "FusionExternal2.json", "FusionGuantlet2.json",
    "FusionExternal3.json", "FusionGuantlet3.json", "EmptyRoom.json", "ChestRoom.json",
    "BossHallFinal.json", "ShadowRoom1.json", "ShadowRoom2.json", "FinalBossRoom.json"
]);

const CUTSCENES = Object.freeze({
    5: Scene02,
    6: Scene03,
    10: Scene04
});

const LEVEL_MUSIC = Object.freeze({
    0: "level1", 1: "level1", 2: "level1", 3: "level1", 4: "level1", 5: "boss",
    6: "level2", 7: "level2", 8: "level2", 9: "level2", 10: "boss",
    11: "level3", 12: "level3", 13: "level3", 14: "level3", 15: "boss",
    16: "level4", 17: "level4", 18: "level4", 19: "level4", 20: "level4", 21: "level4",
    25: "boss", 26: "boss", 27: "boss"
});

const STATE = Object.freeze({ PLAYING: 0, TRANSITIONING: 1, COMPLETED: 2, PAUSED: 3, GAME_OVER: 4, BOSS_REWARD: 5, GAUNTLET_TOTALS: 6 });

const HEALTHCOLORS = Object.freeze([
    Color.new(255, 102, 0, 255),
    Color.new(255, 204, 0, 255),
    Color.new(204, 255, 0, 255),
    Color.new(102, 250, 0, 255),
    Color.new(0, 255, 0, 255),
]);

const PAUSE_OPTIONS = Object.freeze(["resume", "saveGame", "quit"]);
const GAME_OVER_OPTIONS = Object.freeze(["restartSave", "saveQuit", "quitNoSave"]);
const TEST_PAUSE_OPTIONS = Object.freeze(["resume", "restartLevel", "testLevels"]);
const TEST_GAME_OVER_OPTIONS = Object.freeze(["restartLevel", "testLevels"]);

const GAUNTLET_PAUSE_OPTIONS = Object.freeze(["resume", "quit"]);
const GAUNTLET_GAME_OVER_OPTIONS = Object.freeze(["tryAgain", "quit"]);

const FADE_OUT = Color.new(0, 0, 0, 128);
const FADE_CLEAR = Color.new(0, 0, 0, 0);
const BLACK = Color.new(0, 0, 0);
const PAUSE_DIM = Color.new(0, 0, 0, 100);
const WHITE = Color.new(255, 255, 255);
const RED = Color.new(255, 0, 0);
const BLUE = Color.new(0, 0, 255, 255);
const NOTICE_TIME = 2;
const BOSS_REWARD_TIME = stepsToSeconds(40);
const FLASH_TIME = 0.1;
const CAMERA_LERP = 8
const INSET = 4;

const grid = { frameWidth: 16, frameHeight: 16 };

const enemy = (name, clips = {}) => ({
    path: `images/enemies/${name}.png`,
    ...grid,
    clips: { idle: "0", walk: { frames: "0-1", fps: 6 }, ...clips }
});

const chest = name => ({ path: `images/objects/${name}.png`, ...grid });

const readMap = async file =>
    JSON.parse(await Thread.readFileAsync(`${ASSETS_PATH.MAPS}/${file}`, { text: true }));

export default class Game extends Scene {
    static root = "assets";

    static assets = {
        images: {
            hud: "images/sprites/kratos/hud.png",
            powerup: "images/sprites/kratos/powerup.png",
            puGorgonHead: "images/sprites/kratos/puGorgonHead.png",
            puHammer: "images/sprites/kratos/puHammer.png",
            puLightning: "images/sprites/kratos/puLightning.png",
            puSpinAttack: "images/sprites/kratos/puSpinAttack.png",
            gameOver: "images/ui/gameOver.png",
            bossRushTotals: "images/ui/bossRushTotals.png",
            gotZeusLightning: "images/ui/gotZeusLightning.png",
            gotMjolnir: "images/ui/gotMjolnir.png",
            gotBladeStorm: "images/ui/gotBladeStorm.png"
        },

        music: {
            level1: { path: "sounds/music/musicLevel1_old.ogg", loop: true },
            level2: { path: "sounds/music/musicLevel2.ogg", loop: true },
            level3: { path: "sounds/music/musicLevel3.wav", loop: true },
            level4: { path: "sounds/music/musicLevel4.wav", loop: true },
            boss: { path: "sounds/music/musicBoss.ogg", loop: true }
        },

        fonts: {
            text: { path: "font/font.ttf", size: 18, preload: GLYPHS }
        },
        sheets: {
            ...SHADOW_SHEETS,
            playerGorgon: { path: "images/objects/playerPowerGorgon.png", frameWidth: 48, frameHeight: 32 },
            playerGorgonLeft: { path: "images/objects/playerPowerGorgonLeft.png", frameWidth: 48, frameHeight: 32 },
            playerLightning: { path: "images/objects/playerPowerLightning.png", ...grid },
            playerHammer: { path: "images/objects/playerPowerHammer.png", ...grid },
            playerHammerLeft: { path: "images/objects/playerPowerHammerLeft.png", ...grid },
            playerSpin: { path: "images/objects/playerPowerSpin.png", frameWidth: 80, frameHeight: 16 },
            bastetStone: { path: "images/enemies/bastetStone.png", frameWidth: 160, frameHeight: 160 },
            bastetFinish: { path: "images/enemies/bastetFinish.png", ...grid },
            bastetFall: { path: "images/enemies/bastetFall.png", ...grid },
            bastetStunned: { path: "images/enemies/bastetStunned.png", ...grid },
            atlas: "images/tiles/texture.json",
            bgCloud: {
                path: "images/tiles/bgCloud.png",
                frameWidth: 48,
                frameHeight: 16
            },
            bgSphinx: { path: "images/tiles/bgSphinx.png", frameWidth: 32, frameHeight: 32 },
            spazz: { path: "images/enemies/spazz.png", frameWidth: 32, frameHeight: 16 },
            bgGreyCloud: {
                path: "images/tiles/bgGreyCloud.png",
                frameWidth: 48,
                frameHeight: 16
            },
            bgPyramid: {
                path: "images/tiles/bgPyramid.png",
                frameWidth: 256,
                frameHeight: 256
            },
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

                clips: { swing: { frames: "0-4", fps: ORIGINAL_HZ, mode: "once" } }
            },
            torch: {
                path: "images/objects/spriteTorch.png",
                ...grid,
                clips: { burn: { frames: "0-5", fps: 12 } }
            },
            lifeChest: chest("obLifeChest"),
            magicChest: chest("obMagicChest"),
            harpie: enemy("enHarpie", { idle: "2", fly: { frames: "0-1", fps: 8 } }),
            dragon: enemy("enDragon", { idle: "0", fly: { frames: "0-1", fps: 8 } }),
            scarab: enemy("enScarab", { idle: "0", fly: { frames: "0-1", fps: 8 } }),
            minotaur: enemy("enMinotaur", { run: { frames: "2-3", fps: 12 } }),
            spearman: enemy("enSpearman", { run: { frames: "2-3", fps: 12 } }),
            anubis: enemy("enAnubis", { run: { frames: "2-3", fps: 12 } }),
            skelbow: enemy("enSkelbow", { shoot: { frames: "0-1", fps: 4, mode: "once" } }),
            vbow: enemy("enVbow", { shoot: { frames: "0-1", fps: 6, mode: "once" } }),
            scorpion: enemy("enScorpion", { shoot: { frames: "0-1", fps: 6, mode: "once" } }),
            arrow: {
                path: "images/objects/arrow.png",
                frameWidth: 10,
                frameHeight: 3,
                clips: { fly: "0" }
            },
            scorpionSpike: {
                path: "images/objects/scorpionSpike.png",
                ...grid,
                clips: { fly: { frames: "0-1", fps: 12 } }
            },

            zeus: { path: "images/enemies/zeusBody.png", ...grid, clips: { idle: "0" } },
            zeusTransportBoss: {
                path: "images/enemies/zeusTransportBoss.png", frameWidth: 32, frameHeight: 16,
                clips: { transport: { frames: "0-1", fps: ORIGINAL_HZ } }
            },
            zeusLightningLeft: { path: "images/enemies/zeusLightningLeft.png", ...grid, clips: { fly: { frames: "0-1", fps: ORIGINAL_HZ } } },
            zeusLightningRight: { path: "images/enemies/zeusLightningRight.png", ...grid, clips: { fly: { frames: "0-1", fps: ORIGINAL_HZ } } },
            thor: { path: "images/enemies/thorBody.png", ...grid, clips: { idle: "0" } },
            thorHammerLeft: { path: "images/enemies/thorHammerLeft.png", ...grid, clips: { fly: { frames: "0-3", fps: 100 } } },
            thorHammerRight: { path: "images/enemies/thorHammerRight.png", ...grid, clips: { fly: { frames: "0-3", fps: 100 } } },
            bastet: {
                path: "images/enemies/bossBastet.png",
                ...grid,
                clips: {
                    idle: "11",
                    die: { frames: "0-4", mode: "once" },
                    attack: { frames: "5-6", fps: 4 },
                    stunning: "7-8",
                    fall: "9",
                    move: "10-11",
                    walk: { frames: "10-11", fps: 3 }
                }
            },
            sphinx: {
                path: "images/enemies/sphinx.png",
                frameWidth: 128,
                frameHeight: 128,
                clips: {
                    idle: "0",
                    hit: { frames: "1-2", fps: 48 },
                    stunning: "3",
                    attack: { frames: "4-7", fps: 3 }
                }
            },
            sphinxDeath: {
                path: "images/enemies/sphinx2.png",
                frameWidth: 160,
                frameHeight: 160,
                clips: { die: { frames: "0-11", mode: "once" } }
            },
            fireAttack: {
                path: "images/objects/fireAttack.png",
                frameWidth: 64,
                frameHeight: 96,
                clips: { burn: { frames: "0-1", fps: 4 } }
            },
            bastAttack: {
                path: "images/objects/bastAttack.png",
                frameWidth: 32,
                frameHeight: 128,
                clips: { attack: { frames: "0-1", fps: 4 } }
            },
            thunderAttack: {
                path: "images/objects/thunderAttack.png",
                frameWidth: 32,
                frameHeight: 32,
                clips: { spin: { frames: "0-1", fps: 4 } }
            },
            dizzyStar: {
                path: "images/vfx/dizzyStar.png",
                ...grid,
                clips: { spin: { frames: "0-1", fps: 24 } }
            },
            undead: enemy("enUndead"),
            vsoldier: enemy("enVsoldier"),
            mummy: enemy("enMummy"),
            blood: {
                path: "images/vfx/blood.png",
                ...grid,
                clips: { splash: "0" }
            },

            rubbled: {
                path: "images/vfx/rubbled.png",
                ...grid,
                clips: { fall: { frames: "0-2", fps: ORIGINAL_HZ, mode: "once" } }
            },
            rubbleExplode: {
                path: "images/vfx/rubbleExplode.png",
                ...grid,
                clips: { fall: { frames: "0-3", fps: ORIGINAL_HZ, mode: "once" } }
            },
            stones: { path: "images/enemies/stones.png", ...grid, clips: { idle: "0" } },

            zapped: {
                path: "images/vfx/zapped.png",
                ...grid,
                clips: { zap: { frames: "0-1", fps: .9 * ORIGINAL_HZ } }
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
            minotaurDie: "sounds/sfx/soundMinotaur.adp",
            lightning: "sounds/sfx/lightning.adp",
            hammer: "sounds/sfx/hammer.adp",
            spin: "sounds/sfx/spin.adp",
            gorgon: "sounds/sfx/gorgon.adp",
            shadowSpin: "sounds/sfx/shadowSpin.adp",
            shadowHurt: "sounds/sfx/shadowHurt.adp",
            shadowDefeat: "sounds/sfx/shadowDefeat.adp",
            shadowHammer: "sounds/sfx/shadowHammer.adp",
            bastetStone: "sounds/sfx/bastetStone.adp",
            bastetFinish: "sounds/sfx/bastetFinish.adp",
            weaponSelect: "sounds/sfx/weaponSelect.adp",
            weaponGet: "sounds/sfx/weaponGet.adp",
            pause: "sounds/sfx/pause.adp",
            blockArrows: "sounds/sfx/blockArrows.adp",
            rubbled: "sounds/sfx/rubbled.adp",
            thorDizzy: "sounds/sfx/thorDizzy.adp",
            bastetGrunt: "sounds/sfx/bastetGrunt.adp",
            bastetTornado: "sounds/sfx/bastetTornado.adp",
            bastetFire: "sounds/sfx/bastetFire.adp",
            spazz: "sounds/sfx/spazz.adp",
            zappyPoo: "sounds/sfx/zappyPoo.adp",
            windWaves: "sounds/sfx/windWaves.adp",
            newRecord: "sounds/sfx/newRecord.adp"
        }
    };

    async enter(assets, params) {
        const { images, sheets } = assets;
        const testIndex = params?.testLevelIndex;
        this.testMode = Number.isInteger(testIndex) && testIndex >= 0 && testIndex < LEVELS.length;
        const progress = this.testMode ? null : params?.save ?? null;
        this.gauntlet = !this.testMode && params?.gauntlet ? new GauntletClock() : null;
        this.route = this.gauntlet ? GAUNTLET_ROUTE : LEVELS;
        this.gauntletWeapons = 1;
        this.gauntletBest = null;
        if (this.gauntlet) {
            const saved = await Save.load();
            this.gauntletWeapons = Save.weaponsOf(saved);
            this.gauntletBest = saved?.gauntletBest ?? null;
        }

        sheets.atlas.image.lock();
        sheets.kratos.image.lock();
        sheets.blade.image.lock();

        this.hud = images.hud;
        this.powerup = images.powerup;

        this.powerupIndex = 0;
        this.unlockedPowerups = 1;
        this.powerups = [
            images.puGorgonHead,
            images.puLightning,
            images.puHammer,
            images.puSpinAttack
        ];

        this.powerupSize = scaled(images.powerup, GAME_SCALE);
        this.hudSize = scaled(images.hud, GAME_SCALE);
        this.powerupSize = scaled(images.powerup, GAME_SCALE);
        this.gameOverSize = scaled(images.gameOver, GAME_SCALE);
        this.drawHud = () => { this._drawHud(); this._drawOverlay(); };

        this.world = new Collision.World({ gravity: { x: 0, y: MOVE.GRAVITY }, autoStep: false });
        this.camera = new Camera2D.Camera({ current: true });
        this.player = new Player(assets);

        this.level = null;
        this.levelIndex = this.testMode ? testIndex : progress && Number.isInteger(progress.levelIndex)
            ? Math.min(Math.max(progress.levelIndex, 0), LEVELS.length - 1) : 0;
        this.playTime = progress ? progress.playTime : 0;
        this.bestTime = null;
        this.notice = null;
        this.bossReward = null;
        this.state = STATE.PLAYING;
        this.menuSelected = 0;
        this.saving = false;

        this.introCutscene = this.testMode || this.gauntlet || params?.skipIntro ? null : this._cutsceneFor(this.levelIndex);
        this.resumeProgress = this.introCutscene ? progress : null;

        if (this.introCutscene) return;

        if (!this.testMode && !this.gauntlet) {
            this.pendingBuild = { progress };
            return;
        }
        this._build(await readMap(this._file(this.levelIndex)), progress);
    }

    async _buildPending() {
        const { progress } = this.pendingBuild;
        this.pendingBuild = null;
        const map = await readMap(this._file(this.levelIndex));
        this._build(map, progress);
        this.camera.fade(FADE_CLEAR, DOOR_CONFIG.FADE_IN);
    }

    _file(index) { return this.route[index]; }

    update(dt) {
        if (!this.level && this.pendingBuild) {
            this._buildPending();
            return;
        }
        if (!this.level && this.introCutscene) {
            if (!Scene.busy) {
                const cutscene = this.introCutscene;
                this.introCutscene = null;
                this._pushCutscene(cutscene);
            }
            return;
        }
        if (!this.level) return;
        if (this.state === STATE.TRANSITIONING) {
            this.gauntlet?.update(dt);
            return;
        }

        if (this.state === STATE.BOSS_REWARD) {
            if ((this.bossReward.time -= dt) <= 0) {
                this.bossReward = null;
                this._nextLevel();
            }
            return;
        }

        if (this.state === STATE.GAUNTLET_TOTALS) {
            this._updateTotals(dt);
            return;
        }

        if (this.introCutscene) {
            if (!Scene.busy) {
                const cutscene = this.introCutscene;
                this.introCutscene = null;
                this._pushCutscene(cutscene);
            }
            return;
        }

        const pad = Gamepad.player(0);

        if (this.state === STATE.PLAYING && !this.player.dead && pad.justPressed(KEY.NEXT_POWER) && this.unlockedPowerups > 0) {
            this.powerupIndex++;

            if (this.powerupIndex >= this.unlockedPowerups) {
                this.powerupIndex = 0;
            }
            this.player.selectedPower = this.powerupIndex;
            this.assets.sfx.weaponSelect?.play();
        }

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
            this.gauntlet?.update(dt);
            if (this.player.deathDone) {
                this._stopLoops();
                this.state = STATE.GAME_OVER;
                this.menuSelected = 0;
                return;
            }
            if (pad.justPressed(Gamepad.START) && !this.player.dead) {
                this.player.powers?.stopAura();
                this._stopLoops();
                this.assets?.sfx.pause?.play();
                this.state = STATE.PAUSED;
                this.menuSelected = 0;
                return;
            }
        }

        if (pad.justPressed(KEY.INTERACT)) this._interact();

        const boss = this.level.bastet;
        if (this.state === STATE.PLAYING && !this.player.dead && boss?.shouldStart(this.player.body)) {
            if (!this.testMode && this.assets) {
                this.inlineStory = "bastet";
                Scene.push(Story, { params: { sequence: "bastet" }, drawBelow: false });
                return;
            }
            boss.start();
        }

        const marker = this.level.markers?.startCutscene?.[0];
        if (this.state === STATE.PLAYING && !this.player.dead && !this.gauntlet && this.levelIndex === 24 && marker && this.player.body.centerX >= marker.x) {
            this._nextLevel();
            return;
        }

        if (this.level.bastet?.state === "defeated") this.player.magic = 5;

        this.player.body.dead = this.player.dead;
        const view = this.camera.visibleRect();
        this.level.update(this.player.body, dt, view);

        const intro = this.level.enemies.some(e => e.introActive);
        if (intro !== this.introLocked) {
            this.introLocked = intro;
            this.player.canMove = !intro;
        }
        if (this.state === STATE.PLAYING && !this.player.dead && this.level.touchSpazz(this.player.body)) {
            this.player.health = 5;
            this.player.magic = 5;
        }
        if (this.state === STATE.PLAYING && this.level.bossReward) {
            const reward = this.level.bossReward;
            this.level.bossReward = null;

            if (this.gauntlet || reward === "shadowStageComplete") {
                this._nextLevel();
                return;
            }
            this.unlockedPowerups = Math.max(this.unlockedPowerups, reward === "gotZeusLightning" ? 2 : reward === "gotMjolnir" ? 3 : 4);
            this.player.unlockedPowers = this.unlockedPowerups;
            this.player.selectedPower = this.powerupIndex = this.unlockedPowerups - 1;
            const image = this.assets.images[reward];
            this.player.powers?.stopAura();
            this.bossReward = { image, size: scaled(image, GAME_SCALE), time: BOSS_REWARD_TIME };
            this.assets.sfx.weaponGet?.play();
            this.state = STATE.BOSS_REWARD;
            this.player.canMove = false;
            this.player.body.vx = 0;
            this.player.body.vy = 0;
            return;
        }
        if (this.player.powers) this.player.powers.view = view;
        this.player.update(dt, pad, view);

        const attackHitboxes = this.player.attackHitboxes;
        if (attackHitboxes) {
            for (const hit of attackHitboxes) this.level.strike(hit.box, hit.sourceX, hit.struck, hit.kind, hit.damage);
        } else {
            const hitbox = this.player.hitbox;
            if (hitbox) this.level.strike(hitbox, this.player.pos.x, this.player.struck);
        }

        if (this.state === STATE.PLAYING && (this.player.vulnerable || this.player.defending || this.level.bastet)) {
            const fromX = this.level.hitPlayer(this.player.body, this.player.defending, this.player.facingLeft);
            if (fromX !== null) this.player.hurt(fromX, this.level.lastHitDamage, this.level.lastHitPierces);
        }
    }

    draw() {
        if (!this.level) {
            Screen.clear(BLACK);
            return;
        }

        Screen.clear(this.level.background);
        this.level.render(this.camera, () => this.player.draw());

        Camera2D.screenSpace(this.drawHud);
    }

    _progress(midLevel) {
        const chests = [];
        if (midLevel) this.level.chests.forEach((c, i) => { if (c.opened) chests.push(i); });

        return {
            levelIndex: this.levelIndex,
            playTime: this.playTime,
            player: midLevel ? { ...this.player.origin, facingLeft: this.player.facingLeft } : null,
            chests,
            resources: midLevel ? { health: this.player.health, magic: this.player.magic } : null,
            unlockedPowers: this.unlockedPowerups,
            selectedPower: this.powerupIndex
        };
    }

    _playLevelMusic() {
        const name = (this.gauntlet ? GAUNTLET_MUSIC : LEVEL_MUSIC)[this.levelIndex];

        if (!name) {
            this.music?.stop();
            this.music = null;
            return;
        }

        const music = this.assets.music[name];

        if (this.music === music) {
            if (!music.playing()) music.play();
            return;
        }

        this.music?.stop();
        this.music = music;

        music.play();
    }

    _menuOptions() {
        const paused = this.state === STATE.PAUSED;
        if (this.gauntlet) return paused ? GAUNTLET_PAUSE_OPTIONS : GAUNTLET_GAME_OVER_OPTIONS;
        if (this.testMode) return paused ? TEST_PAUSE_OPTIONS : TEST_GAME_OVER_OPTIONS;
        return paused ? PAUSE_OPTIONS : GAME_OVER_OPTIONS;
    }

    _updateMenu(pad) {
        if (this.saving) return;

        const paused = this.state === STATE.PAUSED;
        if (paused && pad.justPressed(Gamepad.START)) return this._resume();

        const options = this._menuOptions();
        const previous = this.menuSelected;
        if (pad.justPressed(Gamepad.UP)) this.menuSelected--;
        if (pad.justPressed(Gamepad.DOWN)) this.menuSelected++;
        this.menuSelected = Math.min(Math.max(this.menuSelected, 0), options.length - 1);
        if (previous !== this.menuSelected) this.assets.sfx.selector?.play();

        if (!pad.justPressed(Gamepad.CROSS)) return;
        const option = options[this.menuSelected];
        if (option === "resume") this._resume();
        else if (option === "saveGame") this._saveGame();
        else if (option === "tryAgain") this._restartGauntlet();
        else if (option === "restartSave" || option === "restartLevel") this._restartFromSave();
        else if (option === "saveQuit") this._saveAndQuit();
        else Scene.go(Menu, { params: this.testMode ? { testLevelIndex: this.levelIndex } : {} });
    }

    async _restartFromSave() {
        this.saving = true;
        const data = this.testMode ? null : await Save.load();
        const progress = data?.progress ?? null;
        const index = progress ? progress.levelIndex : this.levelIndex;
        const map = await readMap(this._file(index));

        this.saving = false;
        this.levelIndex = index;
        if (progress) this.playTime = progress.playTime;
        this.player.revive();
        this._build(map, progress);
    }

    async _saveAndQuit() {
        this.saving = true;
        const saved = await Save.saveProgress(this._progress(false));
        this.saving = false;

        if (saved) Scene.go(Menu);
        else this.notice = { key: "saveFailed", time: NOTICE_TIME };
    }

    _resume() {
        this.state = STATE.PLAYING;
        if (this.level.enemies.some(e => e.state === "spinning")) this.assets.sfx.shadowSpin?.play();
        if (this.level.bastet?.firing) this.assets.sfx.bastetFire?.play();
    }

    async _saveGame() {
        this.saving = true;
        const saved = await Save.saveProgress(this._progress(true));
        this.saving = false;
        this.notice = { key: saved ? "gameSaved" : "saveFailed", time: NOTICE_TIME };
    }

    pause() {
        this.player.powers?.stopAura();
        this.music?.pause();
        if (!this.inlineStory && !this.endingStory) this._unload();
        Camera2D.main.makeCurrent();
    }

    async resume() {
        this.camera.makeCurrent();
        if (this.inlineStory) {
            this.inlineStory = null;
            this.level.bastet?.start();
            this.music?.play();
            return;
        }
        if (this.endingStory) {
            this.endingStory = false;
            this.state = STATE.COMPLETED;
            this.camera.fade(FADE_CLEAR, DOOR_CONFIG.FADE_IN);
            return;
        }
        const progress = this.resumeProgress;
        this.resumeProgress = null;
        this._build(await readMap(this._file(this.levelIndex)), progress);
        this.camera.fade(FADE_CLEAR, DOOR_CONFIG.FADE_IN);
    }

    exit() {
        this.player.powers?.clear();
        this._stopLoops();
        this._unload();
        this.music?.stop();
        this.music = null;

        Camera2D.main.makeCurrent();
    }

    _build(map, progress = null) {
        this.bossReward = null;
        this.introLocked = false;
        this._stopLoops();
        this.world.clear();
        this.level = new Level(map, this.assets.sheets, this.world, this.assets.sfx, { name: this._file(this.levelIndex) });

        const at = progress?.player ?? this.level.spawn;
        this.player.attach(this.world, at.x, at.y);
        this.player.setBounds(this.level.width, this.level.height);
        this.player.facingLeft = at.facingLeft ?? false;

        const inferred = this.gauntlet ? this.gauntletWeapons
            : this.levelIndex >= 16 ? 4 : this.levelIndex >= 11 ? 3 : this.levelIndex >= 6 ? 2 : 1;
        this.unlockedPowerups = Math.max(inferred, Math.min(4, progress?.unlockedPowers ?? this.unlockedPowerups ?? 1));
        this.powerupIndex = Math.min(this.unlockedPowerups - 1, Math.max(0, progress?.selectedPower ?? this.powerupIndex ?? 0));
        this.player.unlockedPowers = this.unlockedPowerups;
        this.player.selectedPower = this.powerupIndex;
        if (progress?.resources) {
            this.player.health = Math.max(0.25, Math.min(5, Number(progress.resources.health) || 5));
            this.player.magic = Math.max(0, Math.min(5, Number(progress.resources.magic) || 0));
        }

        for (const index of progress?.chests ?? []) {
            const chest = this.level.chests[index];
            if (!chest) continue;
            chest.opened = true;
            chest.sprite.frame = 1;
        }

        this.camera
            .setBounds(0, 0, this.level.width, this.level.height)
            .follow(this.player.pos, { lerp: CAMERA_LERP, deadzone: { w: 0, h: 96 } });

        this.state = STATE.PLAYING;

        if (this.gauntlet) this.level.bastet?.start();

        this._playLevelMusic();

        if (!this.gauntlet && this._file(this.levelIndex) === "EmptyRoom.json") this.assets.sfx.windWaves?.play();
        std.gc();
    }

    _stopLoops() {
        this.assets.sfx.shadowSpin?.stop();
        this.assets.sfx.bastetFire?.stop();
        this.assets.sfx.windWaves?.stop();
    }

    _unload() {
        this.player.powers?.clear();
        this._stopLoops();
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

        if (this.state === STATE.PLAYING && !this.player.dead && !this.level.exitLocked &&
            this.world.query(body.x + INSET, body.y + INSET, body.w - 2 * INSET, body.h - 2 * INSET, LAYER.DOOR).length > 0) {
            this._nextLevel();
        }
    }

    _openChest(chest) {
        chest.opened = true;

        if(chest.type === "life") this.player.health = 5;
        else this.player.magic = 5;

        chest.sprite.frame = 1;
        this.assets.sfx.chests.play();
        this.camera.flash(chest.flash, FLASH_TIME);
        this.player.openingChest = true;
    }

    async _nextLevel() {
        if (this.state !== STATE.PLAYING && this.state !== STATE.BOSS_REWARD) return;
        this.state = STATE.TRANSITIONING;
        this.player.canMove = false;

        if (this.testMode) {
            await this.camera.fade(FADE_OUT, DOOR_CONFIG.TRANSITION_DELAY);
            Scene.go(Menu, { params: { testLevelIndex: this.levelIndex } });
            return;
        }

        if (this.gauntlet) return this._nextGauntletRoom();

        const next = this.levelIndex + 1;
        const cutscene = this._cutsceneFor(next);
        const finished = next >= LEVELS.length;

        const [, map] = await Promise.all([
            this.camera.fade(FADE_OUT, DOOR_CONFIG.TRANSITION_DELAY),
            cutscene || finished ? null : readMap(this._file(next))
        ]);

        this.levelIndex = next;

        if (finished) {
            this.state = STATE.COMPLETED;
            this.bestTime = await Save.saveCompletion(this.playTime);
            this.music?.stop();
            this.endingStory = true;
            Scene.push(Story, { params: { sequence: "ending" }, drawBelow: false });
        } else {

            Save.saveProgress(this._progress(false));

            if (cutscene) {
                this._pushCutscene(cutscene);
            } else {
                this._build(map);
                this.camera.fade(FADE_CLEAR, DOOR_CONFIG.FADE_IN);
            }
        }
    }

    async _nextGauntletRoom() {
        const next = this.levelIndex + 1;
        const finished = next >= this.route.length;
        const [, map] = await Promise.all([
            this.camera.fade(FADE_OUT, DOOR_CONFIG.TRANSITION_DELAY),
            finished ? null : readMap(this._file(next))
        ]);
        this.levelIndex = next;
        if (finished) return this._showTotals();
        this._build(map);
        this.camera.fade(FADE_CLEAR, DOOR_CONFIG.FADE_IN);
    }

    _showTotals() {
        this.state = STATE.GAUNTLET_TOTALS;
        this.camera.fade(FADE_CLEAR, DOOR_CONFIG.FADE_IN);
        this._stopLoops();
        this.music?.stop();
        this.music = null;
        this.player.powers?.stopAura();
        this.totals = {
            seconds: this.gauntlet.seconds,
            clock: this.gauntlet.text,
            previous: previousBest(this.gauntletBest),
            record: isNewRecord(this.gauntlet.seconds, this.gauntletBest),
            wait: TOTALS_DELAY,
            leaving: false
        };
        this.assets.sfx[this.totals.record ? "newRecord" : "weaponGet"]?.play();
    }

    async _updateTotals(dt) {
        const totals = this.totals;
        totals.wait = Math.max(0, totals.wait - dt);
        if (totals.wait > 0 || totals.leaving) return;
        const pad = Gamepad.player(0);

        const any = KEY.JUMP | KEY.ATK | KEY.NEXT_POWER | KEY.SPECIAL;
        if (!pad.anyJustPressed(any)) return;
        totals.leaving = true;
        if (totals.record) await Save.saveGauntlet(totals.seconds);
        Scene.go(Menu, { params: {} });
    }

    async _restartGauntlet() {
        this.saving = true;
        const map = await readMap(this._file(0));
        this.saving = false;
        this.levelIndex = 0;
        this.gauntlet.reset();
        this.player.revive();
        this.powerupIndex = 0;
        this._build(map);
    }

    _cutsceneFor(index) {
        return STORY_BEFORE_LEVEL[index] ?? CUTSCENES[index] ?? null;
    }

    _pushCutscene(cutscene) {
        if (typeof cutscene === "string") Scene.push(Story, { params: { sequence: cutscene }, drawBelow: false });
        else Scene.push(cutscene, { drawBelow: false });
    }

    _drawOverlay() {
        if (this.state === STATE.BOSS_REWARD) {
            const { image, size } = this.bossReward;
            Draw.rect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT, BLACK);
            image.draw((SCREEN_WIDTH - size.width) / 2, (SCREEN_HEIGHT - size.height) / 2, size);
            return;
        }

        const font = this.assets.fonts.text;
        if (this.state === STATE.GAUNTLET_TOTALS) {
            const { clock, previous, record, seconds } = this.totals;
            const x = 22 * GAME_SCALE + (SCREEN_WIDTH - 272 * GAME_SCALE) / 2;
            const y = row => row * GAME_SCALE + (SCREEN_HEIGHT - 208 * GAME_SCALE) / 2;
            const art = this.assets.images.bossRushTotals;
            const size = scaled(art, GAME_SCALE);
            Draw.rect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT, BLACK);
            art.draw((SCREEN_WIDTH - size.width) / 2, (SCREEN_HEIGHT - size.height) / 2, size);
            font.color = seconds < DEVELOPER_TIME ? RED : WHITE;
            font.print(x, y(80), t("gauntletTime") + clock);
            font.color = WHITE;
            font.print(x, y(90), t("gauntletPrevious") + formatClockText(previous));
            if (record) font.print(x + 70 * GAME_SCALE, y(130), t("newRecord"));
            return;
        }
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

            const top = this.gauntlet ? 110 * GAME_SCALE + (SCREEN_HEIGHT - 208 * GAME_SCALE) / 2 : 300;
            const gap = this.gauntlet ? 10 * GAME_SCALE : 30;
            this._menuOptions().forEach((key, i) => line(top + i * gap, t(key), i === this.menuSelected ? RED : WHITE));
            this.music?.stop();
        }
        if (this.state === STATE.PAUSED) {
            Draw.rect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT, PAUSE_DIM);
            line(140, t("paused"), WHITE);
            this._menuOptions().forEach((key, i) => line(220 + i * 30, t(key), i === this.menuSelected ? RED : WHITE));
        }
        if (this.notice) line(400, t(this.notice.key), RED);
    }

    _drawHud() {
        const x = 16 * GAME_SCALE;
        const health = Math.max(0, Math.min(5, this.player.health));
        const healthWidth = health * 20;
        const magicWidth = Math.max(0, Math.min(5, this.player.magic)) * 20;

        this.hud.draw(x, 0, this.hudSize);

        const powerup = this.powerups[this.powerupIndex];

        if (powerup) {
            powerup.draw(
                x + 14 * GAME_SCALE,
                this.hudSize.height / 2 + this.powerupSize.height / 4,
                this.powerupSize
            );
        }

        Draw.rect(x + 92, 36, 104, 8, BLACK);
        Draw.rect(x + 92, 46, 104, 8, BLACK);

        if (healthWidth > 0) {
            let healthColor = HEALTHCOLORS[Math.max(0, Math.ceil(health) - 1)];
            Draw.rect(x + 94, 38, healthWidth, 4, healthColor);
        }

        if (magicWidth > 1) {
            Draw.rect(x + 94, 48, magicWidth, 4, BLUE);
        }

        const boss = this.level.enemies.find(e => e.constructor.reward && (e.started !== false || e.healthBarVisible));
        if (boss) {
            const ratio = Math.max(0, Math.min(1, boss.health / boss.constructor.health));
            Draw.rect(392, 36, 104, 8, BLACK);
            if (ratio > 0) Draw.rect(394, 38, ratio * 100, 4, RED);
        }
        if (this.gauntlet) {
            const font = this.assets.fonts.text;
            const text = this.gauntlet.text;
            const at = centeredX(font, text);
            const base = 190 * GAME_SCALE + (SCREEN_HEIGHT - 208 * GAME_SCALE) / 2;
            font.color = BLACK;
            font.print(at + 1, base + 1, text);
            font.color = WHITE;
            font.print(at, base, text);
        }
        const prompt = this.level.bastet?.state === "defeated" ? "useGorgon"
            : this.level.bastet?.state === "finishReady" ? "finishBlade" : this.level.exitLocked ? "defeatWave" : null;
        if (prompt) {
            const font = this.assets.fonts.text;
            font.color = WHITE;
            font.print(centeredX(font, t(prompt)), SCREEN_HEIGHT - 28, t(prompt));
        }
    }
}
