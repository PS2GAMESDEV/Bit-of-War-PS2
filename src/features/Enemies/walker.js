import { GAME_SCALE, LAYER, PLAYER_MOVEMENT as MOVE } from "../../shared/lib/constants.js";

const SIZE = 16 * GAME_SCALE;

/**
 * Enemy that walks ahead until a wall blocks it or the floor ends, then turns
 * around. With `runSpeed` and `sight` it runs (and plays "run") while it sees
 * the player: in front of it, within `sight` units, on its row, and with no
 * solid between them.
 *
 * A dynamic body of the Collision.World (gravity, floors and walls); it only
 * collides with LAYER.SOLID, so the player walks through it.
 *
 *   facesRight  which way the art looks in the sheet (it is flipped otherwise)
 *   walkSpeed   units per second
 *   runSpeed    0: never runs
 *   sight       units; 0: blind
 */
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
        this.dir = facesRight ? 1 : -1;
        this.body = world.add({
            type: "dynamic",
            x, y,
            w: SIZE, h: SIZE,
            layer: LAYER.ENEMY,
            mask: LAYER.SOLID,
            maxSpeedY: MOVE.MAX_FALL_SPEED
        });
    }

    // Before the world step: picks the direction and sets the velocity.
    // `target` is the player's body.
    update(target) {
        const body = this.body;

        if (body.onGround) {
            // One unit past the leading edge: the wall in front, and the
            // floor under the next step.
            const front = this.dir > 0 ? body.right + 1 : body.x - 1;
            const wall = this.world.solidAt(front, body.y + SIZE / 2, LAYER.SOLID);
            const floor = this.world.solidAt(front, body.bottom + 1, LAYER.SOLID);

            if (wall || !floor) this.dir = -this.dir;
        }

        // After the turn, so it does not chase what is now behind it.
        this.running = this.runSpeed > 0 && this._sees(target);

        body.vx = this.dir * (this.running ? this.runSpeed : this.walkSpeed);
        this.sprite.flipX = (this.dir > 0) !== this.facesRight;
        this.sprite.play(this.running ? "run" : "walk");
    }

    // After the step: the sprite follows the body.
    sync() {
        this.sprite.x = this.body.x;
        this.sprite.y = this.body.y;
    }

    _sees(target) {
        const body = this.body;
        // Free distance between the facing edge and the target's near edge.
        const gap = this.dir > 0 ? target.x - body.right : body.x - target.right;

        if (gap <= -SIZE / 2 || gap > this.sight) return false;
        if (Math.abs(target.centerY - body.centerY) >= SIZE) return false;

        return this.world.raycast(
            body.centerX, body.centerY, target.centerX, target.centerY,
            { mask: LAYER.SOLID }
        ) === null;
    }
}
