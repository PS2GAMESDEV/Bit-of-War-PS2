// Run: node --experimental-default-type=module --test tools/tests/bastet.test.mjs
// Athena's native rendering/physics are replaced here; these tests exercise
// the boss controller together with the real map, assets, Level and Game.
import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

globalThis.Screen = { getMode: () => ({ width: 640, height: 448 }), alphaEquation: () => 0 };
globalThis.Color = { new: (...rgba) => rgba.join(",") };
globalThis.Scene = class {};
globalThis.Font = { ASCII: "" };
globalThis.System = { bootPath: "./" };
globalThis.Gamepad = { player: () => ({ justPressed: () => false }) };
const draws = [];

function framesOf(clip) {
    const frames = typeof clip === "string" ? clip : clip.frames;
    return frames.split(",").flatMap(range => {
        const [first, last = first] = range.split("-").map(Number);
        return Array.from({ length: last - first + 1 }, (_, i) => first + i);
    });
}

globalThis.Sprite = {
    Instance: class {
        constructor(sheet, options = {}) {
            assert.ok(sheet);
            this.sheet = sheet;
            this.x = this.y = 0;
            Object.assign(this, options);
            if (options.clip) this.play(options.clip, { restart: true });
        }
        play(clip, options = {}) {
            if (this.clip === clip && !options.restart) return;
            assert.ok(this.sheet.clips[clip], clip);
            this.clip = clip;
            this.elapsed = 0;
            this.frame = framesOf(this.sheet.clips[clip])[0];
        }
        update(dt) {
            if (!this.clip) return;
            this.elapsed += dt;
            const clip = this.sheet.clips[this.clip];
            const frames = framesOf(clip);
            const position = Math.floor((this.elapsed + 1e-10) * (clip.fps ?? 12));
            this.frame = frames[clip.mode === "once" ? Math.min(position, frames.length - 1) : position % frames.length];
        }
        draw() { draws.push(this); }
    },
    drawAll: sprites => draws.push(...sprites)
};
globalThis.TileMap = {
    Instance: class { render() {} }, Descriptor: class {},
    SpriteBuffer: { fromObjects: sprites => sprites }
};
const overlaps = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x &&
    a.y < b.y + b.h && a.y + a.h > b.y;
globalThis.Collision = { overlaps };

const { default: Game } = await import("../../src/scenes/Game.js");
const { Level } = await import("../../src/features/Map/level.js");
const { Bastet } = await import("../../src/features/Enemies/bastet.js");
const { Player } = await import("../../src/features/Player/player.js");
const { GAME_SCALE, LAYER } = await import("../../src/shared/lib/constants.js");
const root = new URL("../../", import.meta.url);
const readJSON = file => JSON.parse(fs.readFileSync(new URL(file, root), "utf8"));
const map = readJSON("src/data/BossHall3.json");
const atlasEntries = Object.entries(readJSON("assets/images/tiles/texture.json").frames);
const sheets = { ...Game.assets.sheets, atlas: {
    image: {}, findFrame: name => atlasEntries.findIndex(([key]) => key === name),
    getFrame: index => {
        const frame = atlasEntries[index][1];
        return { ...frame.frame, offsetX: frame.spriteSourceSize.x, offsetY: frame.spriteSourceSize.y };
    }
} };

