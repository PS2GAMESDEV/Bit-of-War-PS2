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

test("fire alternates each quarter second; both parts advance a quarter tile per second with slower movement animation", () => {
    const f = fixture();
    const x = f.boss.body.x;
    const offset = { ...f.boss.riderOffset };
    f.boss.start();
    assert.equal(f.boss.parts.sphinx.clip, "attack");
    assert.equal(f.boss.parts.bastet.clip, "walk");
    assert.equal(f.boss.fire.x + 64 * GAME_SCALE, f.boss.body.x + 16 * GAME_SCALE);
    assert.equal(f.boss.fire.y + 96 * GAME_SCALE, f.boss.body.bottom);
    advance(f, 0.249);
    assert.equal(f.boss.fire.frame, 0);
    advance(f, 0.001);
    assert.equal(f.boss.fire.frame, 1);
    assert.equal(f.boss.parts.bastet.frame, 10);
    assert.equal(f.boss.parts.sphinx.frame, 4);
    advance(f, 0.25);
    assert.equal(f.boss.fire.frame, 0);
    assert.equal(f.boss.parts.bastet.frame, 11);
    assert.equal(f.boss.parts.sphinx.frame, 5);
    advance(f, 4.5);
    assert.equal(f.boss.state, "idle");
    assert.ok(Math.abs(f.boss.body.x - (x - 20 * GAME_SCALE)) < 1e-9);
    assert.equal(f.boss.parts.bastet.x - f.boss.parts.sphinx.x, offset.x);
    assert.equal(f.boss.parts.bastet.y - f.boss.parts.sphinx.y, offset.y);
    assert.equal(f.boss.parts.bastet.clip, "idle");
    assert.equal(f.boss.parts.sphinx.clip, "idle");
    advance(f, 2.999);
    assert.equal(f.boss.state, "idle");
    advance(f, 0.001);
    assert.equal(f.boss.state, "sphinxAttack");
    const large = fixture();
    large.boss.start();
    advance(large, 8.25);
    assert.equal(large.boss.state, "sphinxAttack");
    assert.equal(large.boss.timer, 4.75);
});

test("a swing damages shared health once; hit flashes rapidly and the three-second reaction returns directly to fire", () => {
    const f = fixture();
    f.boss.start();
    advance(f, 0.25);
    const box = { x: f.boss.body.x, y: f.boss.parts.bastet.y, w: 256, h: 278 };
    const swing = new Set();
    f.level.strike(box, f.target.centerX, swing);
    assert.equal(f.boss.health, Bastet.health - 1);
    assert.equal(f.boss.state, "bastetAttack");
    assert.equal(f.boss.parts.sphinx.clip, "hit");
    assert.equal(f.boss.parts.bastet.clip, "attack");
    assert.equal(f.boss.tornadoes.length, 1);
    f.level.strike(box, f.target.centerX, swing);
    f.level.strike(box, f.target.centerX, new Set());
    assert.equal(f.boss.health, Bastet.health - 1);
    assert.equal(f.boss.tornadoes.length, 1);
    const x = f.boss.body.x;
    advance(f, 1 / 48);
    assert.equal(f.boss.parts.sphinx.frame, 2);
    advance(f, 1 / 48);
    assert.equal(f.boss.parts.sphinx.frame, 1);
    advance(f, 0.25 - 2 / 48);
    assert.equal(f.boss.bastAttack.frame, 1);
    advance(f, 0.25);
    assert.equal(f.boss.bastAttack.frame, 0);
    advance(f, 2.499);
    assert.equal(f.boss.state, "bastetAttack");
    assert.equal(f.boss.parts.sphinx.clip, "hit");
    advance(f, 0.001);
    assert.equal(f.boss.state, "sphinxAttack");
    assert.ok(Math.abs(f.boss.timer - 5) < 1e-9);
    assert.equal(f.boss.parts.sphinx.clip, "attack");
    assert.equal(f.boss.parts.bastet.clip, "walk");
    assert.equal(f.boss.fire.frame, 0);
    assert.equal(f.boss.body.x, x);
    assert.equal(f.boss.tornadoes.length, 1);
    const rider = f.boss.parts.bastet;
    f.level.strike({ x: rider.x, y: rider.y, w: 32, h: 10 }, f.target.centerX, new Set());
    assert.equal(f.boss.health, Bastet.health - 2);
    assert.equal(f.boss.tornadoes.length, 2); // One new tornado, not one per animation frame.
});

test("a hit during idle skips the remaining pause; crossing the counterattack endpoint immediately advances with fire", () => {
    const f = fixture();
    f.boss.start();
    advance(f, 5.5);
    assert.equal(f.boss.state, "idle");
    f.level.strike(f.boss.body, f.target.centerX, new Set());
    assert.equal(f.boss.state, "bastetAttack");
    const x = f.boss.body.x;
    advance(f, 3.25);
    assert.equal(f.boss.state, "sphinxAttack");
    assert.equal(f.boss.timer, 4.75);
    assert.equal(f.boss.body.x, x - GAME_SCALE);
    assert.equal(f.boss.fire.frame, 1);
    assert.equal(f.boss.tornadoes.length, 1);
});

