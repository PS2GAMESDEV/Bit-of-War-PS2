import { GAME_SCALE, LAYER, ORIGINAL_HZ } from "../../shared/lib/constants.js";
import { SHADOW_PATHS } from "../../data/shadowPaths.js";

const S = GAME_SCALE;
const SIZE = 16 * S;
const STEP = 1 / ORIGINAL_HZ;
const EPSILON = 1e-9;
const BODY_FRAMES = Object.freeze({
    walkL: [0, 1], walkR: [2, 3], jumpL: [4, 4], jumpR: [5, 5],
    attackR: [6, 6], attackL: [7, 7], hitL: [8, 27], hitR: [28, 47],
    defeat: [48, 135], popIn: [136, 139], popOut: [140, 143],
    zeusR: [144, 148], zeusL: [149, 153], float: [154, 154]
});
const image = (name, width, clips) => ({
    path: `images/enemies/shadow${name}.png`, frameWidth: width, frameHeight: 16, clips
});

// All clips are also available to the engine, although the controller selects
// frames itself so a paused scene cannot advance an attack animation.
export const SHADOW_SHEETS = Object.freeze({
    shadowBody: image("Body", 16, Object.fromEntries([
        ["walk", { frames: "0-1", fps: 4 }],
        ...Object.entries(BODY_FRAMES).map(([name, [first, last]]) =>
            [name, { frames: `${first}-${last}`, fps: ORIGINAL_HZ }])
    ])),
    shadowBladesRight: image("BladesRight", 48, { swing: { frames: "0-6", fps: ORIGINAL_HZ } }),
    shadowBladesLeft: image("BladesLeft", 48, { swing: { frames: "0-6", fps: ORIGINAL_HZ } }),
    shadowSpin: image("Spin", 80, { spin: { frames: "0-3", fps: ORIGINAL_HZ } }),
    shadowTransport: image("Transport", 32, { transport: { frames: "0-1", fps: ORIGINAL_HZ } }),
    shadowHammerRight: image("HammerRight", 16, { fly: { frames: "0-3", fps: 100 } }),
    shadowHammerLeft: image("HammerLeft", 16, { fly: { frames: "0-3", fps: 100 } }),
    shadowLightningLeft: image("LightningLeft", 16, { fly: { frames: "0-1", fps: ORIGINAL_HZ } }),
    shadowLightningRight: image("LightningRight", 16, { fly: { frames: "0-1", fps: ORIGINAL_HZ } })
});

// The binary stores these as absolute or relative GM paths. Distances and
// speeds here remain original pixels per 20 Hz step, scaled only at drawing.
export class PathMotion {
    constructor(id, speed, x = 0, y = 0, absolute = false) {
        this.points = SHADOW_PATHS[id];
        this.speed = speed;
        this.index = 0;
        this.x = this.points[0];
        this.y = this.points[1];
        this.offsetX = absolute ? 0 : x / S - this.x;
        this.offsetY = absolute ? 0 : y / S - this.y;
        this.done = false;
    }
    step() {
        let remaining = this.speed;
        while (remaining > 0 && !this.done) {
            const to = this.index + 2;
            if (to >= this.points.length) { this.done = true; break; }
            const dx = this.points[to] - this.x;
            const dy = this.points[to + 1] - this.y;
            const distance = Math.hypot(dx, dy);
            if (remaining >= distance) {
                this.x = this.points[to]; this.y = this.points[to + 1];
                remaining -= distance;
                this.index = to;
                this.done = this.index + 2 >= this.points.length;
            } else {
                this.x += dx / distance * remaining;
                this.y += dy / distance * remaining;
                remaining = 0;
            }
        }
        return { x: (this.x + this.offsetX) * S, y: (this.y + this.offsetY) * S };
    }
}

/** Three original Shadow encounters, simulated at their original 20 Hz.
 * The Level advances world physics separately. This controller moves its body
 * explicitly and leaves vx/vy zero, avoiding double integration at 60 Hz.
 */
export class ShadowKratos {
    static clip = "walk";
    static selfDrawn = true;
    static health = 100;
    static reward = "shadowStageComplete";

