// Run with Node 24: node --test tools/tests/campaign.test.mjs
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
const pad = { justPressed: key => pressed.has(key), pressed: key => pressed.has(key), anyPressed: key => [...pressed].some(k => k & key) };
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
const broadView = { x: -1000, y: -1000, w: 50000, h: 50000 };
const target = { x: 50, y: 768, w: 24, h: 24, centerX: 62, centerY: 780, right: 74, bottom: 792 };

test("every campaign map builds, bounds include the playable spawn, and test sessions infer the appropriate powers", async () => {
    assert.equal(LEVELS.length, 28);
    const warningStart = calls.warnings.length;
    for (let index = 0; index < LEVELS.length; index++) {
        const game = await gameAt(index);
        assert.ok(game.level.width > 0 && game.level.height > 0, LEVELS[index]);
        assert.ok(game.player.body.centerX <= game.level.width, LEVELS[index]);
        assert.ok(game.player.body.bottom <= game.level.height, LEVELS[index]);
        assert.equal(game.player.unlockedPowers, index >= 16 ? 4 : index >= 11 ? 3 : index >= 6 ? 2 : 1);
        assert.equal(game.introCutscene, null, "test mode does not wait for narrative");
        if ([22, 23, 24].includes(index)) assert.equal(game.music, null, "the original end-world halls stop stage music");
        else assert.ok(game.music?.playing(), LEVELS[index]);
    }
    assert.deepEqual(calls.warnings.slice(warningStart), [], "all map placements have artwork or a behavior owner");
});

test("all three Shadow maps instantiate exactly one boss at the marker with 100 HP and the matching phase", () => {
    for (const [index, phase] of [[25, "zeus"], [26, "thor"], [27, "final"]]) {
        const { level } = levelAt(index);
        const bosses = level.enemies.filter(e => e instanceof ShadowKratos);
        assert.equal(bosses.length, 1);
        const boss = bosses[0];
        assert.equal(boss.health, 100); assert.equal(boss.phase, phase);
        assert.equal(boss.body.x, level.markers.shadowKratosPoint[0].x);
        assert.equal(boss.body.y, level.markers.shadowKratosPoint[0].y);
        level.update(target, .2, broadView);
        level.strike(boss.body, 0, new Set(), "hammer", 1);
        assert.equal(boss.health, phase === "zeus" ? 67 : phase === "thor" ? 90 : 95);
        level.strike(boss.body, 0, new Set(), "blade", 1);
        assert.equal(boss.health, phase === "zeus" ? 67 : phase === "thor" ? 90 : 95, "reaction prevents consecutive overlapping attacks");
    }
});

test("the final hallway advances at its trigger once and ignores further input while its fade is pending", async () => {
    const game = await gameAt(24);
    const marker = game.level.markers.startCutscene[0];
    game.player.body.setPosition(marker.x, marker.y);
    let resolveFade;
    game.camera.fade = () => new Promise(resolve => { resolveFade = resolve; });
    const before = calls.goes.length;
    game.update(1 / 60);
    assert.equal(game.state, 1);
    game.update(1 / 60);
    assert.equal(game.levelIndex, 24);
    resolveFade();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(calls.goes.length, before + 1);
    assert.equal(calls.goes.at(-1).options.params.testLevelIndex, 24);
});

test("defeating a Shadow boss progresses only after the removal animation, without requiring a door", async () => {
    for (const index of [25, 26, 27]) {
        const game = await gameAt(index);
        const boss = game.level.enemies.find(e => e instanceof ShadowKratos);
        game.level.update(game.player.body, .2, broadView);
        boss.health = 1;
        game.level.strike(boss.body, 0, new Set());
        assert.equal(game.level.bossReward, null);
        const before = calls.goes.length;
        game.level.update(game.player.body, index === 27 ? 8 : .2, broadView);
        assert.equal(game.level.bossReward, "shadowStageComplete");
        game.update(0);
        await new Promise(resolve => setImmediate(resolve));
        assert.equal(calls.goes.length, before + 1);
        assert.equal(calls.goes.at(-1).options.params.testLevelIndex, index);
    }
});

test("a weapon reward unlocks and selects its power, holds gameplay, then advances exactly once", async () => {
    for (const [index, reward, count] of [[5,"gotZeusLightning",2],[10,"gotMjolnir",3],[15,"gotBladeStorm",4]]) {
        const game = await gameAt(index);
        game.level.bossReward = reward;
        game.update(0);
        assert.equal(game.state, 5);
        assert.equal(game.player.unlockedPowers, count);
        assert.equal(game.player.selectedPower, count - 1);
        assert.equal(game.player.canMove, false);
        const before = calls.goes.length;
        game.update(3);
        game.update(0);
        await new Promise(resolve => setImmediate(resolve));
        assert.equal(calls.goes.length, before + 1);
    }
});