class World {
    constructor() { this.bodies = []; }
    add(options) {
        const world = this;
        const body = {
            type: "static", vx: 0, vy: 0, gravityScale: 1, valid: true, onWall: 0, mask: -1, ...options,
            get centerX() { return this.x + this.w / 2; },
            get right() { return this.x + this.w; },
            get bottom() { return this.y + this.h; },
            move(dx, dy) {
                this.onWall = 0;
                let nextX = this.x + dx;
                for (const solid of world.bodies.filter(b => b.type === "static" && !b.sensor && (this.mask & b.layer))) {
                    if (this.y >= solid.bottom || this.bottom <= solid.y) continue;
                    if (dx < 0 && this.x >= solid.right && nextX < solid.right) { nextX = solid.right; this.onWall = -1; }
                    if (dx > 0 && this.right <= solid.x && nextX + this.w > solid.x) { nextX = solid.x - this.w; this.onWall = 1; }
                }
                this.x = nextX;
                let nextY = this.y + dy;
                for (const solid of world.bodies.filter(b => b.type === "static" && !b.sensor && (this.mask & b.layer))) {
                    if (this.x >= solid.right || this.right <= solid.x) continue;
                    if (dy > 0 && this.bottom <= solid.y && nextY + this.h >= solid.y) {
                        nextY = solid.y - this.h;
                        this.vy = 0;
                    }
                }
                this.y = nextY;
            },
            remove() { this.valid = false; world.bodies.splice(world.bodies.indexOf(this), 1); }
        };
        this.bodies.push(body);
        return body;
    }
    query() { return []; }
    step(dt) {
        for (const body of this.bodies.filter(b => b.type === "dynamic")) {
            body.vy += 2160 * body.gravityScale * dt;
            if (body.maxSpeedY) body.vy = Math.min(body.vy, body.maxSpeedY);
            body.move(body.vx * dt, body.vy * dt);
        }
    }
}

const view = { x: 0, y: 0, w: 2200, h: 1000 };
function fixture() {
    const world = new World();
    const level = new Level(map, sheets, world);
    const boss = level.bastet;
    const target = { x: 600, y: 768, w: 24, h: 32, get centerX() { return this.x + this.w / 2; } };
    return { world, level, boss, target };
}
function advance(f, dt) {
    f.level.update(f.target, dt, view);
    f.world.step(dt);
    f.boss.sync();
}

test("marker gates the fight, including arriving past it, and is consumed only once", () => {
    const f = fixture();
    assert.equal(f.boss.health, Bastet.health);
    assert.equal(f.boss.startMarker.x, map.markers.startCutscene[0] * GAME_SCALE);
    assert.equal(f.boss.shouldStart({ centerX: 575 }), false);
    assert.ok(f.boss.shouldStart({ centerX: 576 }));
    assert.ok(f.boss.shouldStart({ centerX: 700 }));
    assert.deepEqual(f.boss.hurtboxes, []);
    advance(f, 2);
    assert.equal(f.boss.state, "idle");
    const player = { body: f.target, pos: f.target, update: dt => f.world.step(dt), dead: false };
    const game = { state: 0, playTime: 0, player, level: f.level, camera: { visibleRect: () => view } };
    Game.prototype.update.call(game, 0);
    assert.equal(f.boss.state, "sphinxAttack");
    advance(f, 0.25);
    Game.prototype.update.call(game, 0);
    assert.equal(f.boss.timer, 4.75);
    assert.equal(f.boss.shouldStart(f.target), false);
});

const STEP = 1 / 20;
function runUntil(f, predicate, limit = 20) {
    for (let t = 0; t < limit && !predicate(); t += STEP) advance(f, STEP);
    assert.ok(predicate(), "condition reached");
}
const blade = f => f.level.strike(f.boss.body, f.target.centerX, new Set());

test("fire phase alternates frames each quarter second, advances at the original speed, then idles three seconds", () => {
    const f = fixture();
    const x = f.boss.body.x;
    const offset = { ...f.boss.riderOffset };
    f.boss.start();
    assert.equal(f.boss.parts.sphinx.clip, "attack");
    assert.equal(f.boss.parts.bastet.clip, "walk");
    assert.equal(f.boss.fire.x + 48 * GAME_SCALE, f.boss.body.x);
    assert.equal(f.boss.fire.y + 96 * GAME_SCALE, f.boss.body.bottom);
    assert.deepEqual(f.boss.hurtboxes, [], "invulnerable while breathing fire");
    advance(f, 0.249);
    assert.equal(f.boss.fire.frame, 0);
    advance(f, 0.001);
    assert.equal(f.boss.fire.frame, 1);
    advance(f, 4.75);
    assert.equal(f.boss.state, "idle");
    assert.ok(Math.abs(x - f.boss.body.x - 50 * GAME_SCALE) < 1e-9, "10 px/s for 5 s");
    assert.equal(f.boss.parts.bastet.x - f.boss.parts.sphinx.x, offset.x);
    assert.equal(f.boss.parts.bastet.y - f.boss.parts.sphinx.y, offset.y);
    assert.equal(f.boss.parts.bastet.clip, "idle");
    assert.equal(f.boss.hurtboxes.length, 2, "both parts are vulnerable while idle");
    advance(f, 2.999);
    assert.equal(f.boss.state, "idle");
    advance(f, 0.001);
    assert.equal(f.boss.state, "sphinxAttack");
    assert.equal(f.boss.timer, 5);
});