test("ten hits using the player's blade reach remain safely beyond the kill zone, even after ten full fire phases", () => {
    const f = fixture();
    const startX = f.boss.body.x;
    const player = Object.create(Player.prototype);
    player.attacking = true;
    player.facingLeft = false;
    const kill = map.colliders.kill;
    let killRight = 0;
    for (let i = 0; i < kill.length; i += 4) {
        killRight = Math.max(killRight, (kill[i] + kill[i + 2]) * GAME_SCALE);
    }
    f.boss.start();
    for (let hit = 1; hit <= 10; hit++) {
        // One hit only after the full five-second fire phase, rather than
        // depending on the player hitting immediately whenever fire resumes.
        advance(f, 5);
        f.target.x = f.boss.body.x - 58 * GAME_SCALE;
        f.target.y = f.boss.body.bottom - 12 * GAME_SCALE;
        f.target.w = f.target.h = 12 * GAME_SCALE;
        player.pos = { x: f.target.centerX, y: f.boss.body.bottom - 16 * GAME_SCALE };
        assert.ok(f.target.x > killRight, `player stance is clear of kill on hit ${hit}`);
        f.level.strike(player.hitbox, player.pos.x, new Set());
        assert.equal(f.boss.health, 10 - hit);
        if (hit < 10) {
            advance(f, 3);
            assert.equal(f.boss.state, "sphinxAttack");
        }
    }
    assert.equal(f.boss.state, "defeated");
    assert.equal(startX - f.boss.body.x, 200 * GAME_SCALE);
    assert.ok(f.target.x - killRight >= 62 * GAME_SCALE);
});

test("tornadoes start at Sphinx's rear base, aim from that point, and are spent on contact", () => {
    for (const [offset, dir] of [[-400, -1], [400, 1], [32, -1]]) {
        const f = fixture();
        f.boss.start();
        f.target.x = f.boss.body.centerX + offset;
        advance(f, 0);
        f.boss.hurt(f.target.centerX);
        const tornado = f.boss.tornadoes[0];
        assert.equal(Math.sign(tornado.body.vx), dir);
        assert.equal(tornado.body.right, f.boss.body.right);
        assert.equal(tornado.body.bottom, f.boss.body.bottom);
        const x = tornado.body.x;
        advance(f, 0.25);
        assert.equal(tornado.body.x, x + dir * 32);
        assert.equal(tornado.body.bottom, 400 * GAME_SCALE);
        tornado.body.x = f.boss.body.x - 300;
        const box = { x: tornado.body.x, y: tornado.body.y, w: 64, h: 64 };
        assert.notEqual(f.level.hitPlayer(box, true), null);
        assert.equal(tornado.body.valid, false);
        assert.equal(f.boss.tornadoes.length, 0);
        assert.equal(f.level.hitPlayer(box), null);
    }
});

test("tornado damage uses a centered 16x16 hitbox and excludes the sprite's outer margins", () => {
    const f = fixture();
    f.boss.start();
    f.boss.hurt(f.target.centerX);
    const tornado = f.boss.tornadoes[0];
    tornado.body.x = f.boss.body.x - 300;
    f.boss.sync();
    assert.equal(tornado.sprite.scale, GAME_SCALE);
    assert.equal(tornado.sprite.sheet.frameWidth, 32);
    const { x, y, right, bottom } = tornado.body;
    for (const box of [
        { x, y: y + 20, w: 8, h: 8 },
        { x: right - 8, y: y + 20, w: 8, h: 8 },
        { x: x + 20, y, w: 8, h: 8 },
        { x: x + 20, y: bottom - 8, w: 8, h: 8 }
    ]) {
        assert.equal(f.level.hitPlayer(box), null);
        assert.equal(tornado.body.valid, true);
    }
    assert.notEqual(f.level.hitPlayer({
        x: x + 8 * GAME_SCALE, y: y + 8 * GAME_SCALE,
        w: 16 * GAME_SCALE, h: 16 * GAME_SCALE
    }), null);
    assert.equal(tornado.body.valid, false);
});

test("active effects deal continuous damage while expired or wall-blocked tornadoes are removed", () => {
    const f = fixture();
    f.boss.start();
    const box = { x: f.boss.fire.x + 4, y: f.boss.body.bottom - 16, w: 8, h: 8 };
    assert.notEqual(f.level.hitPlayer(box), null);
    assert.notEqual(f.level.hitPlayer(box, true), null);
    f.boss.hurt(f.target.centerX);
    box.x = f.boss.bastAttack.x + 4;
    assert.notEqual(f.level.hitPlayer(box), null);
    const tornado = f.boss.tornadoes[0];
    tornado.body.onWall = -1;
    advance(f, 0);
    assert.equal(tornado.body.valid, false);
    f.boss._spawnTornado(f.target.centerX);
    const expiring = f.boss.tornadoes[0];
    advance(f, 8);
    assert.equal(expiring.body.valid, false);
    assert.equal(f.boss.tornadoes.length, 0);
});

test("zero health stops combat without starting death, removing the boss, or granting a reward", () => {
    const f = fixture();
    f.boss.start();
    f.boss.health = 1;
    f.boss._spawnTornado(f.target.centerX);
    const tornado = f.boss.tornadoes[0];
    f.level.strike(f.boss.body, f.target.centerX, new Set());
    assert.equal(f.boss.health, 0);
    assert.equal(f.boss.state, "defeated");
    assert.equal(f.boss.parts.bastet.clip, "idle");
    assert.equal(f.boss.parts.sphinx.clip, "idle");
    assert.equal(tornado.body.valid, false);
    const x = f.boss.body.x;
    advance(f, 20);
    assert.equal(f.boss.body.x, x);
    assert.ok(f.level.enemies.includes(f.boss));
    assert.equal(f.level.bossReward, null);
    assert.equal(f.level.hitPlayer(f.boss.body), null);
    assert.deepEqual(f.boss.hurtboxes, []);
    assert.equal(fixture().boss.health, Bastet.health);
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