test("midlevel save roundtrip restores location, resources, opened chests and selected unlocked power", async () => {
    const game = await gameAt(11);
    game.testMode = false;
    game.player.health = 2.5; game.player.magic = 1.25;
    game.player.body.setPosition(320, 650);
    game.player._syncPos();
    game.player.facingLeft = true;
    game.unlockedPowerups = 3; game.powerupIndex = 2;
    if (game.level.chests.length) game.level.chests[0].opened = true;
    game.playTime = 123.75;
    await game._saveGame();
    const data = await Save.load();
    assert.equal(data.progress.resources.health, 2.5);
    assert.equal(data.progress.resources.magic, 1.25);
    const resumed = new Game(); resumed.assets = assets();
    await resumed.enter(resumed.assets, { save: data.progress });
    assert.equal(resumed.level, null, "the story comes first; the level loads when it ends");
    assert.equal(resumed.playTime, 123.75);
    await resumed.resume(); // Returning from its story builds the level with the same resources.
    assert.equal(resumed.player.health, 2.5); assert.equal(resumed.player.magic, 1.25);
    assert.equal(resumed.player.facingLeft, true);
    assert.deepEqual(resumed.player.origin, game.player.origin);
    assert.equal(resumed.player.unlockedPowers, 3);
    assert.equal(resumed.player.selectedPower, 2);
    if (resumed.level.chests.length) assert.equal(resumed.level.chests[0].opened, true);
});

test("a checkpoint omits midfight resources and position while keeping unlocked weapons", async () => {
    const game = await gameAt(26);
    game.player.health = .5; game.player.magic = 0;
    const checkpoint = game._progress(false);
    assert.equal(checkpoint.player, null); assert.equal(checkpoint.resources, null);
    assert.equal(checkpoint.unlockedPowers, 4);
    const loaded = new Game(); loaded.assets = assets();
    await loaded.enter(loaded.assets, { save: checkpoint });
    assert.equal(loaded.level, null, "the level is built after the loading screen, on the first frames");
    loaded.update(1 / 60);
    for (let i = 0; i < 10 && !loaded.level; i++) await new Promise(resolve => setImmediate(resolve));
    assert.equal(loaded.player.health, 5); assert.equal(loaded.player.magic, 5);
    assert.equal(loaded.player.unlockedPowers, 4);
});

test("completing the last campaign stage clears the save checkpoint and returns from the ending to its completion screen", async () => {
    const game = await gameAt(27);
    game.testMode = false;
    game.playTime = 321.5;
    const before = calls.pushes.length;
    await game._nextLevel();
    await game._nextLevel();
    assert.equal(game.levelIndex, 28);
    assert.equal(calls.pushes.length, before + 1);
    assert.equal(calls.pushes.at(-1).options.params.sequence, "ending");
    const data = await Save.load();
    assert.equal(data.progress, null);
    assert.equal(data.bestTime, 321.5);
    await game.resume();
    assert.equal(game.state, 2);
    assert.equal(game.endingStory, false);
    assert.equal(game.bestTime, 321.5);
});

test("boss and player HUD are drawn in screen space after the world, including fractional magic", async () => {
    const game = await gameAt(27);
    game.level.update(game.player.body, .2, broadView);
    game.player.magic = .5; game.player.health = 2.5;
    game.level.enemies.find(e => e instanceof ShadowKratos).health = 60;
    calls.draws.length = 0;
    game.draw();
    const bossFill = calls.draws.find(d => d.args[0] === 394 && d.args[1] === 38);
    assert.ok(bossFill); assert.equal(bossFill.args[2], 60); assert.equal(bossFill.inScreenSpace, true);
    assert.ok(calls.draws.every(d => d.inScreenSpace), "boss controller does not draw HUD in world coordinates");
    const magicFill = calls.draws.find(d => d.args[1] === 48);
    assert.equal(magicFill.args[2], 10);
});

