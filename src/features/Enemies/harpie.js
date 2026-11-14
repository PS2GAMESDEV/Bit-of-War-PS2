import { GAME_SCALE, pxPerStep } from "../../shared/lib/constants.js";

const TILE = 16 * GAME_SCALE;

const FACES_RIGHT = true;

const WAKE = 50 * GAME_SCALE;
const SPEED = pxPerStep(2);
const TURN_DEADZONE = 2;

export class Harpie {
    static clip = "idle";
    static health = 1;

    constructor(sprite, world, x, y, sheets, markers, sfx) {
        this.sprite = sprite;
        this.sprite.flipY = true;
        this.sfxScreech = sfx?.harpieScreech;
        this.x = x;
        this.y = y;
        this.chasing = false;
        this.vx = 0;
        this.vy = 0;
        this.facingRight = FACES_RIGHT;
    }

    hurt() {}

    die() { this.sfxScreech?.stop?.(); }

    get hurtbox() {
        return { x: this.x, y: this.y, w: TILE, h: TILE };
    }

    update(target, dt) {
        if (target.dead) {
            this.vx = this.vy = 0;
        } else {
            const dx = target.centerX - (this.x + TILE / 2);
            const dy = target.centerY - (this.y + TILE / 2);
            if (Math.abs(dx) < WAKE && Math.abs(dy) < WAKE) {
                if (!this.chasing) {
                    this.chasing = true;
                    this.sprite.flipY = false;
                    this.sprite.play("fly");
                    this.sfxScreech?.play();
                }
                const distance = Math.hypot(dx, dy);
                if (distance > 0) {
                    this.vx = dx / distance * SPEED;
                    this.vy = dy / distance * SPEED;
                }
            }
        }
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        if (!this.chasing) return;
        if (Math.abs(this.vx) > TURN_DEADZONE) this.facingRight = this.vx > 0;
        this.sprite.flipX = this.facingRight !== FACES_RIGHT;
    }

    sync() {
        this.sprite.x = this.x;
        this.sprite.y = this.y;
    }
}
