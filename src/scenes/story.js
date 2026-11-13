import { getLang } from "../shared/lang/lang.js";
import { SCREEN_HEIGHT, SCREEN_WIDTH, ORIGINAL_HZ } from "../shared/lib/constants.js";

// The data below was read as steps at 20 per second; `T` turns such seconds into seconds at
// ORIGINAL_HZ steps per second and `F` does the same for frames (or pixels) per second.
const RATE = ORIGINAL_HZ / 20;
const T = seconds => seconds / RATE;
const F = perSecond => perSecond * RATE;
import { PLAYER_CONTROLS as KEY } from "../shared/config/controls.js";

// IDs, sprite order, 20 Hz animation speeds and scroll endpoints were read
// from the GameMaker objects embedded in Bit of War 1.10.exe. Pixel data is
// kept unchanged (BGRA -> RGBA); all rasterized story text is original English.
// Frames are streamed four at a time. Tall text images are split into 256px
// panels so neither the credits nor an entire movie becomes one PS2 texture.
const CHUNK = 4;
const RESIDENT_FRAMES = 12;
// Fast-forwarding speeds the text by 7, but a movie is never asked for more than this many
// new frames per second: the PS2 decodes a PNG per frame, and beyond this it only drops frames.
const MAX_FAST_MOVIE_FPS = 40;
const BLACK = Color.new(0, 0, 0);
const WHITE = Color.new(255, 255, 255);
const PATH = "images/story";
const FRAME_PATH = (id, frame, part = 0) => `${PATH}/${id}/${frame}_${part}.png`;

// GameMaker smooth path22, precision4, expanded with the original runner's
// subdivision rule. Positions are absolute original-room pixels. Its first
// point is x80 even though skJumpOut briefly starts at the player's x57.
const SHADOW_INTRO_NODES = [[80.0, 384.0], [98.03125, 366.0625], [100.125, 364.25], [102.28125, 362.5625], [104.5, 361.0], [106.78125, 359.5625], [109.125, 358.25], [111.53125, 357.0625], [114.0, 356.0], [116.53125, 355.0625], [119.125, 354.25], [121.78125, 353.5625], [124.5, 353.0], [127.28125, 352.5625], [130.125, 352.25], [133.03125, 352.0625], [139.0, 352.03125], [142.0, 352.125], [145.0, 352.28125], [148.0, 352.5], [151.0, 352.78125], [154.0, 353.125], [157.0, 353.53125], [160.0, 354.0], [163.0, 354.53125], [166.0, 355.125], [169.0, 355.78125], [172.0, 356.5], [175.0, 357.28125], [178.0, 358.125], [181.0, 359.03125], [186.9375, 361.0], [189.75, 362.0], [192.4375, 363.0], [195.0, 364.0], [197.4375, 365.0], [199.75, 366.0], [201.9375, 367.0], [204.0, 368.0], [205.9375, 369.0], [207.75, 370.0], [211.0, 372.0], [213.75, 374.0], [224.0, 384.0]];
const SHADOW_INTRO_DISTANCES = [0];
for (let i = 1; i < SHADOW_INTRO_NODES.length; i++) {
    const a = SHADOW_INTRO_NODES[i - 1], b = SHADOW_INTRO_NODES[i];
    SHADOW_INTRO_DISTANCES.push(SHADOW_INTRO_DISTANCES[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1]));
}
const SHADOW_INTRO_LENGTH = SHADOW_INTRO_DISTANCES[SHADOW_INTRO_DISTANCES.length - 1];
export const SHADOW_INTRO_FLIGHT = SHADOW_INTRO_LENGTH / F(200); // 10 px per step.
export const SHADOW_INTRO_DURATION = SHADOW_INTRO_FLIGHT + 1.5 + T(4 / 20);

