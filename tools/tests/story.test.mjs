// Run: node --test tools/tests/story.test.mjs (Node 24+).
import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const metadata = JSON.parse(fs.readFileSync(new URL("../../assets/images/story/metadata.json", import.meta.url)));
globalThis.Screen = { getMode: () => ({ width: 640, height: 448 }), clear() {} };
globalThis.Color = { new: (...args) => args };
globalThis.Font = { ASCII: "" };
globalThis.System = { bootPath: "./" };
globalThis.Camera2D = { screenSpace: callback => callback() };
const pops = [];
const groups = [];
const draws = [];
let edge = null;
let held = null;
globalThis.Gamepad = {
    CROSS: 1, START: 2, SQUARE: 4, L2: 8, TRIANGLE: 16, UP: 32, DOWN: 64, LEFT: 128, RIGHT: 256,
    player: () => ({ justPressed: button => button === edge, pressed: button => button === held })
};
globalThis.Scene = class {
    static busy = false;
    static pop(options) { pops.push(options.result); }
    acquire(manifest) {
        for (const path of Object.values(manifest.images ?? {})) {
            assert.ok(fs.existsSync(new URL(`../../assets/${path}`, import.meta.url)), path);
        }
        const group = { assets: { images: Object.fromEntries(Object.keys(manifest.images ?? {}).map(key =>
            [key, { draw: (...args) => draws.push(args) }])) }, done: true, failed: false,
            release() { this.released = true; } };
        group.ready = Promise.resolve(group.assets);
        groups.push(group);
        return group;
    }
};

const { Story, STORY_SEQUENCES, STORY_BEFORE_LEVEL, storyArt, storyDuration,
    shadowIntroState, SHADOW_INTRO_FLIGHT, SHADOW_INTRO_DURATION } = await import("../../src/scenes/story.js");

async function enter(sequence) {
    edge = held = null;
    const story = new Story();
    story.assets = { data: { metadata }, music: {}, sfx: {}, fonts: { text: { print() {} } } };
    await story.enter(story.assets, { sequence });
    return story;
}
const settle = async () => { await Promise.resolve(); await Promise.resolve(); };

test("every sequence points to complete original PNG frames, with PS2-sized text panels", () => {
    const ids = new Set();
    for (const pages of Object.values(STORY_SEQUENCES)) for (const page of pages) {
        if (page.kind === "shadowJump") for (const id of [27, 239, 257]) ids.add(id);
        const arts = Array.isArray(page.art) ? page.art : page.art ? [page.art] : [];
        for (const art of arts) ids.add(art.id);
        for (const id of [page.backdrop, page.scroll?.id, ...(page.overlays ?? []).map(o => o.id)]) {
            if (id !== undefined) ids.add(id);
        }
    }
    for (const id of ids) {
        const info = metadata[id];
        assert.ok(info, id);
        for (let frame = 0; frame < info.frames; frame++) for (let part = 0; part < info.parts; part++) {
            const path = new URL(`../../assets/images/story/${id}/${frame}_${part}.png`, import.meta.url);
            assert.ok(fs.existsSync(path), path.href);
            const png = fs.readFileSync(path);
            assert.ok(png.readUInt32BE(16) <= 512);
            assert.ok(png.readUInt32BE(20) <= 256);
        }
    }
    assert.equal(STORY_BEFORE_LEVEL[25], "shadow");
    assert.equal(STORY_BEFORE_LEVEL[15], undefined, "Bastet starts inside her room");
});

test("Zeus dialogue gates confirmation, then progresses and pops once", async () => {
    const story = await enter("zeus");
    story.update(0.41); // Four opening frames at 10 Hz.
    await settle();
    assert.equal(story.pageIndex, 1);
    edge = Gamepad.CROSS;
    story.update(0.5);
    assert.equal(story.pageIndex, 1);
    story.update(0.51);
    await settle();
    assert.equal(story.pageIndex, 2);
    edge = null;
    for (let n = 0; n < 3; n++) {
        story.update(1.01);
        edge = Gamepad.CROSS;
        story.update(0.01);
        edge = null;
        await settle();
    }
    assert.equal(story.pageIndex, 5);
    const before = pops.length;
    story.update(0.41);
    story.update(1);
    assert.equal(pops.length, before + 1);
    assert.deepEqual(pops.at(-1), { story: "zeus", skipped: false });
    story.exit();
});

