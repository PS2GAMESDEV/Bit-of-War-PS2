// node --experimental-default-type=module --test tools/tests/shadow.test.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

globalThis.Screen = { getMode: () => ({ width: 640, height: 448 }) };
globalThis.Color = { new: (...v) => v };
const drawn = [];
globalThis.Sprite = { Instance: class {
    constructor(sheet, options) { assert.ok(sheet); this.sheet = sheet; Object.assign(this, options); }
    draw() { drawn.push(this); }
} };
const overlaps = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
globalThis.Collision = { overlaps };
const { ShadowKratos, ShadowZeus, ShadowThor, SHADOW_SHEETS } = await import("../../src/features/Enemies/shadowKratos.js");
const { GAME_SCALE: S } = await import("../../src/shared/lib/constants.js");

class World {
    constructor() { this.bodies = []; this.floor = 400 * S; }
    query(x, y, w, h) { return y >= this.floor ? [{ sensor: false }] : []; }
    add(options) {
        const floor = this.floor;
        const body = {
            ...options, valid: true, onGround: false,
            get right() { return this.x + this.w; },
            get bottom() { return this.y + this.h; },
            get centerX() { return this.x + this.w / 2; },
            setPosition(x, y) { this.x = x; this.y = y; },
            move(dx, dy) {
                this.x += dx; this.y += dy; this.onGround = false;
                if (this.mask && this.bottom >= floor && dy >= 0) {
                    this.y = floor - this.h; this.onGround = true;
                }
            },
            remove() { this.valid = false; }
        };
        this.bodies.push(body);
        return body;
    }
}
const view = { x: 0, y: 208 * S, w: 272 * S, h: 208 * S };
const target = { centerX: 50 * S, centerY: 390 * S };
function fixture(Boss = ShadowKratos, x = 224, y = 384) {
    const world = new World();
    const b = new Boss(null, world, x * S, y * S, SHADOW_SHEETS);
    return { b, world, step: seconds => b.update(target, seconds, view) };
}

test("all extracted sprite clips fit PS2-sized image grids", () => {
    for (const sheet of Object.values(SHADOW_SHEETS)) {
        const png = fs.readFileSync(new URL(`../../assets/${sheet.path}`, import.meta.url));
        const width = png.readUInt32BE(16), height = png.readUInt32BE(20);
        assert.ok(width <= 1024 && height <= 1024);
        const count = width / sheet.frameWidth * (height / sheet.frameHeight);
        for (const clip of Object.values(sheet.clips)) {
            for (const range of clip.frames.split(",")) {
                for (const frame of range.split("-").map(Number)) assert.ok(frame < count, `${sheet.path}: ${frame}`);
            }
        }
    }
});

test("pop-in gates combat, initial final direction is left, and blades follow their original alarm and offsets", () => {
    const { b, step } = fixture();
    assert.equal(b.hurtbox, null);
    step(.2);
    assert.equal(b.state, "walking");
    assert.ok(b.hurtbox);
    step(.45);
    assert.equal(b.blade, null);
    step(.05);
    assert.ok(b.blade);
    assert.equal(b.direction, -1);
    assert.equal(b.body.x / S, 184);
    const rect = b._bladeBox();
    assert.equal(rect.x, b.body.x - 45 * S);
    assert.equal(rect.y, b.body.y + 5 * S);
    assert.equal(b.arrowHit(rect), rect.x + rect.w / 2);
    assert.equal(b.arrowHit(rect), rect.x + rect.w / 2); // persistent swing
    step(.25);
    assert.equal(b.blade, null);
});

test("spin covers the original rectangular path, is invulnerable, and resumes walking in the reversed direction", () => {
    const { b, step } = fixture(ShadowKratos, 20);
    step(.2); step(.05);
    assert.equal(b.state, "spinning");
    assert.equal(b.direction, 1);
    assert.equal(b.hurtbox, null);
    assert.equal(b.contactBox.w, 80 * S);
    const before = b.body.x;
    b.hurt(0);
    assert.equal(b.state, "spinning");
    step(.05);
    assert.equal(b.body.x - before, 10 * S);
    for (let i = 0; i < 79; i++) step(.05);
    assert.equal(b.state, "walking");
    assert.ok(b.hurtbox);
    assert.equal(b.body.x, 16 * S);
    assert.equal(b.body.y, 384 * S);
});

