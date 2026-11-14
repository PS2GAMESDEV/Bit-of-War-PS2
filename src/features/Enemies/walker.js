import { GAME_SCALE, KNOCKBACK_DECAY, KNOCKBACK_SPEED, LAYER, PLAYER_MOVEMENT as MOVE } from "../../shared/lib/constants.js";

const SIZE = 16 * GAME_SCALE;

export class Walker {
    static clip = "walk";

    constructor(sprite, world, x, y, { facesRight, walkSpeed, runSpeed = 0, sight = 0 }) {
        this.sprite = sprite;
        this.world = world;
        this.facesRight = facesRight;
        this.walkSpeed = walkSpeed;
        this.runSpeed = runSpeed;
        this.sight = sight;
        this.running = false;
        this.knock = 0;
        this.dir = facesRight ? 1 : -1;
        this._clip = null;
        this._flipX = null;
        this.body = world.add({
            type: "dynamic",
            x, y,
            w: SIZE, h: SIZE,
            layer: LAYER.ENEMY,
            mask: LAYER.SOLID,
            maxSpeedY: MOVE.MAX_FALL_SPEED
        });
    }

    get hurtbox() {
        return this.body;
    }

    hurt(fromX, kind = "blade") {
        const toAttacker = fromX > this.body.centerX ? 1 : -1;

        this.dir = toAttacker;
        if (kind === "lightning") return;
        const step = -toAttacker * 10 * SIZE / 16;
        const x = step > 0 ? this.body.right : this.body.x + step;
        if (!this.world.solidAt(x, this.body.y + SIZE / 2, LAYER.SOLID)) this.body.move(step, 0);
    }

    die() {
        this.body.remove();
    }

    update(target, dt) {
        const body = this.body;

        if (body.onGround) {
            const y = body.y;
            const bottom = body.bottom;
            const front = this.dir > 0 ? body.right + 1 : body.x - 1;
            const wall = this.world.solidAt(front, y + SIZE / 2, LAYER.SOLID);
            const floor = wall || this.world.solidAt(front, bottom + 1, LAYER.SOLID) ||
                this.world.raycast(front, bottom - 1, front, bottom + 2, { mask: LAYER.SOLID }) !== null;

            if (wall || !floor) this.dir = -this.dir;
        }

        this.running = this.runSpeed > 0 && this._sees(target);

        body.vx = this.dir * (this.running ? this.runSpeed : this.walkSpeed);
        const flipX = (this.dir > 0) !== this.facesRight;
        if (flipX !== this._flipX) this.sprite.flipX = this._flipX = flipX;
        const clip = this.running ? "run" : "walk";
        if (clip !== this._clip) {
            this.sprite.play(clip);
            this._clip = clip;
        }
    }

    sync() {
        const x = this.body.x, y = this.body.y;
        if (x !== this._spriteX) this.sprite.x = this._spriteX = x;
        if (y !== this._spriteY) this.sprite.y = this._spriteY = y;
    }

    _sees(target) {
        const body = this.body;
        const ahead = this.dir > 0 ? target.centerX > body.centerX : target.centerX < body.centerX;
        return ahead && Math.abs(target.bottom - body.bottom) < SIZE / 16;
    }
}