test("damage per weapon follows the original collision events", () => {
    const f = fixture();
    f.boss.start();
    assert.equal(f.boss.damageFor("blade"), 0, "no damage while breathing fire");
    advance(f, 5);
    assert.equal(f.boss.state, "idle");
    assert.equal(f.boss.damageFor("blade"), 17 / 20);
    assert.equal(f.boss.damageFor("lightning"), 5 / 20);
    assert.equal(f.boss.damageFor("hammer", { y: 400 * GAME_SCALE }), 10 / 20);
    assert.equal(f.boss.damageFor("hammer", { y: 300 * GAME_SCALE }), 40 / 20);
    assert.equal(f.boss.damageFor("spin"), 0);
});

test("a hit in idle recoils the mount and sends one tornado from the view's right edge until it leaves the left edge", () => {
    const f = fixture();
    f.boss.start();
    advance(f, 5);
    const x = f.boss.body.x;
    blade(f);
    assert.ok(Math.abs(f.boss.health - (Bastet.health - 17 / 20)) < 1e-9);
    assert.equal(f.boss.state, "bastetAttack");
    assert.equal(f.boss.body.x, x + 20 * GAME_SCALE);
    assert.equal(f.boss.parts.sphinx.clip, "hit");
    assert.equal(f.boss.parts.bastet.clip, "attack");
    assert.equal(f.boss.tornadoes.length, 1);
    assert.equal(f.boss.tornadoes[0].body.x, view.x + view.w);
    blade(f);
    assert.equal(f.boss.tornadoes.length, 1, "invulnerable during the counterattack");
    advance(f, 0.1);
    assert.ok(f.boss.tornadoes[0].body.x < view.x + view.w);
    runUntil(f, () => f.boss.state === "sphinxAttack");
    assert.equal(f.boss.tornadoes.length, 0);
    assert.equal(f.boss.timer, 5);
    assert.ok(f.boss.health > Bastet.health - 1);
});

test("tornado and fire hurt the player with the original contact damage and persist on contact", () => {
    const f = fixture();
    f.boss.start();
    const fire = { x: f.boss.fire.x + 4, y: f.boss.body.bottom - 16, w: 8, h: 8 };
    assert.notEqual(f.level.hitPlayer(fire), null);
    assert.notEqual(f.level.hitPlayer(fire, true), null, "fire cannot be blocked");
    advance(f, 5);
    blade(f);
    const tornado = f.boss.tornadoes[0];
    tornado.body.x = f.boss.body.x - 300;
    f.boss.sync();
    const { x, y, right, bottom } = tornado.body;
    for (const box of [
        { x, y: y + 20, w: 8, h: 8 }, { x: right - 8, y: y + 20, w: 8, h: 8 },
        { x: x + 20, y, w: 8, h: 8 }, { x: x + 20, y: bottom - 8, w: 8, h: 8 }
    ]) assert.equal(f.level.hitPlayer(box), null, "outer sprite margins are harmless");
    const center = { x: x + 8 * GAME_SCALE, y: y + 8 * GAME_SCALE, w: 16 * GAME_SCALE, h: 16 * GAME_SCALE };
    assert.notEqual(f.level.hitPlayer(center), null);
    assert.equal(tornado.body.valid, true);
    assert.notEqual(f.level.hitPlayer(center), null, "hits again while overlapping");
});

test("contact with the mount hurts for two", () => {
    const f = fixture();
    f.boss.start();
    assert.notEqual(f.level.hitPlayer(f.boss.body), null);
    assert.equal(f.level.lastHitDamage, Bastet.contactDamage);
});