    // `options` lets the campaign Zeus and Thor reuse these original routines
    // (bossZeus/skZeus and bossThor/skThor differ only in art, damage, start and death):
    //   frames  pose table; sheets  body/transport/projectile sheet names; campaign  no pop-in
    //   and no Shadow-only sounds; transportY, spiralPath, walkFps  the room's own values.
    constructor(sprite, world, x, y, sheets, markers = {}, sfx = {}, phase = "final", options = {}) {
        this.frames = options.frames ?? BODY_FRAMES;
        this.names = {
            body: "shadowBody", transport: "shadowTransport",
            lightning: ["shadowLightningLeft", "shadowLightningRight"],
            hammer: ["shadowHammerLeft", "shadowHammerRight"], ...options.sheets
        };
        this.campaign = Boolean(options.campaign);
        this.transportY = options.transportY ?? 272 * S;
        this.spiralPath = options.spiralPath ?? 27;
        this.walkFps = options.walkFps ?? 0.2;
        this.phase = phase;
        this.world = world;
        this.sfx = sfx;
        this.sheets = sheets;
        this.health = this.maxHealth = 100;
        this.bossName = "Shadow Kratos";
        this.petrifiable = false;
        this.contactDamage = phase === "thor" ? 2 : 1;
        this.arrowDamage = 1;
        this.blockableContact = phase === "final";
        this.state = "appearing";
        this.stateTicks = 0;
        this.ticks = 0;
        this.accumulator = 0;
        this.direction = -1;
        this.started = false;
        this.dying = this.dead = false;
        this.completed = false;
        this.path = null;
        this.recoil = null;
        this.verticalSpeed = 0;
        this.projectiles = [];
        this.blade = null;
        this.cooldown = phase === "thor" ? 20 : 10;
        this.attackTicks = 0;
        this.volley = 0;
        this.view = null;
        this.body = world.add({
            type: "dynamic", x, y, w: SIZE, h: SIZE,
            layer: LAYER.ENEMY, mask: phase === "thor" ? LAYER.SOLID : 0,
            gravityScale: 0, vx: 0, vy: 0
        });
        this.sprite = sprite ?? this._sprite(this.names.body);
        this.spin = this._sprite("shadowSpin");
        // obHammerSpiral hovers 16 px above the floating Thor until it is launched.
        this.spiral = phase === "thor" ? this._sprite(this.names.hammer[1]) : null;
        this.transport = this._sprite(this.names.transport);
        this.bladesLeft = this._sprite("shadowBladesLeft");
        this.bladesRight = this._sprite("shadowBladesRight");
        this._pose("popIn", 0);
        this.sync();
    }

    _sprite(sheet) {
        return new Sprite.Instance(this.sheets[sheet], { scale: S, autoUpdate: false });
    }
    _pose(name, frame = 0) {
        const range = this.frames[name];
        if (!range) return;
        const [first, last] = range;
        this.sprite.frame = first + Math.min(Math.max(0, Math.floor(frame)), last - first);
    }
    get hurtbox() {
        return this.started && (this.state === "walking" || this.state === "zeus") ? this.body : null;
    }
    get contactBox() {
        if (!this.started || this.dying || this.state === "appearing" || this.state === "hurt" || this.state === "floating") return null;
        if (this.state === "spinning") return { x: this.body.x - 32 * S, y: this.body.y, w: 80 * S, h: SIZE };
        return this.state === "walking" || this.state === "zeus" ? this.body : null;
    }
    damageFor(weapon = "blade") {
        if (weapon === "gorgon") return 0;
        const damages = this.phase === "zeus" ? { lightning: 10, hammer: 33, spin: 20 }
            : this.phase === "thor" ? { lightning: 10, hammer: 10, spin: 33 }
                : { lightning: 5, hammer: 5, spin: 20 };
        return damages[weapon] ?? 20;
    }