export function shadowIntroState(time) {
    const distance = Math.min(SHADOW_INTRO_LENGTH, Math.max(0, time * F(200)));
    let x = 224, y = 384;
    for (let i = 1; i < SHADOW_INTRO_NODES.length; i++) {
        if (distance > SHADOW_INTRO_DISTANCES[i]) continue;
        const a = SHADOW_INTRO_NODES[i - 1], b = SHADOW_INTRO_NODES[i];
        const length = SHADOW_INTRO_DISTANCES[i] - SHADOW_INTRO_DISTANCES[i - 1];
        const t = length ? (distance - SHADOW_INTRO_DISTANCES[i - 1]) / length : 1;
        x = a[0] + (b[0] - a[0]) * t;
        y = a[1] + (b[1] - a[1]) * t;
        break;
    }
    const popping = time >= SHADOW_INTRO_FLIGHT + 1.5;
    return { id: popping ? 257 : 239,
        frame: popping ? Math.min(3, Math.floor((time - SHADOW_INTRO_FLIGHT - 1.5) * ORIGINAL_HZ + 1e-8)) : 0,
        phase: popping ? "popOut" : time >= SHADOW_INTRO_FLIGHT ? "hold" : "jump", x, y };
}

const movie = (id, fps, extra = {}) => ({ id, fps: F(fps), ...extra,
    ...(extra.delay !== undefined ? { delay: T(extra.delay) } : {}), ...(extra.at !== undefined ? { at: T(extra.at) } : {}) });
const roll = (id, endY, extra = {}) => ({ id, y: 208, endY, speed: F(10), ...extra,
    ...(extra.hold !== undefined ? { hold: T(extra.hold) } : {}) });
const card = (id, extra = {}) => ({ art: movie(id, 0), wait: true, minTime: T(1), ...extra,
    ...(extra.timeout !== undefined ? { timeout: T(extra.timeout) } : {}) });
// spritedZeus1..: only A continues, after 20 steps, with soundSelector except on the
// last card; spriteBlinkyArrow blinks at (256, 192) from the first card on.
const dialog = (open, lines, close) => [
    { art: movie(open, 10) },
    ...lines.map((id, i) => card(id, { keys: "jump", arrow: true, sound: i < lines.length - 1 })),
    { art: movie(close, 10) }
];

export const STORY_SEQUENCES = Object.freeze({
    // CinemaSplash: spriteSTsplash1 for 60 steps, then spriteSTsplash2 for 60 steps.
    splash: [
        { art: movie(269, 0), duration: T(3) },
        { art: movie(270, 0), duration: T(3) }
    ],
    world1: [
        { art: movie(267, 1.4), scroll: roll(266, -350), backdrop: 265 },
        card(268, { timeout: 20 })
    ],
    zeus: dialog(318, [321, 323, 324, 325], 319),
    world2: [{
        // The second movie starts when the original text passes y=-71.
        art: [movie(274, 20, { loop: true }), movie(271, 5, { at: 27.9 })],
        scroll: roll(273, -658), backdrop: 272
    }],
    thor: dialog(326, [329, 330, 331, 332, 333, 334, 335], 328),
    world3: [
        { art: movie(275, 5), scroll: roll(277, -300), backdrop: 276 },
        card(278, { timeout: 20 }),
        { art: movie(279, 5), scroll: roll(281, -50), backdrop: 280 }
    ],
    bastet: [
        { art: movie(288, 17, { first: 0, last: 29 }) },
        { art: movie(288, 2, { first: 30, last: 44 }) },
        card(288, { frame: 45, keys: "jump", arrow: true, aButton: true, minTime: 0 }),
        // Frames 49-88: S, B, Down and Right grunt as Bastet; Up, Left and A as Kratos.
        { art: movie(288, 2, { first: 47, last: 94 }), grunts: { from: 49, to: 88 } },
        card(288, { frame: 96, minTime: 2, keys: "jump", arrow: true, sound: true }),
        card(288, { frame: 97, minTime: 2, keys: "jump", arrow: true, sound: true }),
        card(288, { frame: 98, minTime: 2, keys: "jump", arrow: true }),
        { art: movie(288, 17, { first: 99, last: 117 }) }
    ],
    world4: [
        { art: movie(282, 5), overlays: [
            { id: 283, y: 104, first: 0, last: 51 },
            { id: 284, y: 104, first: 52, last: 102 },
            { id: 285, y: 104, first: 103 }
        ] },
        // sprite4-4 waits a fixed 200-step alarm (not sped up by A) before it animates.
        { art: movie(289, 5, { delay: 10, realDelay: true }), scroll: roll(291, -60), backdrop: 290 }
    ],
    postGauntlet1: [{ art: movie(295, 2.8, { delay: 30.4 }), scroll: roll(297, -420), backdrop: 296 }],
    postGauntlet2: [{ art: movie(298, 5), overlays: [{ id: 299, y: 104 }] }],
    worldGone: [{ art: movie(292, 20, { delay: 20 }), triggerDelay: true, minTime: T(1), noFastForward: true }],
    shadow: [
        { art: movie(336, 10) },
        { scroll: roll(343, -283), backdrop: 344 },
        ...[338, 339, 341, 342].map(id => card(id)),
        { art: movie(337, 10) },
        { kind: "shadowJump", noFastForward: true, music: "boss" }
    ],
    ending: [
        { art: movie(302, 20, { loop: true }), scroll: roll(303, -88), backdrop: 304 },
        { art: movie(305, 3, { loop: true }), scroll: roll(307, -88), backdrop: 306 },
        { art: movie(286, 10), scroll: roll(287, 32, { y: 288, hold: 15 }), backdrop: 308 },
        { scroll: roll(311, -160), backdrop: 310 },
        { art: movie(313, 0), scroll: roll(314, -180) },
        { art: movie(315, 2.5, { loop: true }), scroll: roll(317, -160), backdrop: 316 },
        { art: movie(315, 2.5, { loop: true }), scroll: roll(352, -1692), backdrop: 316,
            waitAtEnd: true, music: "credits", keys: "jump" }
    ].map(page => ({ ...page, noFastForward: true }))   // textEnd1-6 and textCredits have no key to speed them up
});

