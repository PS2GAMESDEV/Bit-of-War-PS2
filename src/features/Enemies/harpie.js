import { GAME_SCALE, KNOCKBACK_DECAY, KNOCKBACK_SPEED } from "../../shared/lib/constants.js";

const TILE = 16 * GAME_SCALE;

// Which way the enHarpie art looks in the sheet (flipped when she goes the other way).
const FACES_RIGHT = true;

const SIGHT = 6 * TILE;         // distance at which she notices the player
const SPEED = 120;               // units per second
const ARRIVED = 2;              // closer than this to the player she stops, so she does not jitter
const TURN_DEADZONE = 2;

/**
 * enHarpie: waits in the air on frame 2 (clip "idle") until the player comes
 * within SIGHT, then flies after him for good (clip "fly", frames 0-1). She
 * has no body in the world, so she goes through blocks.
 */
export class Harpie {
    static clip = "idle";
    static health = 2;

    constructor(sprite, world, x, y, sheets, markers, sfx) {
        this.sprite = sprite;
        this.sfxScreech = sfx?.harpieScreech;
        this.x = x;
        this.y = y;
        this.chasing = false;
        this.facingRight = FACES_RIGHT;
        this.knock = 0;     // push from a hit, units per second (fades out)
    }

    // Hit from `fromX` (the attacker's center): pushed the other way.
    hurt(fromX) {
        this.knock = (fromX > this.x + TILE / 2 ? -1 : 1) * KNOCKBACK_SPEED;
    }

    // Box the blade can hit.
    get hurtbox() {
        return { x: this.x, y: this.y, w: TILE, h: TILE };
    }

    update(target, dt) {
        if (this.knock !== 0) {
            this.x += this.knock * dt;
            this.knock *= Math.max(0, 1 - KNOCKBACK_DECAY * dt);
            if (Math.abs(this.knock) < 1) this.knock = 0;
        }

        const dx = target.centerX - (this.x + TILE / 2);
        const dy = target.centerY - (this.y + TILE / 2);
        const distance = Math.hypot(dx, dy);

        if (!this.chasing && distance <= SIGHT) {
            this.chasing = true;
            this.sprite.play("fly");
            this.sfxScreech?.play();
        }
        if (!this.chasing) return;

        if (Math.abs(dx) > TURN_DEADZONE) this.facingRight = dx > 0;
        this.sprite.flipX = this.facingRight !== FACES_RIGHT;

        if (distance > ARRIVED) {
            const step = Math.min(SPEED * dt, distance);
            this.x += (dx / distance) * step;
            this.y += (dy / distance) * step;
        }
    }

    // After the world step: the sprite follows.
    sync() {
        this.sprite.x = this.x;
        this.sprite.y = this.y;
    }
}
