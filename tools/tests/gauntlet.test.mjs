// Run with Node 24: node tools/tests/gauntlet.test.mjs
// These tests use the shipped maps and scene/controller code. Native PS2
// graphics, physics and memory-card transports are replaced by bounded stubs.
import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const root = new URL("../../", import.meta.url);
const read = path => fs.readFileSync(new URL(path, root), "utf8");
const json = path => JSON.parse(read(path));
const calls = { pushes: [], goes: [], draws: [], warnings: [] };
let inScreenSpace = false;
let pressed = new Set();
const pad = { justPressed: key => pressed.has(key), pressed: key => pressed.has(key), anyPressed: key => [...pressed].some(k => k & key), anyJustPressed: key => [...pressed].some(k => k & key) };
globalThis.Screen = { getMode: () => ({ width: 640, height: 448 }), alphaEquation: () => 0, clear() {} };
globalThis.Color = { new: (...value) => value.join(",") };
globalThis.Scene = class {
    static busy = false;
    static push(scene, options) { calls.pushes.push({ scene, options }); }
    static go(scene, options) { calls.goes.push({ scene, options }); }
};
globalThis.Gamepad = { player: () => pad, CROSS: 1, SQUARE: 2, TRIANGLE: 4, CIRCLE: 8, START: 16, SELECT: 32, LEFT: 64, RIGHT: 128, UP: 256, DOWN: 512, L1: 1024, L2: 2048 };
globalThis.Font = class {
    constructor() { this.size = 18; }
    getTextSize(text) { return { width: text.length * 8, height: 18 }; }
    print() {}
};
globalThis.System = { bootPath: "./", copyFile() {} };
globalThis.std = { gc() {} };
globalThis.Sound = { setVolume() {}, setSfxVolume() {} };
globalThis.Draw = { rect: (...args) => calls.draws.push({ args, inScreenSpace }) };
globalThis.Thread = { readFileAsync: async path => read(path) };
const cardFiles = new Map();
globalThis.MemoryCard = {
    getInfo: () => ({ connected: true, formatted: true }),
    exists: path => cardFiles.has(path), mkdir: path => cardFiles.set(path, true),
    writeJSONAsync: async (path, data) => cardFiles.set(path, JSON.parse(JSON.stringify(data))),
    readJSONAsync: async path => structuredClone(cardFiles.get(path)),
    removeAsync: async path => cardFiles.delete(path)
};
const overlaps = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
class World {
    constructor() { this.bodies = []; }
    clear() { this.bodies.length = 0; }
    add(options) {
        const world = this;
        const b = {
            type: "static", sensor: false, vx: 0, vy: 0, gravityScale: 1, onGround: false, onWall: 0, valid: true, ...options,
            get right() { return this.x + this.w; }, get bottom() { return this.y + this.h; },
            get centerX() { return this.x + this.w / 2; }, get centerY() { return this.y + this.h / 2; },
            setPosition(x, y) { this.x = x; this.y = y; },
            move(dx, dy) { this.x += dx; this.y += dy; },
            remove() { this.valid = false; world.bodies.splice(world.bodies.indexOf(this), 1); }
        };
        this.bodies.push(b);
        return b;
    }
    query(x, y, w, h, mask) { return this.bodies.filter(b => (!mask || b.layer & mask) && overlaps(b, { x, y, w, h })); }
    solidAt(x, y, mask) { return this.query(x, y, .01, .01, mask).some(b => !b.sensor); }
    raycast() { return null; }
    step(dt) { for (const b of this.bodies) if (b.type === "dynamic") b.move(b.vx * dt, b.vy * dt); }
    drawDebug() {}
}
globalThis.Collision = { World, overlaps };
class Camera {
    constructor() { this.view = { x: 0, y: 0, w: 640, h: 448 }; }
    setBounds(x, y, w, h) { this.bounds = { x, y, w, h }; return this; }
    follow() { return this; }
    visibleRect() { return this.view; }
    makeCurrent() {} unfollow() {} flash() {}
    async fade() {}
}
globalThis.Camera2D = {
    Camera, main: new Camera(),
    screenSpace(fn) { inScreenSpace = true; try { fn(); } finally { inScreenSpace = false; } }
};
globalThis.Sprite = {
    Instance: class {
        constructor(sheet, options = {}) {
            assert.ok(sheet, "a scene registered each sprite sheet before constructing an entity");
            this.sheet = sheet; this.x = this.y = this.frame = 0; this.paused = false; this.events = new Map();
            Object.assign(this, options);
        }
        play(clip) { this.clip = clip; this.paused = false; }
        on(name, cb) { this.events.set(name, cb); }
        stop() { this.paused = true; } pause() { this.paused = true; } resume() { this.paused = false; }
        update() {} draw() {}
    }, drawAll() {}
};
globalThis.TileMap = { Instance: class { constructor(options) { this.options = options; } render() {} }, Descriptor: class {}, SpriteBuffer: { fromObjects: objects => objects } };