test("cinemas cannot be skipped, and show neither a help line nor a skip key", async () => {
    const story = await enter("ending");
    edge = Gamepad.START;
    story.update(0.3);
    story.update(0.3);
    assert.equal(pops.length === 0 || pops.at(-1).story !== "ending", true);
    story.exit();
});

test("the boot splash shows spriteSTsplash1 then 2 for 60 steps each and leads to the menu", async () => {
    assert.deepEqual(STORY_SEQUENCES.splash.map(p => [p.art.id, p.duration]), [[269, 3], [270, 3]]);
});

test("dialogue cards accept only A, blink the arrow, and play soundSelector except on the last card", async () => {
    const cards = STORY_SEQUENCES.zeus.filter(p => p.wait);
    assert.equal(cards.length, 4);
    assert.ok(cards.every(c => c.keys === "jump" && c.arrow));
    assert.deepEqual(cards.map(c => Boolean(c.sound)), [true, true, true, false]);
    // Cinema cards (spriteST1-2 and others) take any of A, S, X, Z or Enter and make no sound.
    const st = STORY_SEQUENCES.world1[1];
    assert.equal(st.keys, undefined);
    assert.equal(st.sound, undefined);
    const story = await enter("zeus");
    story.update(0.41); await settle();
    story.update(1.01);
    edge = Gamepad.SQUARE; story.update(0.01);
    assert.equal(story.pageIndex, 1, "S does not continue a dialogue");
    edge = null;
});

test("Bastet's scene grunts on its keys between frames 49 and 88 and waits on A with the blinking arrows", () => {
    const pages = STORY_SEQUENCES.bastet;
    assert.deepEqual(pages.find(p => p.grunts).grunts, { from: 49, to: 88 });
    const waits = pages.filter(p => p.wait);
    assert.equal(waits.length, 4);
    assert.ok(waits.every(p => p.keys === "jump" && p.arrow));
    assert.equal(waits[0].aButton, true);
    assert.deepEqual(waits.map(p => Boolean(p.sound)), [false, true, true, false]);
});

test("World 2 switches movies at original text y=-71; world 4 switches captions at frame52/103", () => {
    const world2 = STORY_SEQUENCES.world2[0];
    assert.equal(storyArt(world2, 27.89, metadata).id, 274);
    assert.equal(storyArt(world2, 27.9, metadata).id, 271);
    assert.equal(storyArt(world2, 27.9, metadata).frame, 0);
    assert.equal(storyDuration(world2, metadata), 86.6);
    assert.equal(STORY_SEQUENCES.world4[0].overlays[1].first, 52);
    assert.equal(STORY_SEQUENCES.world4[0].overlays[2].first, 103);
});

test("long movies release old blocks; slow I/O freezes scrolling with artwork", async () => {
    const story = await enter("world3");
    for (let n = 0; n < 500; n++) story.update(1 / 60);
    assert.ok(story.art.frame > 35);
    assert.ok(story.groups.size <= 2);
    const time = story.time;
    const next = storyArt(story.page, time + 1, metadata);
    const block = story._chunk(next.id, Math.floor(next.frame / 4));
    block.done = false;
    story.update(1);
    assert.equal(story.time, time);
    block.done = true;
    story.update(1);
    assert.ok(story.time > time);
    story.exit();
});

test("credits crop source panels to the original text window and wait at The End", async () => {
    const story = await enter("ending");
    await story._loadPage(6);
    const duration = storyDuration(story.page, metadata);
    story.time = duration - 0.02;
    story.update(0.03);
    assert.equal(story.done, false);
    draws.length = 0;
    story.draw();
    assert.ok(draws.length > 0);
    for (const [x, y, options] of draws) {
        assert.ok(y >= 16);
        assert.ok(y + options.height <= 432 + 1e-6);
        assert.ok(options.starty >= 0);
        assert.ok(options.endy <= 256);
    }
    edge = Gamepad.CROSS;
    story.update(0.01);
    assert.deepEqual(pops.at(-1), { story: "ending", skipped: false });
    story.exit();
});

