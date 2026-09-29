import { GAME_SCALE, LAYER, PLAYER_MOVEMENT as MOVE, UNDEAD_SPEED } from "../../shared/lib/constants.js";

const SIZE = 16 * GAME_SCALE;

// Which way the enUndead art looks in the sheet (it is flipped to walk the other way).
const FACES_RIGHT = true;

/**
 * enUndead: walks ahead until a wall blocks it or the floor ends, then turns
 * around. A dynamic body of the Collision.World (gravity, floors and walls);
 * it only collides with LAYER.SOLID, so the player walks through it.
 */
export class Undead {
    constructor(sprite, world, x, y) {
        this.sprite = sprite;
        this.world = world;
        this.dir = FACES_RIGHT ? 1 : -1;
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
    update() {
        const body = this.body;

        if (body.onGround) {
            // One unit past the leading edge: the wall in front, and the
            // floor under the next step.
            const front = this.dir > 0 ? body.right + 1 : body.x - 1;
            const wall = this.world.solidAt(front, body.y + SIZE / 2, LAYER.SOLID);
            const floor = this.world.solidAt(front, body.bottom + 1, LAYER.SOLID);

            if (wall || !floor) this.dir = -this.dir;
        }

        body.vx = this.dir * UNDEAD_SPEED;
        this.sprite.flipX = (this.dir > 0) !== FACES_RIGHT;
    }

    // After the step: the sprite follows the body.
    sync() {
        this.sprite.x = this.body.x;
        this.sprite.y = this.body.y;
    }
}
