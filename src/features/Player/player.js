import {
    GAME_SCALE, LAYER, PLAYER_ANIMATIONS as ANIM, PLAYER_HURT as HURT, PLAYER_MOVEMENT as MOVE
} from "../../shared/lib/constants.js";
import { PLAYER_CONTROLS as KEY } from "../../shared/config/controls.js";

const SIZE = 16 * GAME_SCALE;
const HALF = SIZE / 2;

// The body is smaller than the 16x16 sprite so Kratos does not catch between
// two blocks. It is centered on the sprite and rests on its bottom edge.
const BODY = 12 * GAME_SCALE;
const BODY_PAD_X = (SIZE - BODY) / 2;
const BODY_PAD_Y = SIZE - BODY;
const BLADE_WIDTH = 48 * GAME_SCALE;
const PIXEL = 2 * GAME_SCALE;

// The ladder probe and the door test are the body inset by this.
const INSET = 4;

// Sprite tints (128 per channel is the texture unchanged).
const NORMAL = Color.new(128, 128, 128, 128);
const GHOST = Color.new(128, 128, 128, 56);

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
        this.sprite.on("end", () => { if (this.dead) this.deathDone = true; });

        this.sfxJump = sfx.jump;
        this.sfxBlades = sfx.blades;
        this.sfxHurt = sfx.hurt;

        this.pos = { x: 0, y: 0 };
        this.body = null;
        this.probe = null;
        this.world = null;
        this.ladders = new Set();
        this.lastLadder = null;

        this.facingLeft = false;
        this.canMove = true;
        this.defending = false;
        this.attacking = false;
        this.struck = new Set();    // enemies already hit by the current swing
        this.openingChest = false;
        this.climbing = false;
        this.climbDir = 0;
        this.jumps = MOVE.JUMPS;
        this.health = HURT.HEALTH;
        this.dead = false;          // out of health: plays ANIM.DIE and ignores the pad
        this.deathDone = false;     // the death animation has finished
        this.stun = 0;              // seconds left without control after a hit
        this.invulnerable = 0;      // seconds left immune (and translucent)
    }

    get vulnerable() {
        return this.invulnerable <= 0 && this.health > 0;
    }

    // Hit by something at `fromX` (its center): loses health and is thrown up
    // and away from it.
    hurt(fromX) {
        if (!this.vulnerable) return;

        const body = this.body;

        this.defending = false;
        this.health--;
        this.sfxHurt.play();
        if (this.health <= 0) return this._die();
        this.stun = HURT.STUN;
        this.invulnerable = HURT.INVULNERABLE;
        this.openingChest = false;
        if (this.climbing) this._stopClimbing();
        if (this.attacking) {
            this.attacking = false;
            this.blade.stop();
        }

        body.vx = (fromX > this.pos.x ? -1 : 1) * HURT.KNOCK_X;
        body.vy = -HURT.KNOCK_Y;
    }

    _die() {
        this.dead = true;
        this.canMove = false;
        this.openingChest = false;
        if (this.climbing) this._stopClimbing();
        this.attacking = false;
        this.blade.stop();
        this.body.vx = 0;
        this.sprite.color = NORMAL;
        this.sprite.play(ANIM.DIE, { restart: true });
    }

    // Back to full health after a game over (attach() puts him in the level).
    revive() {
        this.health = HURT.HEALTH;
        this.dead = false;
        this.deathDone = false;
        this.invulnerable = 0;
        this.stun = 0;
        this.facingLeft = false;
        this.defending = false;
    }

    // Where the blade is while it swings (the box that is drawn), or null.
    get hitbox() {
        if (!this.attacking) return null;

        const { x, y } = this.pos;
        return {
            x: this.facingLeft ? x - HALF - BLADE_WIDTH + PIXEL : x + HALF - PIXEL,
            y: y + HALF - PIXEL,
            w: BLADE_WIDTH,
            h: SIZE
        };
    }

    // Top-left of the sprite box: what attach() takes to put him back here.
    get origin() {
        return { x: this.pos.x - HALF, y: this.pos.y };
    }

    // Puts the player in `world` (a new level clears it). (x, y) is the top-left
    // of the 16x16 sprite box; the smaller body sits at its feet.
    attach(world, x, y) {
        this.world = world;
        this.body = world.add({
            type: "dynamic",
            x: x + BODY_PAD_X, y: y + BODY_PAD_Y,
            w: BODY, h: BODY,
            layer: LAYER.PLAYER,
            mask: LAYER.SOLID,
            maxSpeedY: MOVE.MAX_FALL_SPEED
        });

        // A sensor that follows the body: the world tells which ladders it
        // overlaps, so nothing is queried (or allocated) per frame. It must not
        // be static: two static bodies (the ladders are) are never a pair, so
        // onEnter would never fire.
        this.probe = world.add({
            type: "kinematic",
            x: x + BODY_PAD_X + INSET, y: y + BODY_PAD_Y + INSET,
            w: BODY - 2 * INSET, h: BODY - 2 * INSET,
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
        this.defending = false;
        this.climbing = false;
        this.climbDir = 0;
        this.lastLadder = null;
        this.jumps = MOVE.JUMPS;
        this.attacking = false;
        this.stun = 0;
        this.struck.clear();
        this.blade.stop();
        this._syncPos();
    }

    update(dt, pad) {
        const body = this.body;
        this.defending = false;

        if (this.dead) {
            // He falls where he died (no control, no knockback) and lies there.
            body.vx = 0;
            this.world.step(dt);
            this._syncPos();
            return;
        }

        if (this.invulnerable > 0) this.invulnerable -= dt;

        // Stunned, the velocity of the hit is kept and the pad is ignored.
        const stunned = this.stun > 0;
        if (stunned) this.stun -= dt;
        else if (this.canMove) {
            this._checkLadder(pad, body);
            this._input(pad, body);
        }
        else body.vx = 0;

        this.world.step(dt);
        if (body.onGround) this.jumps = MOVE.JUMPS;

        if (this.canMove && !stunned) {
            this._checkLadder(pad, body);
            this.defending = !this.climbing && body.onGround && pad.pressed(KEY.BLOCK);
            if (this.defending && this.attacking) {
                this.attacking = false;
                this.blade.stop();
            }
            if (!this.defending && pad.justPressed(KEY.ATK) && !this.attacking) this._attack();
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
                : pad.pressed(Gamepad.DOWN) ? 1 : 0;
            body.vy = this.climbDir * MOVE.CLIMB_SPEED;
            if (this._pastLadder(body, this.climbDir)) body.vy = 0;

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
        this.struck.clear();
        this.blade.play("swing", { restart: true });
        this.sfxBlades.play();
    }

    _checkLadder(pad, body) {
        // Standing on the ladder top leaves the probe above the ladder sensor.
        const ladder = this.ladders.values().next().value ??
            (pad.pressed(Gamepad.DOWN) && body.ground?.oneWay
                ? this.world.query(body.x + INSET, body.bottom, BODY - 2 * INSET, INSET, LAYER.LADDER)[0]
                : null);

        if (this.climbing) {
            const top = this.lastLadder;
            if (this.climbDir < 0 && top && body.bottom <= top.y &&
                this.world.query(top.x, top.y, top.w, 1, LAYER.SOLID).some(floor => floor.oneWay && floor.y === top.y)) {
                body.setPosition(body.x, top.y - body.h);
                this._stopClimbing();
                return;
            }
            const landed = this.climbDir > 0 && body.onGround;
            if (landed) this._stopClimbing();
            else if (ladder) this.lastLadder = ladder;
            // Without a ladder the player stays on the rope: at the top of the
            // last one, LEFT/RIGHT (or jump) steps onto the platform.
            else if (!this.lastLadder) this._stopClimbing();
            return;
        }
        if (!ladder) return;

        const up = pad.pressed(Gamepad.UP);
        const down = pad.pressed(Gamepad.DOWN);
        const grounded = body.onGround;

        if ((up && grounded && ladder.y < body.y) ||
            (down && (!grounded || body.ground?.oneWay) && body.y < ladder.y + ladder.h) ||
            (!grounded && (up || down))) {
            this._startClimbing(ladder);
        }
    }

    // Stop at the ladder endpoints, even after the inset probe leaves the sensor.
    _pastLadder(body, dir) {
        const ladder = this.lastLadder;
        if (dir === 0 || ladder === null) return false;
        if (dir < 0) return body.bottom <= ladder.y;
        if (this.ladders.size > 0) return false;

        return body.centerY >= ladder.y + ladder.h / 2;
    }

    _startClimbing(ladder) {
        const body = this.body;
        const ladderX = ladder.x + ladder.w / 2;

        this.climbing = true;
        this.climbDir = 0;
        this.lastLadder = ladder;
        body.gravityScale = 0;
        body.dropThrough = true;
        body.vx = 0;
        body.vy = 0;
        body.setPosition(ladderX - BODY / 2, body.y);
    }

    _stopClimbing() {
        this.climbing = false;
        this.climbDir = 0;
        this.body.gravityScale = 1;
        this.body.dropThrough = false;
        this.body.vy = 0;
    }

    _syncPos() {
        this.pos.x = this.body.x + BODY / 2;
        this.pos.y = this.body.y - BODY_PAD_Y;
        this.probe.setPosition(this.body.x + INSET, this.body.y + INSET);
    }

    _animate(pad, body) {
        const sprite = this.sprite;
        const left = this.facingLeft;

        sprite.color = this.blade.color = this.invulnerable > 0 ? GHOST : NORMAL;

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
            if (this.defending) clip = left ? ANIM.BLOCK_L : ANIM.BLOCK_R;
            else if (body.vx !== 0) clip = left ? ANIM.WALK_L : ANIM.WALK_R;
            else clip = left ? ANIM.IDLE_L : ANIM.IDLE_R;
        }

        if (this.attacking) clip = left ? ANIM.ATK_L : ANIM.ATK_R;
        if (clip) sprite.play(clip);
    }

    draw() {
        const { x, y } = this.pos;
        const hitbox = this.hitbox;

        if (hitbox) {
            this.blade.flipX = !this.facingLeft;
            this.blade.draw(hitbox.x, hitbox.y);
        }

        this.sprite.draw(x, y);
    }
}
