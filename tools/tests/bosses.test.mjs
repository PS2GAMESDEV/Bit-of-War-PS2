// Run with Node 24: node tools/tests/bosses.test.mjs
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
const { Zeus } = await import("../../src/features/Enemies/zeus.js");
const { Thor } = await import("../../src/features/Enemies/thor.js");
const broadView = { x: -1000, y: -1000, w: 50000, h: 50000 };
const STEP = 1 / 20;
const target = { x: 64, y: 330 * S, w: 24, h: 24, centerX: 76, centerY: 800, right: 100, bottom: 824 };
const sfxLog = [];
const sfx = new Proxy({}, { get: (_, key) => ({ play: () => sfxLog.push(key), stop() {} }) });
const levelOf = file => {
    const world = new World();
    return { world, level: new Level(json(`src/data/${file}`), sharedAssets.sheets, world, sfx, { name: file }) };
};
const tick = (level, steps = 1) => { for (let i = 0; i < steps; i++) level.update(target, STEP, broadView); };
const blade = (level, boss) => level.strike(boss.hurtbox ?? boss.body, 0, new Set());
const zeusOf = level => level.enemies.find(e => e instanceof Zeus);
const thorOf = level => level.enemies.find(e => e instanceof Thor);

test("Zeus floats up along path 18 while Kratos is held, then starts the fight at zeusMove1", () => {
    const { level } = levelOf("Boss1.json");
    const zeus = zeusOf(level);
    assert.equal(zeus.introActive, true);
    assert.equal(zeus.hurtbox, null);
    tick(level, 3);
    assert.ok(zeus.body.y < 144 * S, "rising");
    for (let i = 0; i < 80 && zeus.introActive; i++) tick(level);
    assert.equal(zeus.state, "zeus");
    const m = level.markers.zeusMove1[0];
    assert.deepEqual([zeus.body.x, zeus.body.y], [m.x, m.y]);
    assert.ok(zeus.hurtbox);
    assert.equal(zeus.contactBox, null, "Zeus has no harmful body");
    assert.equal(level.hitPlayer(zeus.body), null);
});

test("Zeus fires at steps 30/60/90 and transports at 120, and shoots faster at 40 health or less", () => {
    const { level } = levelOf("Boss1.json");
    const zeus = zeusOf(level);
    for (let i = 0; i < 80 && zeus.introActive; i++) tick(level);
    const fired = [];
    const spawn = zeus._spawnProjectile.bind(zeus);
    zeus._spawnProjectile = (...args) => { fired.push(zeus.stateTicks); spawn(...args); };
    for (let step = 1; step <= 120; step++) tick(level);
    assert.deepEqual(fired, [30, 30, 30, 60, 60, 90, 90, 90], "3, 2 and 3 bolts at the three alarms");
    assert.equal(zeus.state, "transporting", "alarm 3 at step 120");
    // Reappears on the other side at the same height and restarts the schedule.
    for (let i = 0; i < 40 && zeus.state === "transporting"; i++) tick(level);
    assert.equal(zeus.state, "zeus");
    assert.equal(zeus.body.y, level.markers.zeusMove1[0].y);
    assert.equal(zeus.body.x, level.markers.zeusMove2[0].x);
    zeus.health = 40;
    zeus.stateTicks = 0; zeus.volley = 0; zeus.projectiles.length = 0;
    tick(level, 10);
    assert.equal(zeus.projectiles.length, 3, "first barrage already at step 10");
});

