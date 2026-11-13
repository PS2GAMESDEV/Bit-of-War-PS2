import { GAME_SCALE, LAYER, ORIGINAL_HZ, stepsToSeconds, pxPerStep } from "../../shared/lib/constants.js";

const RIDER_SIZE = 16 * GAME_SCALE;
const SPHINX_SIZE = 128 * GAME_SCALE;
const FIRE_W = 64 * GAME_SCALE;
const FIRE_H = 96 * GAME_SCALE;
const FIRE_INSET = 16 * GAME_SCALE;
const BAST_W = 32 * GAME_SCALE;
const BAST_H = 128 * GAME_SCALE;
const TORNADO_SIZE = 32 * GAME_SCALE;
const TORNADO_HIT_SIZE = 16 * GAME_SCALE;
const TORNADO_HIT_INSET = (TORNADO_SIZE - TORNADO_HIT_SIZE) / 2;
const SPHINX_TIME = stepsToSeconds(100);      // alarm 1 -> 0: fire for 100 steps
const IDLE_TIME = stepsToSeconds(60);
const ADVANCE_SPEED = pxPerStep(0.5);          // -0.5 px per step
const TORNADO_SPEED = pxPerStep(5);            // -5 px per step
const FINISH_FPS = 0.4 * ORIGINAL_HZ;          // stoning/finishing sprites at image_speed .4
const RECOIL = 20 * GAME_SCALE;

// Both map placements belong to one boss, so a swing damages their shared
// health only once. Only the breathing pause is vulnerable; a successful hit
// triggers Bastet's shield and tornado until it crosses the viewport.
export class Bastet {
    static health = 5;
    static reward = "gotBladeStorm";
    static contactDamage = 2;

    constructor(world, sheets, markers, sfx = {}) {
        this.world = world;
        this.sfx = sfx;
        this.startMarker = markers.startCutscene?.[0] ?? null;
        this.health = Bastet.health;
        this.state = "idle";
        this.started = false;
        this.dying = false;
        this.dead = false;
        this.timer = 0;
        this.parts = {};
        this.body = null;
        this.riderOffset = null;
        this.target = null;
        this.view = null;
        this.firing = false;
        this.hitDelay = 0;
        this.finishSheets = sheets;
        this.finishTime = 0;
        this.tornadoSheet = sheets.thunderAttack;
        this.tornadoes = [];
        this.fire = new Sprite.Instance(sheets.fireAttack, { scale: GAME_SCALE, autoUpdate: false });
        this.bastAttack = new Sprite.Instance(sheets.bastAttack, { scale: GAME_SCALE, autoUpdate: false });
    }

    addPart(name, sheet, x, y) {
        const sprite = new Sprite.Instance(sheet, {
            clip: "idle", scale: GAME_SCALE, x, y, autoUpdate: false
        });
        this.parts[name] = sprite;
        if (name === "sphinx") {
            this.body = this.world.add({
                type: "dynamic", x, y, w: SPHINX_SIZE, h: SPHINX_SIZE,
                layer: LAYER.ENEMY, mask: LAYER.SOLID, gravityScale: 0
            });
        }
        if (this.parts.bastet && this.parts.sphinx) {
            this.riderOffset = {
                x: this.parts.bastet.x - this.parts.sphinx.x,
                y: this.parts.bastet.y - this.parts.sphinx.y
            };
        }
        return sprite;
    }

    shouldStart(target) {
        return !this.started && this.startMarker && this.body && this.parts.bastet &&
            target.centerX >= this.startMarker.x;
    }

    // Called after the introductory cutscene.
    start() {
        if (this.started || !this.body || !this.parts.bastet) return;
        this.started = true;
        this._setState("sphinxAttack");
    }

    get hurtbox() {
        return this.started && this.health > 0 && this.state === "idle" && this.hitDelay <= 0 ? this.body : null;
    }

    get hurtboxes() {
        if (this.state === "finishReady") return [this.finisherBox];
        if (!this.hurtbox) return [];
        this.sync();
        const rider = this.parts.bastet;
        return [this.body, { x: rider.x, y: rider.y, w: RIDER_SIZE, h: RIDER_SIZE }];
    }

    get contactBox() {
        return this.started && this.health > 0 ? this.body : null;
    }

    // Original bossSphinx/Collision 27,105,116. No handler for spin/121.
    // Hammer receives an additional 30/100 when its y coordinate is above 320.
    damageFor(kind, hitbox) {
        if (this.state === "finishReady") return kind === "blade" ? 1 : 0;
        if (!this.hurtbox) return 0;
        if (kind === "blade") return 17 / 20;
        if (kind === "lightning") return 5 / 20;
        if (kind === "hammer") return (10 + (hitbox?.y < 320 * GAME_SCALE ? 30 : 0)) / 20;
        return 0;
    }

