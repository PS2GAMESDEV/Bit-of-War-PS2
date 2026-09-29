import { GAME_SCALE, LAYER, PLAYER_ANIMATIONS as ANIM, PLAYER_MOVEMENT as MOVE } from "../../shared/lib/constants.js";
import { PLAYER_CONTROLS as KEY } from "../../shared/config/controls.js";

const SIZE = 16 * GAME_SCALE;
const HALF = SIZE / 2;
const BLADE_WIDTH = 48 * GAME_SCALE;
const PIXEL = 2 * GAME_SCALE;

// The ladder probe and the door test are the body inset by this.
const INSET = 4;

/**
 * Kratos. Position, gravity, floors and walls are handled by a dynamic body of
 * Collision.World; this class only turns the pad into velocities.
 * `pos` is the horizontal center / top of the body (what the camera follows).
 */
export class Player {
    constructor({ sheets, sfx }) {
        this.sprite = new Sprite.Instance(sheets.kratos, { clip: ANIM.IDLE_R, scale: GAME_SCALE, origin: [0.5, 0] });
        this.blade = new Sprite.Instance(sheets.blade, { scale: GAME_SCALE });
        this.blade.on("end", () => { this.attacking = false; });

        this.sfxJump = sfx.jump;
        this.sfxBlades = sfx.blades;

        this.pos = { x: 0, y: 0 };
        this.body = null;
        this.probe = null;
        this.world = null;
        this.ladders = new Set();

        this.facingLeft = false;
        this.canMove = true;
        this.attacking = false;
        this.openingChest = false;
        this.climbing = false;
        this.climbDir = 0;
        this.jumps = MOVE.JUMPS;
    }

    // Puts the player in `world` (a new level clears it).
    attach(world, x, y) {
        this.world = world;
        this.body = world.add({
            type: "dynamic",
            x, y,
            w: SIZE, h: SIZE,
            layer: LAYER.PLAYER,
            mask: LAYER.SOLID,
            maxSpeedY: MOVE.MAX_FALL_SPEED
        });

        // A sensor that follows the body: the world tells which ladders it
        // overlaps, so nothing is queried (or allocated) per frame.
        this.probe = world.add({
            x, y,
            w: SIZE - 2 * INSET, h: SIZE - 2 * INSET,
            sensor: true,
            layer: LAYER.PROBE,
            mask: LAYER.LADDER
        });
        this.ladders.clear();
        world.onEnter = (a, b) => {
            const ladder = a.layer === LAYER.LADDER ? a : b;
            if (ladder.layer === LAYER.LADDER) this.ladders.add(ladder);
        };
        world.onExit = (a, b) => {
            this.ladders.delete(a.layer === LAYER.LADDER ? a : b);
        };

        this.canMove = true;
        this.climbing = false;
        this.climbDir = 0;
        this.jumps = MOVE.JUMPS;
        this.attacking = false;
        this.blade.stop();
        this._syncPos();
    }

    update(dt, pad) {
        const body = this.body;

        if (this.canMove) this._input(pad, body);
        else body.vx = 0;

        this.world.step(dt);
        if (body.onGround) this.jumps = MOVE.JUMPS;

        if (this.canMove) {
            this._checkLadder(pad, body);
            if (pad.justPressed(KEY.ATK) && !this.attacking) this._attack();
        }

        if (this.openingChest && (this.attacking || body.vx !== 0 || !body.onGround || pad.pressed(KEY.BLOCK))) {
            this.openingChest = false;
        }

        this._syncPos();
        this._animate(pad, body);
    }