const { default: Game, LEVELS } = await import("../../src/scenes/Game.js");
const { Level } = await import("../../src/features/Map/level.js");
const { Save } = await import("../../src/shared/lib/save.js");
const { ShadowKratos } = await import("../../src/features/Enemies/shadowKratos.js");
const { GAME_SCALE: S, LAYER } = await import("../../src/shared/lib/constants.js");
const originalWarn = console.warn;
console.warn = message => calls.warnings.push(message);
process.on("exit", () => { console.warn = originalWarn; });

function image(path) {
    const data = fs.readFileSync(new URL(`assets/${path}`, root));
    return { width: data.readUInt32BE(16), height: data.readUInt32BE(20), lock() {}, draw() {} };
}
function assets() {
    const atlas = Object.entries(json("assets/images/tiles/texture.json").frames);
    const music = Object.fromEntries(Object.keys(Game.assets.music).map(key => {
        let playing = false;
        return [key, { play() { playing = true; }, stop() { playing = false; }, pause() { playing = false; }, playing: () => playing }];
    }));
    return {
        sheets: { ...Object.fromEntries(Object.entries(Game.assets.sheets).filter(([k]) => k !== "atlas").map(([key, value]) => [key, { ...value, image: { lock() {} } }])), atlas: {
            image: { lock() {} }, findFrame: name => atlas.findIndex(([key]) => key === name),
            getFrame: index => { const f = atlas[index][1]; return { ...f.frame, offsetX: f.spriteSourceSize.x, offsetY: f.spriteSourceSize.y }; }
        } },
        images: Object.fromEntries(Object.entries(Game.assets.images).map(([key, path]) => [key, image(path)])),
        fonts: { text: new Font() }, music,
        sfx: Object.fromEntries(Object.keys(Game.assets.sfx).map(key => [key, { play() {}, stop() {} }]))
    };
}
const sharedAssets = assets();
function levelAt(index) {
    const world = new World();
    const level = new Level(json(`src/data/${LEVELS[index]}`), sharedAssets.sheets, world, sharedAssets.sfx, { name: LEVELS[index] });
    return { level, world };
}
async function gameAt(index) {
    pressed.clear();
    const game = new Game();
    game.assets = assets();
    await game.enter(game.assets, { testLevelIndex: index });
    return game;
}
const { GAUNTLET_ROUTE, GauntletClock, formatClock, isNewRecord, previousBest, DEFAULT_BEST } =
    await import("../../src/shared/lib/gauntlet.js");
const { Menu } = await import("../../src/scenes/menu.js");
const target = { x: 50, y: 768, w: 24, h: 24, centerX: 62, centerY: 780, right: 74, bottom: 792 };
const flush = () => new Promise(resolve => setImmediate(resolve));
const broadView = { x: -1000, y: -1000, w: 50000, h: 50000 };

