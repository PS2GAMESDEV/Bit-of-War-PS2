import { GAME_SCALE } from "../../shared/lib/constants.js";

const SIZE = 16 * GAME_SCALE;
const TRANSPORT_W = 32 * GAME_SCALE;
const TRANSPORT_H = 16 * GAME_SCALE;

// Which way the bossZeus art looks in the sheet (flipped to face the player).
const FACES_RIGHT = false;

const SPEED = 80 * GAME_SCALE;            // units per second, first float to zeusMove1
const TRANSPORT_SPEED = 320 * GAME_SCALE; // units per second between markers
const ATTACKS = 3;              // attacks at every zeusMove marker before he moves on
const ATTACK_INTERVAL = 3;      // seconds between the start of one attack and the next, at full health
const ATTACK_INTERVAL_MIN = 1.2;    // the same once all his health is gone
const TURN_DEADZONE = 2;

// The lightning: a fan of bolts flying down and away from him. Each entry is
// an angle below the horizontal; the first shot and the last use all of them,
// the middle one drops the lowest (the last entry).
const BOLT_ANGLES = [20, 45, 70].map(deg => deg * Math.PI / 180);
const BOLT_ART_ANGLE = 20 * Math.PI / 180;   // slope of the bolt drawn in the sheet
const BOLT_SPEED = 300;         // units per second at full health
const BOLT_SPEED_GAIN = 1;      // extra speed, as a fraction of BOLT_SPEED, once all his health is gone
const DEATH_HOLD = 0.8;         // seconds the last frame of "die" stays before he is removed
const HURT_TIME = 0.25;         // seconds the "damage" clip (frame 4) shows after a hit
const BOLT_SIZE = 8 * GAME_SCALE;   // side of the box that hurts
const BOLT_FRAME = 16 * GAME_SCALE;
const VIEW_MARGIN = 2 * 16 * GAME_SCALE;    // a bolt this far outside the camera disappears

/**
 * bossZeus: waits at his placement (clip "idle") until the camera sees him,
 * then floats (clip "float") to zeusMove1. On arrival he attacks ATTACKS times,
 * one every `attackInterval` seconds (BOLT_ANGLES bolts when the attack ends,
 * one fewer on the second), then travels to the other marker
 * (zeusMove2, zeusMove1, ...) as the zeusTransport sprite instead of himself,
 * and repeats. He has no body in the world.
 *
 * Other clips ready in the sheet: "damage" and "die".
 */
export class Zeus {
    static clip = "idle";
    static selfDrawn = true;
    static health = 10;

    constructor(sprite, world, x, y, sheets, markers, sfx) {
        this.sprite = sprite;
        this.sfxShoot = sfx?.zeusShoot;
        this.sfxTransport = sfx?.zeusTransport;
        this.dying = false;
        this.dead = false;          // the Level removes him once this is true
        this.deathTimer = 0;
        this.boltSheet = sheets.lighting;
        this.bolts = [];
        this.hurtTime = 0;
        this.attackInterval = ATTACK_INTERVAL;  // seconds; shortens as he loses health
        this.boltSpeed = BOLT_SPEED;    // units per second; raise it as he loses health
        this.transport = new Sprite.Instance(sheets.zeusTransport, { clip: "transport", scale: GAME_SCALE });
        this.transporting = false;
        this.x = x;
        this.y = y;
        this.stops = [markers.zeusMove1?.[0], markers.zeusMove2?.[0]].filter(Boolean);
        this.stop = 0;
        this.started = false;
        this.arrived = false;
        this.attacking = false;
        this.attacks = 0;
        this.cooldown = 0;
        this.facingRight = FACES_RIGHT;

        this.sprite.on("end", () => this._attackEnded());
    }

    // Box the blade can hit: only while he is on the scene and not in transport.
    get hurtbox() {
        return this.started && !this.transporting && !this.dying ? { x: this.x, y: this.y, w: SIZE, h: SIZE } : null;
    }

    // Hit: shows the "damage" clip and the bolts get faster as his health runs out.
    hurt() {
        const lost = 1 - Math.max(this.health, 0) / Zeus.health;

        this.boltSpeed = BOLT_SPEED * (1 + BOLT_SPEED_GAIN * lost);
        this.attackInterval = ATTACK_INTERVAL + (ATTACK_INTERVAL_MIN - ATTACK_INTERVAL) * lost;
        this.hurtTime = HURT_TIME;
        this.sprite.play("damage", { restart: true });
    }

    // Out of health: plays "die" (once) and is removed by the Level a moment after it ends.
    die() {
        this.dying = true;
        this.transporting = false;
        this.bolts.length = 0;
        this.deathTimer = Infinity;
        this.sprite.flipX = this.facingRight !== FACES_RIGHT;
        this.sprite.play("die", { restart: true });
    }