    hurt(fromX) {
        if (!this.started || this.health <= 0 || this.state !== "idle") return;
        this.hitDelay = stepsToSeconds(5);
        this.body.move(RECOIL, 0);
        this._setState("bastetAttack");
        this._spawnTornado();
        this.sfx.bastetTornado?.play();   // bossBastet: soundBastetTornado
    }

    // The empty life bar stuns the mount; it still needs the Gorgon finisher.
    die() {
        if (this.state === "idle") this.body.move(RECOIL, 0);
        this.sfx.thorDizzy?.play();       // stunnedBastet/Create: soundThorDizzy
        this.health = 0;
        this.dying = true;
        this._setState("defeated");
        for (const tornado of this.tornadoes) tornado.body.remove();
        this.tornadoes.length = 0;
    }

    get finisherBox() {
        if (this.state === "defeated") return this.body;
        if (this.state !== "finishReady") return null;
        return { x: this.fallen.x, y: this.fallen.y, w: RIDER_SIZE, h: RIDER_SIZE };
    }

    // The original requires the Gorgon Head on the stunned mount, then a
    // blade hit on the fallen rider; emptying the life bar alone is not a win.
    gorgonize() {
        if (this.state !== "defeated") return false;
        this.state = "stoning";
        this.sfx.bastetStone?.play();
        this.finishTime = 0;
        this.stone = new Sprite.Instance(this.finishSheets.bastetStone, { scale: GAME_SCALE, autoUpdate: false });
        this.fallen = new Sprite.Instance(this.finishSheets.bastetFall, { scale: GAME_SCALE, autoUpdate: false,
            x: this.parts.bastet.x, y: this.parts.bastet.y });
        this.fallStart = { x: this.fallen.x, y: this.fallen.y };
        this.parts.sphinx.color = this.parts.bastet.color = Color.new(128, 128, 128, 0);
        return true;
    }

    deathHit(kind = "blade") {
        if (this.state !== "finishReady" || kind !== "blade") return;
        this.state = "finishing";
        this.sfx.bastetFinish?.play();
        this.sfx.bastetGrunt?.play();     // stunnedBastet: soundThorCrumble + soundBastetGrunt
        this.finishTime = 0;
        this.fallen = new Sprite.Instance(this.finishSheets.bastetFinish, { scale: GAME_SCALE, autoUpdate: false,
            x: this.fallen.x, y: this.fallen.y });
    }

    _setState(state) {
        this.state = state;
        this._fireLoop(state === "sphinxAttack" || state === "bastetAttack");
        const sphinx = this.parts.sphinx;
        const rider = this.parts.bastet;
        if (state === "sphinxAttack") {
            this.timer = SPHINX_TIME;
            sphinx.play("attack", { restart: true });
            rider.play("walk", { restart: true });
            this.fire.play("burn", { restart: true });
        } else if (state === "bastetAttack") {
            // Reset by the counterattack tornado crossing the viewport's left
            // edge (object245/Step), rather than a fixed three-second timer.
            this.timer = (this.view?.w ?? 272 * GAME_SCALE) / TORNADO_SPEED;
            sphinx.play("hit", { restart: true });
            rider.play("attack", { restart: true });
            this.bastAttack.play("attack", { restart: true });
        } else {
            this.timer = state === "idle" ? IDLE_TIME : 0;
            sphinx.play("idle", { restart: true });
            rider.play("idle", { restart: true });
        }
        this.sync();
    }

    // soundBastetSphinxFire loops from the Sphinx's attack until the tornado
    // has crossed the viewport, and is cut when it breathes in or is stunned.
    _fireLoop(on) {
        if (on === this.firing) return;
        this.firing = on;
        if (on) this.sfx.bastetFire?.play();
        else this.sfx.bastetFire?.stop?.();
    }

    // The attack and counterattack effects block weapons ("arrow blocked" noise).
    get deflectBoxes() {
        if (!this.started || this.health <= 0 || this.state === "idle" || this.state === "defeated") return [];
        const rider = this.parts.bastet;
        return [this.body, { x: rider.x, y: rider.y, w: RIDER_SIZE, h: RIDER_SIZE }];
    }