test("hurt state replaces the boss for one second and returns away from the player without falling through the floor", () => {
    const { b, step } = fixture();
    step(.2);
    b.hurt(0);
    assert.equal(b.hurtbox, null);
    assert.equal(b.contactBox, null);
    step(.95);
    assert.equal(b.state, "hurt");
    step(.05);
    assert.equal(b.state, "walking");
    assert.equal(b.direction, 1);
    assert.ok(b.body.bottom <= 400 * S);
    assert.ok(b.hurtbox);
});

test("Zeus phase emits 3/2/3 bolts before crossing and switches sides at y=272", () => {
    const { b, step } = fixture(ShadowZeus, 240, 272);
    step(.2);
    step(1.45); assert.equal(b.projectiles.length, 0);
    step(.05); assert.equal(b.projectiles.length, 3);
    step(1.5); assert.equal(b.volley, 2);
    assert.equal(b.projectiles.length, 2); // first fan has finished its paths
    step(1.5); assert.equal(b.volley, 3);
    step(1.5); assert.equal(b.state, "transporting");
    step(.6);
    assert.equal(b.state, "zeus");
    assert.equal(b.body.x, 16 * S);
    assert.equal(b.body.y, 272 * S);
    assert.equal(b.direction, 1);
    assert.equal(b.volley, 0);
});

test("low-health Zeus uses the 10/20/30/50-step schedule; hitting him routes through hurt and transport", () => {
    const { b, step } = fixture(ShadowZeus, 240, 272);
    b.health = 40; step(.2); step(.5);
    assert.equal(b.volley, 1);
    step(.5); assert.equal(b.volley, 2);
    step(.5); assert.equal(b.volley, 3);
    step(1); assert.equal(b.state, "transporting");
    step(.6);
    b.hurt(target.centerX);
    step(1);
    assert.equal(b.state, "transporting");
});

test("Thor throws at 20 or 10 steps and counterattacks from the view center with the original spiral path", () => {
    const { b, step } = fixture(ShadowThor, 208, 384);
    step(.2); step(1);
    assert.ok(b.projectiles.some(p => p.kind === "hammer"));
    b.health = 40;
    b.hurt(0); step(1);
    assert.equal(b.state, "floating");
    assert.equal(b.hurtbox, null);
    step(2);
    assert.equal(b.state, "walking");
    assert.ok(b.projectiles.some(p => p.motion.points.length > 30));
    assert.ok(b.cooldown <= 10);
});

test("damage tables preserve resistances and a zero-health phase rewards only after disappearing", () => {
    for (const [Boss, damage] of [[ShadowZeus, [20,10,33,20]], [ShadowThor, [20,10,10,33]], [ShadowKratos, [20,5,5,20]]]) {
        const { b, step } = fixture(Boss);
        assert.deepEqual(["blade","lightning","hammer","spin"].map(w => b.damageFor(w)), damage);
        assert.equal(b.damageFor("gorgon"), 0);
        assert.equal(b.petrifiable, false);
        assert.equal(Boss.reward, "shadowStageComplete");
        step(.2); b.die();
        assert.equal(b.hurtbox, null); assert.equal(b.contactBox, null); assert.equal(b.dead, false);
        if (Boss === ShadowKratos) { step(5); assert.equal(b.dead, false); step(2); }
        else { step(.15); assert.equal(b.dead, false); step(.05); }
        assert.equal(b.dead, true); assert.equal(b.completed, true); assert.equal(b.body.valid, false);
    }
});

test("fixed-step accumulation gives the same attacks and movement at 20 and 60 Hz and drawing does not advance combat", () => {
    const a = fixture(), b = fixture();
    for (let i = 0; i < 60; i++) a.step(1 / 20);
    for (let i = 0; i < 180; i++) b.step(1 / 60);
    assert.equal(a.b.state, b.b.state);
    assert.equal(a.b.body.x, b.b.body.x);
    assert.equal(a.b.body.y, b.b.body.y);
    assert.equal(a.b.stateTicks, b.b.stateTicks);
    const ticks = a.b.ticks;
    a.b.draw(); a.b.draw();
    assert.equal(a.b.ticks, ticks);
    assert.ok(drawn.length > 0);
});