    _input(pad, body) {
        if (this.climbing) {
            this.climbDir = pad.anyPressed(Gamepad.UP | Gamepad.TRIANGLE) ? -1
                : pad.anyPressed(Gamepad.DOWN | Gamepad.CROSS) ? 1 : 0;
            body.vy = this.climbDir * MOVE.CLIMB_SPEED;

            const jump = pad.justPressed(KEY.JUMP);
            if (jump || pad.anyPressed(Gamepad.LEFT | Gamepad.RIGHT)) {
                this._stopClimbing();
                if (jump) {
                    this.jumps = MOVE.JUMPS;
                    this._jump(body);
                }
            }
            return;
        }

        const defending = pad.pressed(KEY.BLOCK) && body.onGround;

        if (pad.pressed(Gamepad.RIGHT)) this.facingLeft = false;
        else if (pad.pressed(Gamepad.LEFT)) this.facingLeft = true;

        body.vx = defending ? 0
            : pad.pressed(Gamepad.RIGHT) ? MOVE.SPEED
            : pad.pressed(Gamepad.LEFT) ? -MOVE.SPEED : 0;

        if (pad.justPressed(KEY.JUMP) && !defending) this._jump(body);
    }

    _jump(body) {
        if (this.jumps === 0) return;

        this.sfxJump.play();
        body.vy = -MOVE.JUMP_SPEED;
        this.jumps--;
    }

    _attack() {
        this.attacking = true;
        this.blade.play("swing", { restart: true });
        this.sfxBlades.play();
    }

    _checkLadder(pad, body) {
        const ladder = this.ladders.values().next().value;

        if (this.climbing) {
            const landed = this.climbDir > 0 && body.onGround;
            if (!ladder || landed) this._stopClimbing();
            return;
        }
        if (!ladder) return;

        const up = pad.pressed(Gamepad.UP);
        const down = pad.pressed(Gamepad.DOWN);
        const grounded = body.onGround;

        if ((up && grounded && ladder.y < body.y) ||
            (down && !grounded && body.y < ladder.y + ladder.h) ||
            (!grounded && (up || down))) {
            this._startClimbing(ladder.x + ladder.w / 2);
        }
    }

    _startClimbing(ladderX) {
        const body = this.body;

        this.climbing = true;
        this.climbDir = 0;
        body.gravityScale = 0;
        body.vx = 0;
        body.vy = 0;
        body.setPosition(ladderX - HALF, body.y);
    }

    _stopClimbing() {
        this.climbing = false;
        this.climbDir = 0;
        this.body.gravityScale = 1;
        this.body.vy = 0;
    }

    _syncPos() {
        this.pos.x = this.body.x + HALF;
        this.pos.y = this.body.y;
        this.probe.setPosition(this.body.x + INSET, this.body.y + INSET);
    }

    _animate(pad, body) {
        const sprite = this.sprite;
        const left = this.facingLeft;

        if (this.openingChest) {
            sprite.frame = 0;
            return;
        }

        if (this.climbing) {
            if (sprite.clip !== ANIM.CLIMB) sprite.play(ANIM.CLIMB);

            if (this.climbDir !== 0) {
                if (sprite.paused) sprite.resume();
            } else {
                sprite.pause();
            }
            return;
        }

        let clip = null;

        if (body.vy < 0) clip = left ? ANIM.JUMP_L : ANIM.JUMP_R;
        else if (body.onGround) {
            if (pad.pressed(KEY.BLOCK)) clip = left ? ANIM.BLOCK_L : ANIM.BLOCK_R;
            else if (body.vx !== 0) clip = left ? ANIM.WALK_L : ANIM.WALK_R;
            else clip = left ? ANIM.IDLE_L : ANIM.IDLE_R;
        }

        if (this.attacking) clip = left ? ANIM.ATK_L : ANIM.ATK_R;
        if (clip) sprite.play(clip);
    }

    draw() {
        const { x, y } = this.pos;

        if (this.attacking) {
            this.blade.flipX = !this.facingLeft;
            this.blade.draw(
                this.facingLeft ? x - HALF - BLADE_WIDTH + PIXEL : x + HALF - PIXEL,
                y + HALF - PIXEL
            );
        }

        this.sprite.draw(x, y);
    }
}