    hurt(fromX) {
        if (this.dying || !this.hurtbox) return;
        this.state = "hurt";
        this.stateTicks = 0;
        this.attackTicks = 0;
        this.blade = null;
        if (!this.campaign) this.sfx.shadowHurt?.play();    // the Level plays it for Zeus and Thor
        this.body.mask = this.phase === "zeus" ? 0 : LAYER.SOLID;
        this.recoil = this.phase === "zeus" ? null : new PathMotion(fromX < this.body.centerX ? 2 : 1, 6, this.body.x, this.body.y);
        this.recoilLast = this.recoil ? { x: this.body.x, y: this.body.y } : null;
        this.verticalSpeed = 0;
        this._pose(this.direction < 0 ? "hitL" : "hitR");
    }
    die() {
        if (this.dying) return;
        this.health = 0;
        this.dying = true;
        this.blade = null;
        this.state = this.phase === "final" ? "defeat" : "disappearing";
        this.stateTicks = 0;
        this.body.mask = 0;
        if (this.phase === "final") {
            this.sfx.shadowDefeat?.play();
            this._pose("defeat");
        } else this._pose("popOut");
    }

    update(target, dt, view) {
        if (this.dead) return;
        this.view = view;
        this.target = target;
        if (!this.started) {
            const b = this.body;
            if (view && (b.right <= view.x || b.x >= view.x + view.w || b.bottom <= view.y || b.y >= view.y + view.h)) return;
            this.started = true;
        }
        this.accumulator += dt;
        while (this.accumulator + EPSILON >= STEP && !this.dead) {
            this.accumulator -= STEP;
            this.ticks++;
            this._step(target);
        }
        this.sync();
    }

    _step(target) {
        this._stepProjectiles();
        this.stateTicks++;
        if (this.state === "appearing") {
            this._pose("popIn", this.stateTicks);
            if (this.stateTicks >= (this.campaign ? 1 : 4)) this._resumeCombat(target, true);
        } else if (this.state === "disappearing") {
            this._pose("popOut", this.stateTicks);
            if (this.stateTicks >= 4) this._complete();
        } else if (this.state === "defeat") {
            this._pose("defeat", Math.min(51, this.stateTicks / 2));
            if (this.stateTicks > 101) {
                this.body.setPosition(this.body.x, this.body.y - 15 * S);
                if (this.body.y < -55 * S) this._complete();
            }
        } else if (this.state === "hurt") {
            this._pose(this.direction < 0 ? "hitL" : "hitR", this.stateTicks);
            // bossThorOuch/skOuch: the path moves it while its own step event keeps applying
            // gravity (.98 per step), so it slides sideways and does not stay up in the air.
            if (this.recoil && !this.recoil.done) {
                const p = this.recoil.step();
                this.body.move(p.x - this.recoilLast.x, p.y - this.recoilLast.y);
                this.recoilLast = p;
            }
            if (this.phase !== "zeus") this._fall();
            if (this.stateTicks >= 20) {
                if (this.phase === "zeus") this._startTransport();
                else if (this.phase === "thor") {
                    this.state = "floating";
                    this.stateTicks = 0;
                    this.body.mask = 0;
                    this.sfx.zeusTransport?.play();
                } else this._resumeCombat(target);
            }
        } else if (this.state === "transporting") this._transportStep();
        else if (this.state === "floating") this._floatStep(target);
        else if (this.state === "spinning") {
            this._bladeAlarm();
            const p = this.path.step();
            this.body.setPosition(p.x, p.y);
            if (this.path.done) {
                this.path = null;
                this.state = "walking";
                this.stateTicks = 0;
                this.sfx.shadowSpin?.stop?.();
            }
        } else if (this.phase === "zeus") this._zeusStep();
        else if (this.phase === "thor") this._thorStep();
        else this._finalStep();
        if (this.blade && (++this.blade.age >= 5 || this.blade.direction !== this.direction)) this.blade = null;
    }