async function gauntlet() {
    pressed.clear();
    const game = new Game();
    game.assets = assets();
    await game.enter(game.assets, { gauntlet: true });
    return game;
}
async function goNext(game) {
    game._nextLevel();
    await flush(); await flush();
}

test("the route follows the original room order and every room exists", () => {
    assert.deepEqual([...GAUNTLET_ROUTE], [
        "BossRush1.json", "FusionGuantlet1.json", "Boss1.json", "FusionGuantlet2.json", "Boss2.json",
        "FusionGuantlet3.json", "BossHall3.json", "ShadowRoom1.json", "ShadowRoom2.json", "FinalBossRoom.json"
    ]);
    for (const file of GAUNTLET_ROUTE) assert.ok(fs.existsSync(new URL(`src/data/${file}`, root)), file);
    for (const file of GAUNTLET_ROUTE.slice(1)) assert.ok(LEVELS.includes(file), `${file} is a campaign room`);
});

test("BossRush1 is the converted original room: spawn, one exit door and the sky colour", () => {
    const map = json("src/data/BossRush1.json");
    assert.equal(map.backgroundColor.toLowerCase(), "#70e6fe");
    assert.deepEqual(map.colliders.door, [576, 368, 16, 32]);
    const spawn = map.layers.flatMap(l => Object.entries(l.tiles)).find(([id]) => id === "spriteKratos");
    assert.deepEqual(spawn[1], [64, 336]);
    assert.equal(map.layers.some(l => "timerBossRush" in l.tiles), false);
});

test("a run builds every room in order without cutscenes, with boss music from BossRush2 and Bastet awake", async () => {
    const warnings = calls.warnings.length;
    const game = await gauntlet();
    assert.equal(game.introCutscene, null);
    assert.equal(game.music, null, "BossRush1 has no music controller");
    assert.equal(game.player.unlockedPowers, 1, "a fresh card has only the Gorgon Head");
    for (let i = 1; i < GAUNTLET_ROUTE.length; i++) {
        game.level.bossReward = null;
        await goNext(game);
        assert.equal(game.levelIndex, i);
        assert.ok(game.music?.playing(), `boss music keeps playing in ${GAUNTLET_ROUTE[i]}`);
        if (GAUNTLET_ROUTE[i] === "BossHall3.json") {
            assert.ok(game.level.bastet.started, "no cutscene gates the Sphinx");
            assert.equal(game.level.bastet.state, "sphinxAttack");
        }
    }
    assert.deepEqual(calls.warnings.slice(warnings), [], "every placement has artwork or an owner");
    assert.equal(calls.pushes.filter(p => p.options?.params?.sequence).length, 0, "no story is pushed");
});

test("weapons come from the card; the campaign unlocks are kept after the ending", async () => {
    assert.equal(Save.weaponsOf(null), 1);
    assert.equal(Save.weaponsOf({ progress: { unlockedPowers: 3 } }), 3);
    assert.equal(Save.weaponsOf({ progress: null, weapons: 4 }), 4);
    await Save.saveProgress({ levelIndex: 8, unlockedPowers: 2 });
    await Save.saveProgress({ levelIndex: 12, unlockedPowers: 3 });
    await Save.saveCompletion(1000);
    const game = await gauntlet();
    assert.equal(game.player.unlockedPowers, 4);
    assert.equal(game.powerupIndex, 0, "SetUpAndGo selects the gorgon head");
    assert.equal(game.player.health, 5);
    cardFiles.clear();
});

test("the clock ticks once per second across rooms and formats as HH:MM:SS", async () => {
    assert.equal(formatClock(0), "00:00:00");
    assert.equal(formatClock(275), "00:04:35");
    assert.equal(formatClock(3661), "01:01:01");
    const clock = new GauntletClock();
    clock.update(0.99); assert.equal(clock.seconds, 0);
    clock.update(0.01); assert.equal(clock.seconds, 1);
    const game = await gauntlet();
    for (let i = 0; i < 60; i++) game.update(1 / 60);
    assert.equal(game.gauntlet.seconds, 1);
    await goNext(game);
    for (let i = 0; i < 120; i++) game.update(1 / 60);
    assert.equal(game.gauntlet.text, "00:00:03");
    game.state = 3; game.update(5);
    assert.equal(game.gauntlet.seconds, 3, "paused time is not counted");
});