// The in-level Bastet sequence is separate: play at shouldStart(), then start
// its AI after Story pops. It must not restart/rebuild that room on resume.
export const STORY_BEFORE_LEVEL = Object.freeze({
    0: "world1", 5: "zeus", 6: "world2", 10: "thor", 11: "world3",
    16: "world4", 18: "postGauntlet1", 20: "postGauntlet2", 22: "worldGone", 25: "shadow"
});

export function storyArt(page, time, metadata) {
    if (page.kind === "shadowJump") return shadowIntroState(time);
    const variants = Array.isArray(page.art) ? page.art : page.art ? [page.art] : [];
    let art = null;
    for (const variant of variants) if (time >= (variant.at ?? 0)) art = variant;
    if (!art) return null;
    const first = page.frame ?? art.first ?? 0;
    const last = art.last ?? metadata[art.id].frames - 1;
    const elapsed = Math.max(0, time - (art.at ?? 0) - (art.delay ?? 0));
    const offset = Math.floor(elapsed * art.fps + 1e-8);
    const count = last - first + 1;
    const frame = first + (art.loop ? offset % count : Math.min(offset, count - 1));
    return { ...art, frame, first, last };
}

export function storyDuration(page, metadata) {
    if (page.kind === "shadowJump") return SHADOW_INTRO_DURATION;
    if (page.scroll) return (page.scroll.y - page.scroll.endY) / page.scroll.speed + (page.scroll.hold ?? 0);
    if (page.wait) return Infinity;
    const art = Array.isArray(page.art) ? page.art[page.art.length - 1] : page.art;
    if (!art || !art.fps) return page.duration ?? Infinity;
    const count = (art.last ?? metadata[art.id].frames - 1) - (art.first ?? 0) + 1;
    return (art.at ?? 0) + (art.delay ?? 0) + count / art.fps;
}

// The original cinemas accept A, S, X, Z or Enter to continue, speed up only
// while A is held, and cannot be skipped.
const CONTINUE_KEYS = [KEY.JUMP, KEY.ATK, KEY.NEXT_POWER, KEY.SPECIAL, Gamepad.START];

