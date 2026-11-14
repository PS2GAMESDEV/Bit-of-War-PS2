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
const SPHINX_TIME = stepsToSeconds(100);
const IDLE_TIME = stepsToSeconds(60);
const ADVANCE_SPEED = pxPerStep(0.5);
const TORNADO_SPEED = pxPerStep(5);
const FINISH_FPS = 0.4 * ORIGINAL_HZ;
const RECOIL = 20 * GAME_SCALE;

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
        this.sfx.bastetTornado?.play();
    }

    die() {
        if (this.state === "idle") this.body.move(RECOIL, 0);
        this.sfx.thorDizzy?.play();
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
        this.sfx.bastetGrunt?.play();
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

    _fireLoop(on) {
        if (on === this.firing) return;
        this.firing = on;
        if (on) this.sfx.bastetFire?.play();
        else this.sfx.bastetFire?.stop?.();
    }

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