test("a fallen boss goes straight to the next room: no weapon card, no story, weapons untouched", async () => {
    const game = await gauntlet();
    game.level.bossReward = null;
    for (let i = 1; i <= 2; i++) await goNext(game);          // BossRush3 = Boss1 (Zeus)
    assert.equal(GAUNTLET_ROUTE[game.levelIndex], "Boss1.json");
    game.level.bossReward = "gotZeusLightning";
    game.update(0);
    assert.notEqual(game.state, 5, "no BOSS_REWARD screen");
    await flush(); await flush();
    assert.equal(GAUNTLET_ROUTE[game.levelIndex], "FusionGuantlet2.json");
    assert.equal(game.player.unlockedPowers, 1, "Zeus does not hand out Lightning in the gauntlet");
});

test("death is final: Try Again restarts at BossRush1 with a fresh clock and full health", async () => {
    const game = await gauntlet();
    await goNext(game);
    for (let i = 0; i < 180; i++) game.update(1 / 60);
    assert.equal(game.gauntlet.seconds, 3);
    game.player.dead = true; game.player.deathDone = true;
    game.update(1 / 60);
    assert.equal(game.state, 4);
    assert.deepEqual(game._menuOptions(), ["tryAgain", "quit"]);
    pressed = new Set([Gamepad.CROSS]);
    game.update(1 / 60);
    pressed.clear();
    await flush(); await flush();
    assert.equal(game.levelIndex, 0);
    assert.equal(game.gauntlet.seconds, 0);
    assert.equal(game.player.dead, false);
    assert.equal(game.player.health, 5);
    assert.equal(game.state, 0);
    // Quit goes back to the menu without touching the record.
    game.player.dead = true; game.player.deathDone = true;
    game.update(1 / 60);
    pressed = new Set([Gamepad.DOWN]); game.update(1 / 60);
    pressed = new Set([Gamepad.CROSS]); const before = calls.goes.length; game.update(1 / 60); pressed.clear();
    assert.equal(calls.goes.length, before + 1);
    assert.equal(calls.goes.at(-1).scene, Menu);
});

test("pausing offers resume or quit, never saving", async () => {
    const game = await gauntlet();
    game.state = 3;
    assert.deepEqual(game._menuOptions(), ["resume", "quit"]);
});

test("the Shadow Kratos defeat ends the run at the totals screen with the record rules of the original", async () => {
    assert.equal(previousBest(undefined), DEFAULT_BEST);
    assert.equal(previousBest(120), 120);
    assert.ok(isNewRecord(599, null));
    assert.ok(!isNewRecord(36000, null), "equal to the default is not a record");
    assert.ok(isNewRecord(100, 200));
    assert.ok(!isNewRecord(200, 200));

    await Save.saveGauntlet(500);
    const game = await gauntlet();
    assert.equal(game.gauntletBest, 500);
    game.levelIndex = GAUNTLET_ROUTE.length - 1;
    game.gauntlet.update(274);
    await game._nextLevel();
    await flush(); await flush();
    assert.equal(game.state, 6);
    assert.equal(game.totals.clock, "00:04:34");
    assert.equal(game.totals.record, true);
    assert.equal(game.music, null, "sound_stop_all");
    // Nothing happens during the 40 step alarm, then any of the four buttons leaves.
    const goes = calls.goes.length;
    pressed = new Set([Gamepad.CROSS]);
    game.update(1.9); assert.equal(calls.goes.length, goes);
    game.update(0.2);
    await flush(); await flush(); await flush();
    pressed.clear();
    assert.equal(calls.goes.length, goes + 1);
    assert.equal(calls.goes.at(-1).scene, Menu);
    assert.equal((await Save.load()).gauntletBest, 274);
    // A slower run keeps the old record.
    await Save.saveGauntlet(900);
    assert.equal((await Save.load()).gauntletBest, 274);
    cardFiles.clear();
});

