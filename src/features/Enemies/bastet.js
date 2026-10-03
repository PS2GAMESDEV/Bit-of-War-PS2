import { GAME_SCALE, LAYER, PLAYER_MOVEMENT as MOVE } from "../../shared/lib/constants.js";

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
const SPHINX_TIME = 5;
const BASTET_TIME = 3;
const IDLE_TIME = 3;
const ADVANCE_SPEED = 4 * GAME_SCALE; // Quarter of a tile per second, facing left.
const TORNADO_SPEED = 64 * GAME_SCALE;
const TORNADO_LIFETIME = 8;

// Both map placements belong to one boss, so a swing damages their shared
// health only once. A hit interrupts the fire with Bastet's counterattack.
export class Bastet {
    static health = 10;

    constructor(world, sheets, markers) {
        this.world = world;
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

    // Called after the introductory cutscene; currently the marker calls it
    // immediately because that cutscene has not been created yet.
    start() {
        if (this.started || !this.body || !this.parts.bastet) return;
        this.started = true;
        this._setState("sphinxAttack");
    }

    get hurtbox() {
        return this.started && this.health > 0 && this.state !== "bastetAttack" ? this.body : null;
    }

    get hurtboxes() {
        if (!this.hurtbox) return [];
        this.sync();
        const rider = this.parts.bastet;
        return [this.body, { x: rider.x, y: rider.y, w: RIDER_SIZE, h: RIDER_SIZE }];
    }

    get contactBox() {
        return this.started && this.health > 0 ? this.body : null;
    }

    hurt(fromX) {
        if (!this.started || this.health <= 0 || this.state === "bastetAttack") return;
        this._setState("bastetAttack");
        this._spawnTornado(this.target?.centerX ?? fromX);
    }

    // Hold the defeated boss in idle until its death sequence is implemented.
    // `dying` keeps Level.strike() from removing it immediately.
    die() {
        this.health = 0;
        this.dying = true;
        this._setState("defeated");
        for (const tornado of this.tornadoes) tornado.body.remove();
        this.tornadoes.length = 0;
    }

    _setState(state) {
        this.state = state;
        const sphinx = this.parts.sphinx;
        const rider = this.parts.bastet;
        if (state === "sphinxAttack") {
            this.timer = SPHINX_TIME;
            sphinx.play("attack", { restart: true });
            rider.play("walk", { restart: true });
            this.fire.play("burn", { restart: true });
        } else if (state === "bastetAttack") {
            this.timer = BASTET_TIME;
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

    update(target, dt) {
        this.target = target;
        this._updateTornadoes(dt);
        if (!this.started || this.health <= 0) return;

        // Spend only the time belonging to each phase, including a frame
        // that crosses its endpoint. The last fire frame still moves fully.
        let remaining = dt;
        while (remaining > 0) {
            const elapsed = Math.min(remaining, this.timer);
            this.parts.sphinx.update(elapsed);
            this.parts.bastet.update(elapsed);
            if (this.state === "sphinxAttack") {
                this.fire.update(elapsed);
                this.body.move(-ADVANCE_SPEED * elapsed, 0);
            } else if (this.state === "bastetAttack") {
                this.bastAttack.update(elapsed);
            }
            this.timer -= elapsed;
            remaining -= elapsed;
            if (this.timer <= 1e-9) {
                // Rest only after uninterrupted fire. A counterattack ends
                // by immediately returning to Sphinx's fire phase.
                this._setState(this.state === "sphinxAttack" ? "idle" : "sphinxAttack");
            }
        }
        this.sync();
    }

    _spawnTornado(targetX) {
        // Sphinx faces left: its rear is the right edge, whichever side the
        // player is on. Aim from that spawn point rather than its center.
        const x = this.body.right - TORNADO_SIZE;
        const y = this.body.bottom - TORNADO_SIZE;
        const dir = targetX > x + TORNADO_SIZE / 2 ? 1 : -1;
        const body = this.world.add({
            type: "dynamic", x, y, w: TORNADO_SIZE, h: TORNADO_SIZE,
            vx: dir * TORNADO_SPEED, layer: LAYER.ENEMY, mask: LAYER.SOLID,
            maxSpeedY: MOVE.MAX_FALL_SPEED
        });
        const sprite = new Sprite.Instance(this.tornadoSheet, {
            clip: "spin", scale: GAME_SCALE, x, y, autoUpdate: false, flipX: dir > 0
        });
        this.tornadoes.push({ body, sprite, time: TORNADO_LIFETIME });
    }

    _updateTornadoes(dt) {
        for (let i = this.tornadoes.length - 1; i >= 0; i--) {
            const tornado = this.tornadoes[i];
            tornado.sprite.update(dt);
            tornado.time -= dt;
            if (tornado.body.onWall || tornado.time <= 0) {
                tornado.body.remove();
                this.tornadoes.splice(i, 1);
            }
        }
    }

    // Attack effects are continuous hazards; tornadoes are spent on contact.
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
            const fromX = tornado.body.centerX;
            tornado.body.remove();
            this.tornadoes.splice(i, 1);
            return fromX;
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
        if (this.state === "sphinxAttack") this.fire.draw();
        else if (this.state === "bastetAttack") this.bastAttack.draw();
        for (const tornado of this.tornadoes) tornado.sprite.draw();
    }
}
