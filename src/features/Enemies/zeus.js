import { GAME_SCALE } from "../../shared/lib/constants.js";

const SIZE = 16 * GAME_SCALE;
const TRANSPORT_W = 32 * GAME_SCALE;
const TRANSPORT_H = 16 * GAME_SCALE;

// Which way the bossZeus art looks in the sheet (flipped to face the player).
const FACES_RIGHT = false;

const SPEED = 80 * GAME_SCALE;            // units per second, first float to zeusMove1
const TRANSPORT_SPEED = 320 * GAME_SCALE; // units per second between markers
const ATTACKS = 3;              // attacks at every zeusMove marker before he moves on
const ATTACK_INTERVAL = 3;      // seconds between the start of one attack and the next
const TURN_DEADZONE = 2;

/**
 * bossZeus: waits at his placement (clip "idle") until the camera sees him,
 * then floats (clip "float") to zeusMove1. On arrival he attacks ATTACKS times,
 * one every ATTACK_INTERVAL seconds, then travels to the other marker
 * (zeusMove2, zeusMove1, ...) as the zeusTransport sprite instead of himself,
 * and repeats. He has no body in the world.
 *
 * Other clips ready in the sheet: "damage" and "die".
 */
export class Zeus {
    static clip = "idle";
    static selfDrawn = true;

    constructor(sprite, world, x, y, sheets, markers) {
        this.sprite = sprite;
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

    update(target, dt, view) {
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
        this.cooldown = ATTACK_INTERVAL;
        this.sprite.play("attack", { restart: true });
    }

    // The attack clip plays once; after the last attack he moves to the next marker.
    _attackEnded() {
        if (!this.attacking) return;

        this.attacking = false;
        this.sprite.play("idle");

        if (this.attacks >= ATTACKS) {
            this.arrived = false;
            this.transporting = true;
            this.transport.play("transport", { restart: true });
            this.stop = (this.stop + 1) % this.stops.length;
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
    }
}