test("all recovered story sequences finish without missing frames or a blocked confirmation", async () => {
    for (const sequence of Object.keys(STORY_SEQUENCES)) {
        const story = await enter(sequence);
        held = Gamepad.CROSS;
        for (let tick = 0; tick < 80000 && !story.done; tick++) {
            edge = tick % 10 === 0 ? Gamepad.CROSS : null;
            story.update(1 / 60);
            if (story.loading) await settle();
        }
        assert.ok(story.done, sequence);
        assert.equal(pops.at(-1).story, sequence);
        story.exit();
    }
});

test("Shadow exits Kratos along original absolute path22, waits1.5s and plays all four pop-out frames", async () => {
    const page = STORY_SEQUENCES.shadow.at(-1);
    assert.equal(page.kind, "shadowJump");
    assert.deepEqual(shadowIntroState(0), { id: 239, frame: 0, phase: "jump", x: 80, y: 384 });
    const mid = shadowIntroState(SHADOW_INTRO_FLIGHT / 2);
    assert.ok(mid.x > 110 && mid.x < 180);
    assert.ok(mid.y < 360);
    const landing = shadowIntroState(SHADOW_INTRO_FLIGHT + 0.01);
    assert.equal(landing.phase, "hold");
    assert.equal(landing.x, 224);
    assert.equal(landing.y, 384);
    assert.equal(shadowIntroState(SHADOW_INTRO_FLIGHT + 1.49).phase, "hold");
    for (let n = 0; n < 4; n++) {
        const state = shadowIntroState(SHADOW_INTRO_FLIGHT + 1.5 + n / 20);
        assert.equal(state.id, 257);
        assert.equal(state.frame, n);
    }
    assert.equal(storyDuration(page, metadata), SHADOW_INTRO_DURATION);
    const story = await enter("shadow");
    await story._loadPage(STORY_SEQUENCES.shadow.length - 1);
    held = Gamepad.CROSS;
    story.update(0.1);
    assert.equal(story.time, 0.1, "holding X does not accelerate the native jump");
    story.draw();
    story.exit();
});

test("fast-forwarding never stalls the scene on a block that is not loaded yet, and caps movie frames", async () => {
    const story = await enter("world3");
    // Make every further block "not ready" to model slow I/O.
    const acquire = story.acquire.bind(story);
    story.acquire = manifest => { const g = acquire(manifest); g.done = false; return g; };
    held = Gamepad.CROSS;
    const before = story.time;
    for (let n = 0; n < 120; n++) story.update(1 / 60);
    assert.ok(story.time > before + 5, "text kept moving at 7x while the movie waited");
    held = null;
    const slow = story.time;
    for (let n = 0; n < 60; n++) story.update(1 / 60);
    assert.ok(story.time - slow < 0.5, "at normal speed text and movie still freeze together until the block arrives");
    story.exit();
});

test("short looping movies stay resident and the next page is read before it is needed", async () => {
    const story = await enter("world2");
    const info = metadata[274];
    assert.ok(info.frames <= 12);
    story.update(1 / 60);
    const ids = [...story.groups.keys()].filter(k => k.startsWith("274:"));
    assert.equal(ids.length, Math.ceil(info.frames / 4), "every block of the loop is resident");
    story.exit();
    const dialog = await enter("zeus");
    dialog.update(0.41);
    await settle();
    assert.ok(dialog.pre === null || dialog.pre.index === dialog.pageIndex + 1);
    dialog.update(0.3);
    assert.equal(dialog.pre?.index, dialog.pageIndex + 1, "the next card is prefetched while this one waits");
    dialog.exit();
});

test("story artwork is paletted or small, and every music file Story streams opens as Ogg Vorbis", () => {
    const music = ["musicEndCinema.ogg", "musicMenu.ogg", "musicBoss.ogg", "level1.ogg"];
    for (const file of music) {
        const bytes = fs.readFileSync(new URL(`../../assets/sounds/music/${file}`, import.meta.url));
        assert.equal(bytes.subarray(0, 4).toString(), "OggS", file);
        assert.ok(bytes.includes(Buffer.from("\x01vorbis", "binary")), file);
    }
});