    _resumeCombat(target, first = false) {
        this.state = this.phase === "zeus" ? "zeus" : "walking";
        this.stateTicks = this.attackTicks = this.volley = 0;
        if (this.phase === "final") this.direction = first ? -1 : target.centerX < this.body.centerX ? 1 : -1;
        else if (this.phase === "thor") this.direction = target.centerX < this.body.centerX ? -1 : 1;
        this.cooldown = this.phase === "thor" ? (this.health < 41 ? 10 : 20) : 10;
        this.body.mask = this.phase === "thor" ? LAYER.SOLID : 0;
        this.verticalSpeed = 0;
        this._pose(this.direction < 0 ? "walkL" : "walkR");
    }
    _bladeAlarm() {
        if (--this.cooldown > 0) return;
        this.cooldown = 10;
        if (this.state !== "walking") return;
        this.blade = { age: -1, direction: this.direction };
        this.sfx.blades?.play();
    }
    _finalStep() {
        this._bladeAlarm();
        this.body.setPosition(this.body.x + this.direction * 4 * S, this.body.y);
        if ((this.direction < 0 && this.body.x < 17 * S) || (this.direction > 0 && this.body.x > 239 * S)) {
            this.path = new PathMotion(this.direction < 0 ? 25 : 23, 10, 0, 0, true);
            this.direction *= -1;
            this.state = "spinning";
            this.stateTicks = 0;
            this.blade = null;
            this.sfx.shadowSpin?.play();
        } else this._pose(this.direction < 0 ? "walkL" : "walkR", (this.stateTicks * this.walkFps) % 2);
    }
    _zeusStep() {
        const schedule = this.health < 41 ? [10, 20, 30, 50] : [30, 60, 90, 120];
        if (this.volley < 3 && this.stateTicks >= schedule[this.volley]) {
            const shot = this.volley++;
            const ids = shot === 1 ? [11, 12] : [8, 9, 10];
            for (const id of ids) this._spawnProjectile(id + (this.direction > 0 ? 5 : 0), 10, "lightning");
            this.attackTicks = 2;
            this.sfx.zeusShoot?.play();
        }
        if (this.attackTicks) {
            this._pose(this.direction < 0 ? "zeusL" : "zeusR", 0);
            this.attackTicks = 0;
        } else this._pose(this.direction < 0 ? "walkL" : "walkR");
        if (this.stateTicks >= schedule[3]) this._startTransport();
    }
    _startTransport() {
        this.state = "transporting";
        this.stateTicks = 0;
        this.sfx.zeusTransport?.play();
    }
    _transportStep() {
        this.body.setPosition(this.body.x + this.direction * 20 * S, this.body.y);
        if ((this.direction < 0 && this.body.x < 16 * S) || (this.direction > 0 && this.body.x > 240 * S)) {
            this.body.setPosition((this.direction < 0 ? 16 : 240) * S, this.transportY);
            this.direction *= -1;
            this._resumeCombat(this.target);
        }
    }
    _groundAt(x, y) {
        return this.world.query(x, y, Math.max(1, 10 * S), S, LAYER.SOLID).some(b => !b.sensor);
    }
    // `jumped`: on the frame of the jump no gravity is set (the floor is still below), so the
    // first move is the full -9 px and the hop is 46 px high.
    _fall(jumped = false) {
        if (!jumped) this.verticalSpeed = Math.min(12 * S, this.verticalSpeed + 0.98 * S);
        this.body.move(0, this.verticalSpeed);
        if (this.body.onGround) this.verticalSpeed = 0;
    }
    _thorStep() {
        const b = this.body;
        const grounded = this._groundAt(b.x + 3 * S, b.bottom);
        // The grey masts only occupy the two room edges; the central solid
        // block is a crate to jump over, not a wall that reverses direction.
        if ((this.direction < 0 && b.x <= 16 * S) || (this.direction > 0 && b.x >= 240 * S)) this.direction *= -1;
        const ahead = this.direction < 0 ? b.x - 16 * S : b.right + 1;
        let jumped = false;
        if (grounded && (this._groundAt(ahead, b.y + 4 * S) || !this._groundAt(b.x + this.direction * 28 * S, b.bottom + S))) {
            this.verticalSpeed = -9 * S;
            jumped = true;
        }
        b.move(this.direction * 3 * S, 0);
        this._fall(jumped);
        if (--this.cooldown <= 0) {
            this.cooldown = this.health < 41 ? 10 : 20;
            this._spawnProjectile(this.direction < 0 ? 5 : 6, 8, "hammer");
            this.attackTicks = 10;
            this.sfx.shadowHammer?.play();
        }
        if (this.attackTicks > 0) {
            this.attackTicks--;
            this._pose(this.direction < 0 ? "attackL" : "attackR");
        } else if (!grounded) this._pose(this.direction < 0 ? "jumpL" : "jumpR");
        else this._pose(this.direction < 0 ? "walkL" : "walkR", (this.stateTicks * this.walkFps) % 2);
    }
    _floatStep(target) {
        this._pose("float");
        const view = this.view ?? { x: 0, y: 208 * S, w: 272 * S, h: 208 * S };
        const x = view.x + view.w / 2 - 8 * S;
        const y = view.y + view.h / 2 - 20 * S;
        const dx = x - this.body.x, dy = y - this.body.y;
        const distance = Math.hypot(dx, dy);
        const amount = Math.min(distance, 6 * S);
        if (distance > 0) this.body.setPosition(this.body.x + dx / distance * amount, this.body.y + dy / distance * amount);
        if (amount >= distance) {
            // bossThorFloat/skThorFloat: end the float sound, launch the spiral hammer (soundBastetTornado).
            this.sfx.zeusTransport?.stop?.();
            this.sfx.bastetTornado?.play();
            this._spawnProjectile(this.spiralPath, 20, "hammer", true);
            this._resumeCombat(target);
        }
    }
    _spawnProjectile(path, speed, kind, absolute = false) {
        const names = kind === "lightning" ? this.names.lightning : this.names.hammer;
        const sprite = this._sprite(names[this.direction < 0 ? 0 : 1]);
        const motion = new PathMotion(path, speed, this.body.x, this.body.y, absolute);
        this.projectiles.push({ motion, sprite, x: this.body.x, y: this.body.y, age: 0, kind });
    }
    _stepProjectiles() {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            const at = p.motion.step();
            p.x = at.x; p.y = at.y; p.age++;
            p.sprite.frame = p.kind === "hammer" ? (p.age * 5) % 4 : p.age % 2;
            if (p.motion.done) this.projectiles.splice(i, 1);
        }
    }
    _bladeBox() {
        return this.blade ? { x: this.body.x + (this.blade.direction < 0 ? -45 : 16) * S, y: this.body.y + 5 * S, w: 48 * S, h: SIZE } : null;
    }
    arrowHit(box) {
        const blade = this._bladeBox();
        if (blade && Collision.overlaps(box, blade)) return blade.x + blade.w / 2;
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            if (!Collision.overlaps(box, { x: p.x + 4 * S, y: p.y + 4 * S, w: 8 * S, h: 8 * S })) continue;
            this.projectiles.splice(i, 1);
            return p.x + 8 * S;
        }
        return null;
    }
    _complete() {
        this.completed = this.dead = true;
        this.projectiles.length = 0;
        this.body.remove();
    }
    sync() {
        if (this.dead) return;
        this.sprite.x = this.body.x;
        this.sprite.y = this.body.y;
        this.spin.x = this.body.x - 32 * S;
        this.spin.y = this.body.y;
        this.spin.frame = this.stateTicks % 4;
        if (this.spiral) { this.spiral.x = this.body.x; this.spiral.y = this.body.y - 16 * S; this.spiral.frame = 0; }
        this.transport.x = this.body.x;
        this.transport.y = this.body.y;
        this.transport.frame = this.stateTicks % 2;
        const box = this._bladeBox();
        if (box) {
            const sprite = this.blade.direction < 0 ? this.bladesLeft : this.bladesRight;
            sprite.x = box.x; sprite.y = box.y; sprite.frame = Math.max(0, this.blade.age);
        }
        for (const p of this.projectiles) { p.sprite.x = p.x; p.sprite.y = p.y; }
    }
    draw() {
        if (this.dead || !this.started) return;
        if (this.state === "spinning") this.spin.draw();
        else if (this.state === "transporting") this.transport.draw();
        else this.sprite.draw();
        if (this.state === "floating" && this.spiral) this.spiral.draw();
        if (this.blade) (this.blade.direction < 0 ? this.bladesLeft : this.bladesRight).draw();
        for (const p of this.projectiles) p.sprite.draw();
    }
}

export class ShadowZeus extends ShadowKratos {
    constructor(sprite, world, x, y, sheets, markers, sfx) {
        super(sprite, world, x, y, sheets, markers, sfx, "zeus");
    }
}
export class ShadowThor extends ShadowKratos {
    constructor(sprite, world, x, y, sheets, markers, sfx) {
        super(sprite, world, x, y, sheets, markers, sfx, "thor");
    }
}