test("a run slower than the record is not saved as one, and the 275 s developer time is red", async () => {
    await Save.saveGauntlet(100);
    const game = await gauntlet();
    game.levelIndex = GAUNTLET_ROUTE.length - 1;
    game.gauntlet.update(300);
    await game._nextLevel(); await flush(); await flush();
    assert.equal(game.totals.record, false);
    assert.equal(game.totals.previous, 100);
    cardFiles.clear();
});

test("Spazz purrs and refills life and magic once per two seconds", async () => {
    const game = await gauntlet();
    const { level } = levelAtFile("Desert3.json");
    assert.equal(level.spazz.length, 1);
    const cat = level.spazz[0];
    const body = { x: cat.x, y: cat.y, w: 16, h: 16 };
    assert.ok(level.touchSpazz(body));
    assert.equal(level.touchSpazz(body), false, "cooling down");
    level.update(body, 2, broadView);
    assert.ok(level.touchSpazz(body));
    assert.equal(level.touchSpazz({ x: 0, y: 0, w: 4, h: 4 }), false);
    assert.ok(game);
});

function levelAtFile(file) {
    const world = new World();
    const level = new Level(json(`src/data/${file}`), sharedAssets.sheets, world, sharedAssets.sfx, { name: file });
    return { level, world };
}

test("lightning shocks ordinary enemies, stone enemies rubble, and bosses cry out", () => {
    const played = [];
    const sfx = Object.fromEntries(Object.keys(Game.assets.sfx).map(key => [key, { play: () => played.push(key), stop() {} }]));
    const world = new World();
    const level = new Level(json("src/data/Desert3.json"), sharedAssets.sheets, world, sfx, { name: "Desert3.json" });
    const enemy = level.enemies.find(e => !e.constructor.reward && e.hurtbox);
    assert.ok(enemy, "an ordinary enemy exists in Desert3");
    level.strike(enemy.hurtbox, 0, new Set(), "lightning", 0.25);
    assert.equal(level.zaps.zaps.length, 1);
    assert.ok(played.includes("zappyPoo"));
    enemy.petrified = true;
    enemy.health = 0.25;
    played.length = 0;
    level.enemies.includes(enemy) && level.strike(enemy.hurtbox, 0, new Set(), "blade", 1);
    assert.ok(played.includes("rubbled"));
    assert.ok(!played.includes("enemyDie"));
    assert.equal(level.rubble.piles.length, 1, "a rubble pile stays where the stone enemy fell");

    const boss = levelAtFile("Boss1.json").level;
    const zeus = boss.enemies.find(e => e.constructor.reward === "gotZeusLightning");
    for (let i = 0; i < 80 && zeus.state !== "zeus"; i++) boss.update(target, 0.05, broadView);
    played.length = 0;
    boss.sfx = sfx;
    boss.strike(zeus.hurtbox, 0, new Set());
    assert.ok(played.includes("shadowHurt"), "soundZeusOuch");
});

test("every new effect sound file exists next to the others and fits the SPU budget", () => {
    let total = 0;
    for (const [key, path] of Object.entries(Game.assets.sfx)) {
        const file = new URL(`assets/${path}`, root);
        assert.ok(fs.existsSync(file), `${key}: ${path}`);
        total += fs.statSync(file).size;
    }
    assert.ok(total < 1.2 * 1024 * 1024, `${total} bytes of ADPCM`);
});