export class Story extends Scene {
    static root = "assets";
    static assets(params) {
        const sequence = params?.sequence ?? "world1";
        const music = sequence === "ending"
            ? { cinema: { path: "sounds/music/musicEndCinema.ogg", loop: true },
                credits: { path: "sounds/music/musicMenu.ogg", loop: true } }
            : sequence === "shadow" ? { boss: { path: "sounds/music/musicBoss.ogg", loop: true } }
            : ["world1", "world2", "world3", "world4"].includes(sequence)
                ? { cinema: { path: "sounds/music/level1.ogg", loop: true } } : {};
        return {
            data: { metadata: `${PATH}/metadata.json` },
            music,
            sfx: {
                selector: "sounds/sfx/selector.adp", hurt: "sounds/sfx/soundHurt.adp",
                grunt: "sounds/sfx/bastetGrunt.adp"
            },
            fonts: { text: { path: "font/font.ttf", size: 12, preload: Font.ASCII } }
        };
    }

    async enter(assets, params) {
        const sequence = params?.sequence ?? "world1";
        this.pages = STORY_SEQUENCES[sequence];
        if (!this.pages) throw new Error(`Unknown story sequence: ${sequence}`);
        this.sequence = sequence;
        this.then = params?.then ?? null;
        this.metadata = assets.data.metadata;
        this.groups = new Map();
        this.done = false;
        this.closed = false;
        this.realTime = 0;
        this.audio = assets.music?.cinema;
        this.audio?.play();
        await this._loadPage(0);
    }

    // The statics and first blocks of page `index`, requested into `groups`.
    _pageResources(page, groups) {
        const images = {};
        if (page.kind === "shadowJump") images.shadowCorridor = `${PATH}/shadowCorridor.png`;
        const staticIds = new Set([page.backdrop, page.scroll?.id,
            ...(page.kind === "shadowJump" ? [27] : []),
            ...(page.overlays ?? []).map(overlay => overlay.id)].filter(id => id !== undefined));
        for (const id of staticIds) {
            for (let part = 0; part < this.metadata[id].parts; part++) images[`s${id}_${part}`] = FRAME_PATH(id, 0, part);
        }
        const statics = this.acquire({ images });
        if (page.arrow) this._chunk(322, 0, groups);
        if (page.aButton) this._chunk(357, 0, groups);
        const first = storyArt(page, 0, this.metadata);
        const firstGroup = first ? this._chunk(first.id, Math.floor(first.frame / CHUNK), groups) : null;
        if (first) this._chunk(first.id, Math.floor(first.frame / CHUNK) + 1, groups);
        return { statics, first, firstGroup };
    }

    // While a page plays, the next one is already being read, so changing pages does not stall.
    _prefetchNext(speed) {
        const next = this.pageIndex + 1;
        if (this.pre || next >= this.pages.length) return;
        const groups = new Map();
        this.pre = { index: next, groups, ...this._pageResources(this.pages[next], groups) };
    }

    _dropPrefetch() {
        if (!this.pre) return;
        this.pre.statics.release();
        for (const group of this.pre.groups.values()) group.release();
        this.pre = null;
    }

    async _loadPage(index) {
        this.loading = true;
        this._releasePage();
        if (this.pre && this.pre.index !== index) this._dropPrefetch();
        this.pageIndex = index;
        this.animStart = undefined;
        this.artClock = 0;
        this.page = this.pages[index];
        this.time = 0;
        this.realTime = 0;
        this.startTime = 0;
        let resources;
        if (this.pre?.index === index) {
            // Adopt what was prefetched.
            resources = this.pre;
            this.groups = this.pre.groups;
            this.pre = null;
        } else resources = this._pageResources(this.page, this.groups);
        this.statics = resources.statics;
        this.art = resources.first;
        await Promise.all([this.statics.ready, resources.firstGroup?.ready]);
        if (this.closed) return;
        if (this.page.music) {
            this.audio?.stop();
            this.audio = this.assets.music[this.page.music];
            this.audio?.play();
        }
        this.loading = false;
    }

    _releasePage() {
        this.statics?.release();
        this.statics = null;
        for (const group of this.groups.values()) group.release();
        this.groups.clear();
    }