test("emptying the life bar stuns the mount without removing it or granting a reward", () => {
    const f = fixture();
    f.boss.start();
    advance(f, 5);
    f.boss.health = 0.5;
    blade(f);
    assert.equal(f.boss.health, 0);
    assert.equal(f.boss.state, "defeated");
    assert.equal(f.boss.dying, true);
    assert.equal(f.boss.tornadoes.length, 0);
    const x = f.boss.body.x;
    advance(f, 20);
    assert.equal(f.boss.body.x, x);
    assert.ok(f.level.enemies.includes(f.boss));
    assert.equal(f.level.bossReward, null);
    assert.equal(f.boss.finisherBox, f.boss.body);
    assert.equal(fixture().boss.health, Bastet.health);
});

test("the Gorgon Head then a blade on the fallen rider finishes the fight and grants Blade Storm", () => {
    const f = fixture();
    f.boss.start();
    f.boss.health = 0;
    f.boss.die();
    const body = f.boss.body;
    // Blades alone do nothing to the stunned mount.
    f.level.strike(body, f.target.centerX, new Set());
    assert.equal(f.boss.state, "defeated");
    f.level.strike(body, f.target.centerX, new Set(), "gorgon");
    assert.equal(f.boss.state, "stoning");
    advance(f, 13 / 8 + 0.01);
    assert.equal(f.boss.state, "finishReady");
    assert.equal(f.level.bossReward, null);
    const spot = f.boss.finisherBox;
    f.level.strike(spot, f.target.centerX, new Set(), "lightning");
    assert.equal(f.boss.state, "finishReady", "only a blade finishes it");
    f.level.strike(spot, f.target.centerX, new Set());
    assert.equal(f.boss.state, "finishing");
    advance(f, 33 / 8 + 0.01);
    assert.equal(f.boss.dead, true);
    assert.equal(f.level.enemies.includes(f.boss), false);
    assert.equal(f.level.bossReward, "gotBladeStorm");
});

test("pause freezes boss animation and timers; drawing includes each part and only its active effect", () => {
    const f = fixture();
    f.boss.start();
    advance(f, 0.25);
    const timer = f.boss.timer;
    const frame = f.boss.fire.frame;
    Game.prototype.update.call({ state: 3, level: f.level, _updateMenu() {} }, 2);
    assert.equal(f.boss.timer, timer);
    assert.equal(f.boss.fire.frame, frame);
    draws.length = 0;
    f.level.render({ visibleRect: () => view }, () => {});
    for (const sprite of [f.boss.parts.sphinx, f.boss.parts.bastet, f.boss.fire]) {
        assert.equal(draws.filter(drawn => drawn === sprite).length, 1);
    }
    assert.equal(draws.includes(f.boss.bastAttack), false);
    assert.ok(draws.indexOf(f.boss.parts.sphinx) < draws.indexOf(f.boss.parts.bastet));
});

test("other enemies still take one damage per swing and are removed normally", () => {
    const f = fixture();
    const enemy = { health: 2, hurtbox: { x: 10, y: 10, w: 10, h: 10 } };
    f.level.enemies.push(enemy);
    const swing = new Set();
    f.level.strike(enemy.hurtbox, 0, swing);
    f.level.strike(enemy.hurtbox, 0, swing);
    assert.equal(enemy.health, 1);
    assert.ok(enemy.hitCooldown > 0, "a quarter-second cooldown follows each hit");
    f.level.strike(enemy.hurtbox, 0, new Set());
    assert.equal(enemy.health, 1);
    enemy.hitCooldown = 0;
    f.level.strike(enemy.hurtbox, 0, new Set());
    assert.equal(f.level.enemies.includes(enemy), false);
});

test("effect clips fit their image grids and all change frame every quarter second", () => {
    for (const [name, clipName] of [["fireAttack", "burn"], ["bastAttack", "attack"], ["thunderAttack", "spin"]]) {
        const sheet = sheets[name];
        const bytes = fs.readFileSync(new URL(`assets/${sheet.path}`, root));
        assert.equal(bytes.readUInt32BE(16) / sheet.frameWidth, 2);
        assert.equal(bytes.readUInt32BE(20) / sheet.frameHeight, 1);
        assert.equal(sheet.clips[clipName].fps, 4);
    }
});