test("New Game goes straight to the first cutscene: the level is not built (or seen) before it", async () => {
    pressed.clear();
    const game = new Game();
    game.assets = assets();
    const pushes = calls.pushes.length;
    await game.enter(game.assets, {});
    assert.equal(game.level, null, "nothing to draw yet");
    assert.equal(game.introCutscene, "world1");
    game.update(1 / 60);
    assert.equal(calls.pushes.length, pushes + 1);
    assert.equal(calls.pushes.at(-1).options.params.sequence, "world1");
    // When the story ends the level is loaded then.
    await game.resume();
    assert.ok(game.level);
    assert.equal(game.levelIndex, 0);
});

test("jump physics: the original's 46 px apex (no gravity on the frame of the key press) reaches Zeus's ledge", async () => {
    const { PLAYER_MOVEMENT: M, ORIGINAL_HZ } = await import("../../src/shared/lib/constants.js");
    // Discrete original: -9 on the key frame, then gravity .98 before each move.
    let v = -9, y = -9, top = y;
    while (v < 0) { v += .98; y += v; top = Math.min(top, y); }
    const originalApex = -top;                                   // px
    const portApex = M.JUMP_SPEED ** 2 / (2 * M.GRAVITY) / S;   // px
    assert.ok(Math.abs(originalApex - portApex) < 1, `${originalApex} vs ${portApex}`);
    assert.ok(Math.abs(M.SPEED / S / ORIGINAL_HZ - 3) < 1e-9, "3 px per step");
    // Boss1: Kratos on the block at (64, 128) jumps at Zeus standing on the ledge at y=80.
    // Kratos mask rows 1-16, blade rows 5-16, Zeus mask rows 1-16 (bounding boxes of the sprites).
    const kratosTop = 128 - 16 - portApex;
    const blade = [kratosTop + 5, kratosTop + 16], zeus = [64 + 1, 64 + 16];
    assert.ok(blade[0] < zeus[1] && blade[1] > zeus[0], `blade ${blade} vs Zeus ${zeus}`);
});

test("a hit follows the original path (about 32 px sideways, 16 up) instead of a free throw", async () => {
    const { PLAYER_HURT: H, ORIGINAL_HZ } = await import("../../src/shared/lib/constants.js");
    const { SHADOW_PATHS } = await import("../../src/data/shadowPaths.js");
    for (const id of [1, 2]) {
        const p = SHADOW_PATHS[id];
        const dx = p.at(-2) - p[0], dy = p.at(-1) - p[1];
        assert.ok(Math.abs(dx) === 32 && dy === -16, `${id}: ${dx},${dy}`);
    }
    assert.equal(H.PATH_SPEED, 6);
    const game = await gauntlet();
    const player = game.player;
    const x0 = player.body.x;
    player.facingLeft = false;
    player.hurt(player.pos.x + 50, 1);                 // facing right: path 1, pushed left
    for (let i = 0; i < 90; i++) player.update(1 / 60, { pressed: () => false, justPressed: () => false, anyPressed: () => false });
    assert.ok(player.body.x < x0, "pushed left");
    assert.ok(x0 - player.body.x <= 33 * S, `moved ${(x0 - player.body.x) / S} px`);
    assert.ok(Math.abs(ORIGINAL_HZ) > 0);
});

test("striking a petrified walker (whose body die() removes) shatters it without touching the dead body", () => {
    const world = new World();
    const level = new Level(json("src/data/DesertInterior1.json"), sharedAssets.sheets, world, sharedAssets.sfx, { name: "DesertInterior1.json" });
    const enemy = level.enemies.find(e => e.body && !e.constructor.reward);
    assert.ok(enemy, "a walker with a physics body");
    const original = enemy.body;
    Object.defineProperty(original, "x", { configurable: true, get() { if (!this.valid) throw new TypeError("the body was removed from its world"); return this._x; }, set(v) { this._x = v; } });
    original._x = enemy.body.x ?? 0;
    const swing = { x: original.x, y: original.y, w: original.w, h: original.h };   // not the body itself
    level.strike(swing, 0, new Set(), "gorgon");
    assert.equal(enemy.petrified, true);
    level.strike(swing, 0, new Set(), "blade", 1);
    assert.equal(level.enemies.includes(enemy), false);
    assert.equal(level.rubble.piles.length, 1);
});