test("only the blades hurt Zeus: five hits, a 20 frame ouch with transport, then the croak", () => {
    const { level } = levelOf("Boss1.json");
    const zeus = zeusOf(level);
    for (let i = 0; i < 80 && zeus.introActive; i++) tick(level);
    assert.equal(zeus.health, 100);
    level.strike(zeus.hurtbox, 0, new Set(), "lightning", 1);
    level.strike(zeus.hurtbox, 0, new Set(), "hammer", 1);
    level.strike(zeus.hurtbox, 0, new Set(), "spin", 1);
    assert.equal(zeus.health, 100);
    sfxLog.length = 0;
    blade(level, zeus);
    assert.equal(zeus.health, 80);
    assert.equal(zeus.state, "hurt");
    assert.equal(sfxLog.filter(k => k === "shadowHurt").length, 1, "soundZeusOuch exactly once");
    assert.equal(zeus.hurtbox, null);
    tick(level, 19); assert.equal(zeus.state, "hurt");
    tick(level, 1); assert.equal(zeus.state, "transporting");
    for (let i = 0; i < 40 && zeus.state === "transporting"; i++) tick(level);
    for (let hit = 2; hit <= 5; hit++) {
        blade(level, zeus);
        assert.equal(zeus.health, 100 - 20 * hit);
        if (hit < 5) { tick(level, 20); for (let i = 0; i < 40 && zeus.state !== "zeus"; i++) tick(level); }
    }
    assert.equal(zeus.health, 0);
    assert.equal(zeus.state, "croak");
    assert.equal(level.bossReward, null);
    tick(level, 111); assert.equal(level.enemies.includes(zeus), true);
    tick(level, 2);
    assert.equal(level.enemies.includes(zeus), false);
    assert.equal(level.bossReward, "gotZeusLightning");
});

test("Thor throws every 20 steps (10 at 40 health or less) and takes 20 from blades, 5 from Lightning, nothing from the rest", () => {
    const { level } = levelOf("Boss2.json");
    const thor = thorOf(level);
    tick(level, 3);
    assert.equal(thor.started, true);
    thor.projectiles.length = 0; thor.cooldown = 20;
    tick(level, 19); assert.equal(thor.projectiles.length, 0);
    tick(level, 1); assert.equal(thor.projectiles.length, 1);
    assert.ok(sfxLog.includes("shadowHammer"), "soundThorHammerThrow");
    thor.health = 40; thor.cooldown = 1;
    tick(level, 1); thor.projectiles.length = 0;
    tick(level, 9); assert.equal(thor.projectiles.length, 0);
    tick(level, 1); assert.equal(thor.projectiles.length, 1);
    thor.health = 100; thor.state = "walking"; thor.body.mask = LAYER.SOLID;
    level.strike(thor.hurtbox, 0, new Set(), "hammer", 1);
    level.strike(thor.hurtbox, 0, new Set(), "spin", 1);
    assert.equal(thor.health, 100);
    level.strike(thor.hurtbox, 0, new Set(), "lightning", 1);
    assert.equal(thor.health, 95);
});

test("Thor's death follows bossThorPounded: five blows through six frames, a crumble, then 80 steps", () => {
    const { level } = levelOf("Boss2.json");
    const thor = thorOf(level);
    tick(level, 3);
    thor.health = 20; thor.state = "walking";
    sfxLog.length = 0;
    blade(level, thor);
    assert.equal(thor.state, "pounded");
    assert.ok(sfxLog.includes("thorDizzy"));
    assert.equal(level.bossReward, null);
    for (let frame = 1; frame <= 5; frame++) {
        tick(level, 6);                               // the 5 step blow delay
        blade(level, thor);
        assert.equal(thor.deathFrame, frame);
    }
    sfxLog.length = 0;
    tick(level, 6);
    blade(level, thor);
    assert.ok(sfxLog.includes("bastetStone"), "soundThorCrumble on the blow after the last frame");
    assert.equal(thor.deathFrame, 5);
    tick(level, 70); assert.equal(level.enemies.includes(thor), true);
    tick(level, 20);
    assert.equal(level.enemies.includes(thor), false);
    assert.equal(level.bossReward, "gotMjolnir");
});

test("the zeus and thor strips fit PS2 textures and their poses exist", () => {
    for (const [sheet, frames] of [["zeus", 109], ["thor", 63]]) {
        const { width, height } = image(Game.assets.sheets[sheet].path);
        assert.ok(width <= 1024);
        assert.ok((width / 16) * (height / 16) >= frames, sheet);
    }
});