    update(target, dt, view) {
        this.target = target;
        this.view = view ?? this.view;
        this.hitDelay = Math.max(0, this.hitDelay - dt);
        if (this.state === "stoning" || this.state === "finishing") {
            this.finishTime += dt;
            if (this.state === "stoning") {
                this.stone.frame = Math.min(12, Math.floor(this.finishTime * FINISH_FPS));
                const t = Math.min(1, this.finishTime / 1.2);
                this.fallen.frame = Math.min(3, Math.floor(t * 4));
                this.fallen.x = this.fallStart.x - 48 * GAME_SCALE * t;
                this.fallen.y = this.fallStart.y + (this.body.bottom - RIDER_SIZE - this.fallStart.y) * t * t;
                if (this.finishTime >= 13 / FINISH_FPS) {
                    this.state = "finishReady";
                    this.fallen = new Sprite.Instance(this.finishSheets.bastetStunned, { scale: GAME_SCALE,
                        x: this.fallen.x, y: this.fallen.y });
                }
            } else {
                this.fallen.frame = Math.min(32, Math.floor(this.finishTime * FINISH_FPS));
                if (this.finishTime >= 33 / FINISH_FPS) {
                    this.dead = true;
                    this.body.remove();
                }
            }
            return;
        }
        if (!this.started || this.health <= 0) return;

        // Spend only the time belonging to each phase, including a frame
        // that crosses its endpoint. The last fire frame still moves fully.
        let remaining = dt;
        while (remaining > 0) {
            if (this.state === "bastetAttack" && this.tornadoes.length) {
                this.timer = Math.max(0, (this.tornadoes[0].body.x - (this.view?.x ?? 0)) / TORNADO_SPEED);
            }
            const elapsed = Math.min(remaining, this.timer);
            this.parts.sphinx.update(elapsed);
            this.parts.bastet.update(elapsed);
            if (this.state === "sphinxAttack") {
                this.fire.update(elapsed);
                this.body.move(-ADVANCE_SPEED * elapsed, 0);
            } else if (this.state === "bastetAttack") {
                this.bastAttack.update(elapsed);
                this._updateTornadoes(elapsed);
            }
            this.timer -= elapsed;
            remaining -= elapsed;
            if (this.timer <= 1e-9) {
                if (this.state === "bastetAttack") {
                    for (const tornado of this.tornadoes) tornado.body.remove();
                    this.tornadoes.length = 0;
                }
                // Fire lasts100 steps, idle60. Counterattack ends when its
                // tornado crosses the camera, then starts a fresh fire cycle.
                this._setState(this.state === "sphinxAttack" ? "idle" : "sphinxAttack");
            }
        }
        this.sync();
    }

    _spawnTornado() {
        const x = this.view ? this.view.x + this.view.w : this.body.right;
        const y = 368 * GAME_SCALE;
        const body = this.world.add({
            type: "kinematic", x, y, w: TORNADO_SIZE, h: TORNADO_SIZE,
            layer: LAYER.ENEMY, mask: 0, gravityScale: 0
        });
        const sprite = new Sprite.Instance(this.tornadoSheet, {
            clip: "spin", scale: GAME_SCALE, x, y, autoUpdate: false
        });
        this.tornadoes.push({ body, sprite });
    }

    _updateTornadoes(dt) {
        for (let i = this.tornadoes.length - 1; i >= 0; i--) {
            const tornado = this.tornadoes[i];
            tornado.sprite.update(dt);
            tornado.body.move(-TORNADO_SPEED * dt, 0);
        }
    }

    // All original attack effects persist on contact. Player invulnerability
    // prevents every overlapping frame from counting as a fresh hit.
    // Like other boss projectiles, neither can be blocked by the player.
    arrowHit(box) {
        this.sync();
        const effect = this.state === "sphinxAttack" ? this.fire
            : this.state === "bastetAttack" ? this.bastAttack : null;
        if (effect) {
            const w = effect === this.fire ? FIRE_W : BAST_W;
            const h = effect === this.fire ? FIRE_H : BAST_H;
            if (Collision.overlaps(box, { x: effect.x, y: effect.y, w, h })) return effect.x + w / 2;
        }
        for (let i = this.tornadoes.length - 1; i >= 0; i--) {
            const tornado = this.tornadoes[i];
            const hitbox = {
                x: tornado.body.x + TORNADO_HIT_INSET,
                y: tornado.body.y + TORNADO_HIT_INSET,
                w: TORNADO_HIT_SIZE, h: TORNADO_HIT_SIZE
            };
            if (!Collision.overlaps(box, hitbox)) continue;
            return tornado.body.centerX;
        }
        return null;
    }

    sync() {
        if (!this.body) return;
        const sphinx = this.parts.sphinx;
        sphinx.x = this.body.x;
        sphinx.y = this.body.y;
        if (this.riderOffset) {
            this.parts.bastet.x = sphinx.x + this.riderOffset.x;
            this.parts.bastet.y = sphinx.y + this.riderOffset.y;
        }
        this.fire.x = this.body.x - FIRE_W + FIRE_INSET;
        this.fire.y = this.body.bottom - FIRE_H;
        this.bastAttack.x = this.body.x - BAST_W;
        this.bastAttack.y = this.body.bottom - BAST_H;
        for (const tornado of this.tornadoes) {
            tornado.sprite.x = tornado.body.x;
            tornado.sprite.y = tornado.body.y;
        }
    }

    // The two character sprites are already drawn with their map layers.
    draw() {
        if (this.stone) {
            this.stone.draw(this.body.x, this.body.y - 16 * GAME_SCALE);
            this.fallen.draw();
            return;
        }
        if (this.state === "sphinxAttack") this.fire.draw();
        else if (this.state === "bastetAttack") this.bastAttack.draw();
        for (const tornado of this.tornadoes) tornado.sprite.draw();
    }
}