    _chunk(id, index, groups = this.groups) {
        const info = this.metadata[id];
        if (index * CHUNK >= info.frames) return null;
        const key = `${id}:${index}`;
        if (!groups.has(key)) {
            const images = {};
            for (let n = index * CHUNK; n < Math.min((index + 1) * CHUNK, info.frames); n++) {
                for (let part = 0; part < info.parts; part++) images[`a${n}_${part}`] = FRAME_PATH(id, n, part);
            }
            groups.set(key, this.acquire({ images }));
        }
        return groups.get(key);
    }

    // `ahead` blocks are requested beyond the visible one: more while fast-forwarding, when the
    // movie would otherwise overtake the loader.
    _prepareArt(art, ahead = 1) {
        if (!art) return true;
        const chunk = Math.floor(art.frame / CHUNK);
        // A short movie that loops (a dozen frames or fewer) stays resident whole: reloading its
        // blocks on every pass is what makes fast-forwarding stutter.
        const whole = this.metadata[art.id].frames <= RESIDENT_FRAMES;
        if (whole) ahead = Math.ceil(this.metadata[art.id].frames / CHUNK);
        const group = this._chunk(art.id, chunk);
        if (group.failed) throw group.error;
        for (let n = 1; n <= ahead; n++) this._chunk(art.id, (chunk + n) % (whole ? ahead : Infinity));
        if (!group.done) return false;
        // Keep only the visible block and its successor. Looping movies can
        // reload block zero; their length never dictates resident RAM.
        const keep = new Set(["322:0", "357:0"]);
        for (let n = 0; n <= ahead; n++) keep.add(`${art.id}:${whole ? n : chunk + n}`);
        for (const [key, other] of this.groups) {
            if (!keep.has(key)) {
                other.release();
                this.groups.delete(key);
            }
        }
        return true;
    }

    update(dt) {
        if (this.loadError) throw this.loadError;
        if (this.done || this.loading) return;
        const pad = Gamepad.player(0);
        this.realTime += dt;

        const page = this.page;
        const confirm = (page.keys === "jump" ? [KEY.JUMP] : CONTINUE_KEYS).some(key => pad.justPressed(key));
        if (page.grunts && this.art && this.art.frame >= page.grunts.from && this.art.frame <= page.grunts.to) {
            if ([KEY.ATK, Gamepad.DOWN, Gamepad.RIGHT].some(key => pad.justPressed(key))) this.assets.sfx.grunt?.play();
            if ([KEY.JUMP, Gamepad.UP, Gamepad.LEFT].some(key => pad.justPressed(key))) this.assets.sfx.hurt?.play();
        }
        const speed = !page.wait && !page.noFastForward && pad.pressed(Gamepad.CROSS) ? 7 : 1;
        let nextTime = this.time + dt * speed;
        // Plain movies (no timing tied to the text) advance on their own, capped clock.
        const art0 = Array.isArray(page.art) ? null : page.art;
        const free = art0 && art0.fps > 0 && !art0.delay && !art0.at && !art0.realDelay && !page.triggerDelay;
        const artSpeed = free ? Math.min(speed, Math.max(1, MAX_FAST_MOVIE_FPS / art0.fps)) : speed;
        const nextArtClock = this.artClock + dt * artSpeed;
        if (page.triggerDelay && confirm && this.realTime >= page.minTime && this.time < page.art.delay) {
            nextTime = page.art.delay;
        }
        // A fixed real-time alarm gates the movie; A only speeds it up once it has started.
        const gate = page.art?.realDelay;
        if (gate && this.animStart === undefined && this.realTime >= page.art.delay) this.animStart = this.time;
        const artTime = gate ? (this.animStart === undefined ? 0 : nextTime - this.animStart + page.art.delay)
            : free ? nextArtClock : nextTime;
        const nextArt = storyArt(page, artTime, this.metadata);
        if (!this._prepareArt(nextArt, speed > 1 ? 3 : 1)) {
            // At normal speed text and movie freeze together while I/O catches up. Fast-forwarding
            // must not stall the whole scene on every block: the text keeps moving and the last
            // frame that is resident stays on screen until the movie's block arrives.
            if (speed === 1) return;
            this.time = nextTime;
            const clock = free && !page.scroll ? this.artClock : this.time;
            if (clock >= storyDuration(page, this.metadata) && (!page.waitAtEnd || confirm)) this._next();
            return;
        }
        this.time = nextTime;
        // Page ends soon (or can end at any key press): start reading the next one.
        if (page.wait || storyDuration(page, this.metadata) - (free && !page.scroll ? nextArtClock : nextTime) < 2.5 * speed) this._prefetchNext();
        if (free) this.artClock = nextArtClock;
        this.art = nextArt;
        const duration = storyDuration(page, this.metadata);
        const clock = free && !page.scroll ? this.artClock : this.time;
        const waitReady = page.wait && this.realTime >= (page.minTime ?? 1);
        if ((waitReady && confirm) || (page.timeout && this.time >= page.timeout) ||
            (clock >= duration && (!page.waitAtEnd || confirm))) this._next();
    }