    // A bolt that touches `box` is spent: returns its center x, or null.
    arrowHit(box) {
        const bolts = this.bolts;

        for (let i = bolts.length - 1; i >= 0; i--) {
            const { x, y } = bolts[i];
            if (!Collision.overlaps(box, { x: x - BOLT_SIZE / 2, y: y - BOLT_SIZE / 2, w: BOLT_SIZE, h: BOLT_SIZE })) continue;

            bolts.splice(i, 1);
            return x;
        }
        return null;
    }

    update(target, dt, view) {
        if (this.dying) {
            if ((this.deathTimer -= dt) <= 0) this.dead = true;
            return;
        }

        this._moveBolts(dt, view);
        if (this.hurtTime > 0 && (this.hurtTime -= dt) <= 0) this._recover();

        if (!this.started) {
            const visible = this.x + SIZE > view.x && this.x < view.x + view.w &&
                this.y + SIZE > view.y && this.y < view.y + view.h;
            if (!visible || this.stops.length === 0) return;

            this.started = true;
            this.sprite.play("float");
        }

        if (!this.arrived) this._fly(dt);
        else this._attack(dt);

        const toPlayer = target.centerX - (this.x + SIZE / 2);
        if (Math.abs(toPlayer) > TURN_DEADZONE) this.facingRight = toPlayer > 0;
        this.sprite.flipX = this.facingRight !== FACES_RIGHT;
    }

    _fly(dt) {
        const to = this.stops[this.stop];
        const dx = to.x - this.x;
        const dy = to.y - this.y;
        const distance = Math.hypot(dx, dy);
        const step = Math.min((this.transporting ? TRANSPORT_SPEED : SPEED) * dt, distance);

        if (distance > 0) {
            this.x += (dx / distance) * step;
            this.y += (dy / distance) * step;
        }

        if (step >= distance) {
            this.arrived = true;
            this.transporting = false;
            this.attacks = 0;
            this.cooldown = 0;   // the first attack comes right away
        }
    }

    _attack(dt) {
        this.cooldown -= dt;
        if (this.attacking || this.cooldown > 0) return;

        this.attacking = true;
        this.attacks++;
        this.cooldown = this.attackInterval;
        this.sprite.play("attack", { restart: true });
    }

    // The attack clip plays once; after the last attack he moves to the next marker.
    _attackEnded() {
        if (this.dying) {
            this.deathTimer = DEATH_HOLD;
            return;
        }
        if (!this.attacking) return;

        this.attacking = false;
        this.sprite.play("idle");
        this._strike();

        if (this.attacks >= ATTACKS) {
            this.arrived = false;
            this.transporting = true;
            this.transport.play("transport", { restart: true });
            this.sfxTransport?.play();
            this.stop = (this.stop + 1) % this.stops.length;
        }
    }

    // The hit is over: back to the clip he was in. An attack cut short by the
    // hit is finished now.
    _recover() {
        this.sprite.play(this.arrived ? "idle" : "float");
        if (this.attacking) this._attackEnded();
    }

    // Lightning from his center, towards the side the player is on.
    _strike() {
        const count = this.attacks === 2 ? BOLT_ANGLES.length - 1 : BOLT_ANGLES.length;
        const dir = this.facingRight ? 1 : -1;

        this.sfxShoot?.play();
        const x = this.x + SIZE / 2;
        const y = this.y + SIZE / 2;

        for (let i = 0; i < count; i++) {
            const angle = BOLT_ANGLES[i];
            const sprite = new Sprite.Instance(this.boltSheet, {
                clip: "fly", scale: GAME_SCALE, origin: [0.5, 0.5], x, y, flipX: dir < 0
            });
            sprite.rotation = dir * (angle - BOLT_ART_ANGLE);
            this.bolts.push({ sprite, x, y, vx: dir * Math.cos(angle) * this.boltSpeed, vy: Math.sin(angle) * this.boltSpeed });
        }
    }

    // Bolts go through walls; they end only on the player (arrowHit) or outside the view plus VIEW_MARGIN.
    _moveBolts(dt, view) {
        const bolts = this.bolts;

        for (let i = bolts.length - 1; i >= 0; i--) {
            const bolt = bolts[i];

            bolt.x += bolt.vx * dt;
            bolt.y += bolt.vy * dt;
            bolt.sprite.x = bolt.x;
            bolt.sprite.y = bolt.y;

            const outside = bolt.x < view.x - VIEW_MARGIN - BOLT_FRAME || bolt.x > view.x + view.w + VIEW_MARGIN + BOLT_FRAME ||
                bolt.y < view.y - VIEW_MARGIN - BOLT_FRAME || bolt.y > view.y + view.h + VIEW_MARGIN + BOLT_FRAME;
            if (outside) bolts.splice(i, 1);
        }
    }

    // After the world step: the sprites follow.
    sync() {
        this.sprite.x = this.x;
        this.sprite.y = this.y;
        this.transport.x = this.x + (SIZE - TRANSPORT_W) / 2;
        this.transport.y = this.y + (SIZE - TRANSPORT_H) / 2;
    }

    draw() {
        (this.transporting ? this.transport : this.sprite).draw();
        for (const bolt of this.bolts) bolt.sprite.draw();
    }
}