test("TRIANGLE cycles the unlocked special weapons like the original Z key, wrapping to the Gorgon Head", async () => {
    await Save.saveCompletion(1000);          // all four weapons earned
    const game = await gauntlet();
    assert.equal(game.player.unlockedPowers, 4);
    const seen = [];
    for (let i = 0; i < 5; i++) {
        pressed = new Set([Gamepad.TRIANGLE]);
        game.update(1 / 60);
        pressed.clear();
        game.update(1 / 60);
        seen.push(game.player.selectedPower);
    }
    assert.deepEqual(seen, [1, 2, 3, 0, 1]);
    cardFiles.clear();
});

test("the level select starts a world from its first frames with the weapons of that world, skipping the intro", async () => {
    pressed.clear();
    const game = new Game();
    game.assets = assets();
    await game.enter(game.assets, { skipIntro: true, save: { levelIndex: 11, playTime: 0, player: null, chests: [], resources: null, unlockedPowers: 3, selectedPower: 0 } });
    assert.equal(game.introCutscene, null);
    assert.equal(game.level, null);
    const pushes = calls.pushes.length;
    game.update(1 / 60);
    for (let i = 0; i < 10 && !game.level; i++) await flush();
    assert.ok(game.level);
    assert.equal(game.levelIndex, 11);
    assert.equal(game.player.unlockedPowers, 3);
    assert.equal(calls.pushes.length, pushes, "no story is shown");
});

test("throwing the Hammer near Thor and other enemies never hangs or throws", async () => {
    for (const index of [10, 5, 14]) {
        pressed.clear();
        const game = new Game();
        game.assets = assets();
        await game.enter(game.assets, { testLevelIndex: index });
        game.player.unlockedPowers = 4; game.unlockedPowerups = 4;
        game.player.selectedPower = game.powerupIndex = 2;
        game.player.magic = 5;
        const started = Date.now();
        for (let frame = 0; frame < 900; frame++) {
            pressed = frame % 40 === 1 ? new Set([Gamepad.L2]) : new Set();
            if (frame % 90 === 0) game.player.magic = 5;
            game.update(1 / 60);
            assert.ok(Date.now() - started < 8000, `frame ${frame} of level ${index} is taking too long`);
        }
    }
});

test("invisible blocks outside a room do not enlarge it: no empty row or column in the camera bounds", () => {
    const bastet = levelAtFile("BossHall3.json").level;
    assert.equal(bastet.height, 416 * S, "the Bastet hall ends at its sand row");
    const armada = levelAtFile("ThorArmada1.json").level;
    assert.equal(armada.width, 1088 * S);
});

test("every map is exactly as large as its original room: no empty rows or columns past the tiles", () => {
    const original = {"GaiaArm":"1088x416","OlympusMntI01":"1088x416","OlympusMntClimb":"272x1088","Summit":"1088x416","BossHall1":"272x208","Boss1":"272x208","ThorArmada1":"1088x416","ThorInterior1":"1088x416","ThorArmada2":"1088x416","ThorInterior2":"1088x416","Boss2":"272x208","Desert1":"1088x416","DesertInterior1":"1088x416","Desert2":"1088x416","Desert3":"1088x416","BossHall3":"1088x416","FusionExternal1":"1088x416","FusionGuantlet1":"272x208","FusionExternal2":"1088x416","FusionGuantlet2":"272x208","FusionExternal3":"1088x416","FusionGuantlet3":"272x208","EmptyRoom":"1088x416","ChestRoom":"272x208","BossHallFinal":"272x416","ShadowRoom1":"272x416","ShadowRoom2":"272x416","FinalBossRoom":"272x416","BossRush1":"1088x416"};
    for (const [name, size] of Object.entries(original)) {
        const { level } = levelAtFile(`${name}.json`);
        assert.equal(`${level.width / S}x${level.height / S}`, size, name);
    }
});