    _next() {
        if (this.page.sound) this.assets.sfx.selector?.play();
        if (this.pageIndex + 1 >= this.pages.length) return this._finish(false);
        this._loadPage(this.pageIndex + 1).catch(error => { this.loadError = error; });
    }

    _finish(skipped) {
        if (this.done || Scene.busy) return;
        this.done = true;
        if (this.then) Scene.go(this.then);      // the boot splash leads to the main menu
        else Scene.pop({ result: { story: this.sequence, skipped } });
    }

    _drawResource(id, frame, x, y, staticResource = false, top = 0) {
        const info = this.metadata[id];
        const scale = 2;
        const left = (SCREEN_WIDTH - 272 * scale) / 2;
        const upper = (SCREEN_HEIGHT - 208 * scale) / 2;
        const group = staticResource ? this.statics : this.groups.get(`${id}:${Math.floor(frame / CHUNK)}`);
        if (!group?.done) return;
        for (let part = 0; part < info.parts; part++) {
            const image = group.assets.images[staticResource ? `s${id}_${part}` : `a${frame}_${part}`];
            if (!image) continue;
            const partY = y + part * 256;
            const height = Math.min(256, info.height - part * 256);
            const clipTop = Math.max(top, partY);
            const clipBottom = Math.min(208, partY + height);
            if (clipBottom <= clipTop) continue;
            image.draw(left + x * scale, upper + clipTop * scale, {
                width: info.width * scale, height: (clipBottom - clipTop) * scale,
                startx: 0, endx: info.width,
                starty: clipTop - partY, endy: clipBottom - partY
            });
        }
    }

    draw() {
        Screen.clear(BLACK);
        if (this.loading || this.done) return;
        Camera2D.screenSpace(() => {
            const page = this.page;
            if (page.kind === "shadowJump") {
                // Composed from the original room33's static sprite instances,
                // with its original lower view (y208), not an invented backdrop.
                this.statics.assets.images.shadowCorridor.draw((SCREEN_WIDTH - 544) / 2,
                    (SCREEN_HEIGHT - 416) / 2, { width: 544, height: 416 });
                this._drawResource(27, 0, 57, 384 - 208, true);
            }
            if (page.backdrop !== undefined) this._drawResource(page.backdrop, 0, 0, 0, true);
            if (page.scroll) {
                const scroll = page.scroll;
                const y = Math.max(scroll.endY, scroll.y - this.time * scroll.speed);
                this._drawResource(scroll.id, 0, 0, y, true, 118);
            }
            if (this.art) this._drawResource(this.art.id, this.art.frame,
                page.kind === "shadowJump" ? this.art.x : 0,
                page.kind === "shadowJump" ? this.art.y - 208 : 0);
            if (page.arrow && !this.loading) this._drawResource(322, Math.floor(this.time * 2.5) % 2, 256, 192);
            if (page.aButton) this._drawResource(357, Math.floor(this.time * 4) % 2, 36, 48);
            for (const overlay of page.overlays ?? []) {
                const frame = this.art?.frame ?? 0;
                if (frame >= (overlay.first ?? 0) && frame <= (overlay.last ?? Infinity)) {
                    this._drawResource(overlay.id, 0, 0, overlay.y ?? 0, true);
                }
            }
            const font = this.assets.fonts.text;
        });
    }

    exit() {
        this.closed = true;
        this._dropPrefetch();
        this.audio?.stop();
        this._releasePage();
    }
}

export default Story;
