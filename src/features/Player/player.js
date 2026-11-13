import {
    GAME_SCALE, LAYER, PLAYER_ANIMATIONS as ANIM, PLAYER_HURT as HURT, PLAYER_MOVEMENT as MOVE, stepsToSeconds
} from "../../shared/lib/constants.js";
import { PLAYER_CONTROLS as KEY } from "../../shared/config/controls.js";
import { PlayerPowers } from "./powers.js";
import { PathMotion } from "../Enemies/shadowKratos.js";

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
        this.attackGap = 0;
        this.knock = null;
        this.struck = new Set();    // enemies already hit by the current swing
        this.openingChest = false;
        this.climbing = false;
        this.climbDir = 0;
        this.jumps = MOVE.JUMPS;
        this.health = HURT.HEALTH;
        this.magic = HURT.MAGIC;
        this.dead = false;          // plays ANIM.DIE and ignores the pad
        this.deathDone = false;     // the death animation has finished
        this.stun = 0;              // seconds left without control after a hit
        this.invulnerable = 0;      // seconds left immune (and translucent)
        this.selectedPower = 0;
        this.unlockedPowers = 1;
        this.levelBounds = null;
        this.deathTime = 0;
        this.powers = new PlayerPowers(this, sheets, sfx);
    }

    get vulnerable() {
        return this.invulnerable <= 0 && this.health > 0 && !this.powers?.spinning;
    }

    // Hit by something at `fromX` (its center): loses health and is thrown up
    // and away from it.
    // `pierces`: the Sphinx and its fire hurt a spinning Kratos (every other source,
    // checked in its collision event, ignores him while flagSpin is set).
    hurt(fromX, damage = 1, pierces = false) {
        if (!(this.vulnerable || pierces && this.invulnerable <= 0 && this.health > 0)) return;

        const body = this.body;

        this.defending = false;
        this.health = Math.max(0, this.health - damage);
        this.sfxHurt.play();
        if (this.health <= 0) return this._die();
        this.stun = HURT.STUN;
        this.invulnerable = HURT.INVULNERABLE;
        this.openingChest = false;
        this.powers?.stopAura();
        if (this.climbing) this._stopClimbing();
        if (this.attacking) {
            this.attacking = false;
            this.blade.stop();
        }

        // The original follows path 1 (facing right: pushed left) or 2 (facing left: pushed
        // right) at 6 px per step, while gravity keeps pulling him down.
        body.vx = 0;
        const motion = new PathMotion(this.facingLeft ? 2 : 1, HURT.PATH_SPEED, 0, 0);
        let steps = 0;
        for (const probe = new PathMotion(this.facingLeft ? 2 : 1, HURT.PATH_SPEED, 0, 0); !probe.done; steps++) probe.step();
        this.knock = { motion, last: { x: 0, y: 0 }, acc: 0 };
        this.stun = stepsToSeconds(steps);
    }

    _die() {
        if (this.dead) return;

        this.health = 0;
        this.dead = true;
        this.deathDone = false;
        this.deathTime = 0;
        this.canMove = false;
        this.defending = false;
        this.invulnerable = 0;
        this.stun = 0;
        this.openingChest = false;
        if (this.climbing) this._stopClimbing();
        this.attacking = false;
        this.blade.stop();
        this.powers?.clear();
        this.body.vx = 0;
        this.sprite.color = NORMAL;
        this.sprite.play(ANIM.DIE, { restart: true });
    }

    // Back to full health after a game over (attach() puts him in the level).
    revive() {
        this.health = HURT.HEALTH;
        this.magic = HURT.MAGIC;
        this.dead = false;
        this.deathDone = false;
        this.invulnerable = 0;
        this.stun = 0;
        this.facingLeft = false;
        this.defending = false;
        this.powers?.clear();
    }

    // Room-space coordinates, already multiplied by GAME_SCALE. Camera bottom
    // is intentionally not used: vertically scrolling rooms have platforms below.
    setBounds(width, height) {
        this.levelBounds = { width, height };
    }

    get attackHitboxes() {
        const attacks = this.powers?.attacks ?? [];
        const blade = this.hitbox;
        return blade ? [{ box: blade, kind: "blade", struck: this.struck, damage: 1, sourceX: this.pos.x }, ...attacks] : attacks;
    }

    // Where the blade is while it swings (the box that is drawn), or null.
    get hitbox() {
        if (!this.attacking) return null;

        const { x, y } = this.pos;
        return {
            x: this.facingLeft ? x - HALF - BLADE_WIDTH + PIXEL : x + HALF - PIXEL,
            y: y + HALF - PIXEL,
            w: BLADE_WIDTH,
            h: SIZE /2
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
            mask: LAYER.SOLID | LAYER.KILL,
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
            const other = a === this.body ? b : b === this.body ? a : null;
            if (other?.layer === LAYER.KILL) this._die();

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
        this.knock = null;
        this.struck.clear();
        this.blade.stop();
        this.powers.clear();
        this._syncPos();
    }

    update(dt, pad) {
        const body = this.body;
        this.defending = false;
        this.attackGap = Math.max(0, this.attackGap - dt);

        if (this.dead) {
            // He falls where he died (no control, no knockback) and lies there.
            body.vx = 0;
            this.world.step(dt);
            this._syncPos();
            // A sprite below the room may be culled and never emit "end".
            this.deathTime += dt;
            if (this.deathTime >= 1.35) this.deathDone = true;
            return;
        }

        if (this.invulnerable > 0) this.invulnerable -= dt;

        // Stunned, the pad is ignored while the hit path carries him.
        const stunned = this.stun > 0;
        if (this.knock) {
            this.knock.acc += dt;
            while (this.knock.acc >= stepsToSeconds(1) - 1e-9 && !this.knock.motion.done) {
                this.knock.acc -= stepsToSeconds(1);
                const at = this.knock.motion.step();
                body.move(at.x - this.knock.last.x, at.y - this.knock.last.y);
                this.knock.last = at;
            }
            if (this.knock.motion.done) this.knock = null;
        }
        if (stunned) this.stun -= dt;
        else if (this.canMove) {
            this._checkLadder(pad, body);
            this._input(pad, body);
        }
        else body.vx = 0;

        this.world.step(dt);
        // A kill sensor can start death during the step. Keep its animation.
        if (this.dead) {
            this._syncPos();
            return;
        }
        if (body.onGround) this.jumps = MOVE.JUMPS;

        if (this.canMove && !stunned) {
            this._checkLadder(pad, body);
            this.defending = !this.climbing && !this.powers.spinning && body.onGround && pad.pressed(KEY.BLOCK);
            if (this.defending && this.attacking) {
                this.attacking = false;
                this.blade.stop();
            }
            const special = KEY.SPECIAL ?? Gamepad.L2;
            this._syncPos();
            if (!this.defending && pad.justPressed(special)) this.powers.cast(this.selectedPower);
            if (!this.defending && !this.powers.spinning && !this.powers.channeling && this.powers.castTime <= 0 &&
                pad.justPressed(KEY.ATK) && !this.attacking && this.attackGap <= 0) this._attack();
        }

        if (this.openingChest && (this.attacking || body.vx !== 0 || !body.onGround || pad.pressed(KEY.BLOCK))) {
            this.openingChest = false;
        }

        this._syncPos();
        this.powers.update(dt, pad.pressed(KEY.SPECIAL ?? Gamepad.L2), this.selectedPower);
        if (this.levelBounds && this.origin.y > this.levelBounds.height) {
            this._die();
            return;
        }
        this._animate(pad, body);
    }

    _input(pad, body) {
        if (this.climbing) {
            this.climbDir = pad.pressed(Gamepad.UP) ? -1
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

        const defending = pad.pressed(KEY.BLOCK) && body.onGround && !this.powers.spinning;

        if (pad.pressed(Gamepad.RIGHT)) this.facingLeft = false;
        else if (pad.pressed(Gamepad.LEFT)) this.facingLeft = true;

        body.vx = (defending || this.attacking && body.onGround) ? 0
            : pad.pressed(Gamepad.RIGHT) ? MOVE.SPEED
            : pad.pressed(Gamepad.LEFT) ? -MOVE.SPEED : 0;

        if (pad.justPressed(KEY.JUMP) && !defending && body.onGround) this._jump(body);
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
        this.attackGap = stepsToSeconds(9);      // countPunch 6 counting down to below -2
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
        if (this.powers.castTime > 0 || this.powers.channeling) clip = left ? ANIM.ATK_L : ANIM.ATK_R;
        if (clip) sprite.play(clip);
    }

    draw() {
        const { x, y } = this.pos;
        const hitbox = this.hitbox;

        if (hitbox) {
            //Draw.rect(hitbox.x, hitbox.y, BLADE_WIDTH, 16, Color.new(255, 0, 0, 96))
            this.blade.flipX = !this.facingLeft;
            this.blade.draw(hitbox.x, hitbox.y);
        }

        if (!this.powers?.spinning) this.sprite.draw(x, y);
        this.powers?.draw();
    }
}