test("gauntlet generators lock exits until 26 random rolls and surviving enemies are gone", () => {
    const originalRandom = Math.random;
    try {
        for (const [index, firstType] of [[17,"Undead"],[19,"VSoldier"],[21,"Mummy"]]) {
            const { level } = levelAt(index);
            assert.ok(level.generators.length > 0);
            assert.equal(level.exitLocked, true);
            Math.random = () => 0;
            for (let i = 0; i < 26; i++) level.update(target, 1, broadView);
            assert.ok(level.generators.every(g => g.rolls === 26));
            assert.ok(level.enemies.some(e => e.constructor.name === firstType));
            assert.equal(level.exitLocked, true, "enemies left alive keep the door locked");
            for (const enemy of level.enemies) { enemy.die?.(); enemy.dead = true; }
            level.update(target, 0, broadView);
            assert.equal(level.enemies.length, 0);
            assert.equal(level.exitLocked, false);
            level.update(target, 30, broadView);
            assert.equal(level.enemies.length, 0, "generators cannot restart after the exit opens");
        }
        const { level } = levelAt(17);
        Math.random = () => .99;
        for (let i = 0; i < 26; i++) level.update(target, 1, broadView);
        assert.equal(level.enemies.length, 0, "the original third roll intentionally generates nothing");
        assert.equal(level.exitLocked, false);
    } finally { Math.random = originalRandom; }
});

test("interacting with a gauntlet door cannot skip its wave, then works once the no-spawn wave has finished", async () => {
    const game = await gameAt(17);
    const rect = game.world.bodies.find(b => b.layer === LAYER.DOOR);
    assert.ok(rect, "the real map contains an exit door");
    game.player.body.setPosition(rect.x, rect.y);
    const before = calls.goes.length;
    game._interact();
    assert.equal(game.state, 0);
    assert.equal(calls.goes.length, before);
    const originalRandom = Math.random;
    try {
        Math.random = () => .99;
        for (let i = 0; i < 26; i++) game.level.update(game.player.body, 1, broadView);
    } finally { Math.random = originalRandom; }
    assert.equal(game.level.exitLocked, false);
    game._interact();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(calls.goes.length, before + 1);
});

test("invisible secret blocks retain their original solid collisions without requiring an atlas entry", () => {
    for (const index of [6, 13, 14, 15]) {
        const map = json(`src/data/${LEVELS[index]}`);
        const points = map.layers.flatMap(l => l.tiles.secretInvisibleBlocks ?? []);
        const { world } = levelAt(index);
        for (let i = 0; i < points.length; i += 2) {
            const x = points[i] * S, y = points[i+1] * S;
            assert.ok(world.query(x + 1, y + 1, 30, 30, LAYER.SOLID).some(b => !b.sensor), `${LEVELS[index]} at ${points[i]},${points[i+1]}`);
        }
    }
});

test("fake walls and grey obstacles retain their shared artwork and decorative Sphinx/Spazz placements render", () => {
    for (const index of [1, 26]) {
        const map = json(`src/data/${LEVELS[index]}`);
        const { level } = levelAt(index);
        for (const layer of map.layers) {
            const rendered = level.layers.find(l => l.index === layer.layer).tiles?.options.spriteBuffer ?? [];
            for (const [id, points] of Object.entries(layer.tiles)) {
                if (!id.startsWith("tileFake") && id !== "tileGreyMast" && id !== "tileGreyCrate") continue;
                for (let i = 0; i < points.length; i += 2) {
                    assert.ok(rendered.some(t => t.x === points[i] * S && t.y === points[i+1] * S), `${id} at ${points[i]},${points[i+1]}`);
                }
            }
        }
    }
    for (const [index, path] of [[13, "images/tiles/bgSphinx.png"], [14, "images/enemies/spazz.png"]]) {
        const { level } = levelAt(index);
        assert.ok(level.layers.some(l => l.props.some(sprite => sprite.sheet.path === path)), path);
    }
});

test("every scene sprite texture fits PS2's 1024 pixel limit and each named clip fits its grid", () => {
    for (const [key, sheet] of Object.entries(Game.assets.sheets)) {
        if (typeof sheet === "string") continue; // atlas JSON is separately paged
        const data = fs.readFileSync(new URL(`assets/${sheet.path}`, root));
        const width = data.readUInt32BE(16), height = data.readUInt32BE(20);
        assert.ok(width <= 1024 && height <= 1024, `${key}: ${width}x${height}`);
        const frames = width / sheet.frameWidth * height / sheet.frameHeight;
        for (const clip of Object.values(sheet.clips ?? {})) {
            const indices = typeof clip === "string" ? clip : clip.frames;
            for (const range of indices.split(",")) for (const frame of range.split("-").map(Number)) {
                assert.ok(frame < frames, `${key}: frame ${frame} / ${frames}`);
            }
        }
    }
});
