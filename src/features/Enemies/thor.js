import { GAME_SCALE, LAYER, PLAYER_MOVEMENT as MOVE } from "../../shared/lib/constants.js";

const SIZE = 16 * GAME_SCALE;
const HALF = SIZE / 2;
const FACES_RIGHT = false; // Thor's artwork faces left before flipX.
const TURN_DEADZONE = 2;
// Two tiles above the original jump: one more than the previous adjustment.
const JUMP_SPEED = Math.sqrt((300 * GAME_SCALE) ** 2 + 4 * MOVE.GRAVITY * SIZE);
const JUMP_MOVE = 100 * GAME_SCALE;
const JUMP_PAUSE = 0.3;
const FLOAT_SPEED = 160 * GAME_SCALE;
const HIT_TIME = 1.5;
const ATTACK_INTERVAL = 2.5;
const ATTACK_INTERVAL_MIN = 0.75;
const HAMMER_RADIUS = 12 * GAME_SCALE;
const HAMMER_SPREAD = 30 * GAME_SCALE;
const HAMMER_ORBIT = 3.75;
const FULL_TURN = 2 * Math.PI;
const HAMMER_SIZE = 8 * GAME_SCALE;
// Cell 5 is empty; the six visible death poses occupy cells 6 through 11.
const FIRST_DEATH_FRAME = 6;
const LAST_DEATH_FRAME = 11;
const DEATH_HOLD = 0.8;
const DIZZY_OFFSET_Y = 2 * GAME_SCALE;

// Hops towards the player and emits expanding hammer orbits. A hit flashes
// for 1.5 seconds, then floats back to centerThor without clearing the orbits.
// Once health runs out, each new blade hit advances one death frame.
export class Thor {
    static clip = "idle";
    static selfDrawn = true;
    static health = 10;
    static reward = "gotMjolnir";

    constructor(sprite, world, x, y, sheets, markers) {
        this.sprite = sprite;
        this.x = x;
        this.y = y;
        this.center = markers.centerThor?.[0] ?? { x, y };
        this.hammerSheet = sheets.hammer;
        this.hammers = [];
        this.dizzyStars = new Sprite.Instance(sheets.dizzyStar, {
            scale: GAME_SCALE, origin: [0.5, 0.5], autoUpdate: false
        });
        this.view = null;
        this.started = false;
        this.hurting = false;
        this.returning = false;
        this.dying = false;
        this.dead = false;
        this.hitTimer = 0;
        this.deathFrame = FIRST_DEATH_FRAME;
        this.deathTimer = Infinity;
        this.jumpTimer = JUMP_PAUSE;
        this.jumpDirection = 0;
        this.cooldown = 0; // Launch the first hammer as soon as the fight starts.
        this.attackInterval = ATTACK_INTERVAL;
        this.hammerSpeed = 1;
        this.facingRight = FACES_RIGHT;
        this.sprite.flipX = false;
        this.body = world.add({
            type: "dynamic", x, y, w: SIZE, h: SIZE,
            layer: LAYER.ENEMY, mask: LAYER.SOLID,
            gravityScale: 0, maxSpeedY: MOVE.MAX_FALL_SPEED
        });
    }

    get hurtbox() {
        if (!this.started || this.dead || this.hurting || this.returning ||
            (this.dying && this.deathFrame === LAST_DEATH_FRAME)) return null;
        return this.body;
    }

    // The corpse can be struck to finish the sequence, but does no touch damage.
    get contactBox() {
        return this.dying ? null : this.hurtbox;
    }

    _difficulty() {
        const lost = 1 - Math.max(this.health, 0) / Thor.health;
        this.attackInterval = ATTACK_INTERVAL + (ATTACK_INTERVAL_MIN - ATTACK_INTERVAL) * lost;
        this.hammerSpeed = 1 + lost;
    }

    hurt() {
        this._difficulty();
        this.hurting = true;
        this.returning = false;
        this.hitTimer = HIT_TIME;
        this.body.vx = 0;
        this.body.gravityScale = 1;
        this.body.mask = LAYER.SOLID;
        this.sprite.play("hit", { restart: true });
    }

    die() {
        if (this.dying) return;
        this.health = 0;
        this._difficulty();
        this.dying = true;
        this.hurting = this.returning = false;
        this.body.vx = this.body.vy = 0;
        this.body.gravityScale = 1;
        this.body.mask = LAYER.SOLID;
        // Selecting a sheet frame stops animation: time cannot advance "die".
        this.sprite.frame = this.deathFrame = FIRST_DEATH_FRAME;
        this.dizzyStars.play("spin", { restart: true });
    }

    deathHit() {
        if (!this.dying || this.deathFrame >= LAST_DEATH_FRAME) return;
        this.sprite.frame = ++this.deathFrame;
        if (this.deathFrame === LAST_DEATH_FRAME) this.deathTimer = DEATH_HOLD;
    }

    update(target, dt, view) {
        this.view = view;
        if (!this.started) {
            const b = this.body;
            if (b.right <= view.x || b.x >= view.x + view.w ||
                b.bottom <= view.y || b.y >= view.y + view.h) return;
            this.started = true;
            b.gravityScale = 1;
        }

        const toPlayer = target.centerX - this.body.centerX;
        if ((this.body.onGround || this.hurting || this.returning || this.dying) &&
            Math.abs(toPlayer) > TURN_DEADZONE) this.facingRight = toPlayer > 0;
        this.sprite.flipX = this.facingRight !== FACES_RIGHT;

        if (this.dying) {
            this.dizzyStars.update(dt);
            if ((this.deathTimer -= dt) <= 0) {
                this.x = this.body.x;
                this.y = this.body.y;
                this.body.remove();
                this.dead = true;
            }
            this._moveHammers(dt, view);
            return;
        }

        if (this.hurting) {
            if ((this.hitTimer -= dt) <= 0) {
                this.hurting = false;
                this.returning = true;
                this.body.vx = this.body.vy = 0;
                this.body.gravityScale = 0;
                this.body.mask = 0;
                this.sprite.play("float");
            }
        } else if (this.returning) {
            this._float(dt);
        }

        if (!this.hurting && !this.returning) {
            this._hop(toPlayer, dt);
            this.cooldown -= dt;
            if (this.cooldown <= 0) {
                this._shoot(target);
                this.cooldown = this.attackInterval;
            }
        }
        this._moveHammers(dt, view);
    }

    _hop(toPlayer, dt) {
        if (this.body.onGround) {
            this.body.vx = 0;
            this.sprite.play("idle");
            this.jumpTimer -= dt;
            if (this.jumpTimer > 0) return;

            this.jumpDirection = Math.abs(toPlayer) > TURN_DEADZONE ? Math.sign(toPlayer) : 0;
            this.body.vy = -JUMP_SPEED;
            this.jumpTimer = JUMP_PAUSE;
        }
        // A wall collision clears vx. Restore the direction chosen at takeoff
        // to clear crates without steering towards the player during the jump.
        this.body.vx = this.jumpDirection * JUMP_MOVE;
        this.sprite.play("walk");
    }

    _float(dt) {
        const dx = this.center.x - this.body.x;
        const dy = this.center.y - this.body.y;
        const distance = Math.hypot(dx, dy);
        const step = Math.min(FLOAT_SPEED * dt, distance);
        if (distance > 0) {
            this.body.setPosition(this.body.x + dx / distance * step, this.body.y + dy / distance * step);
        }
        if (step >= distance) {
            this.returning = false;
            this.body.mask = LAYER.SOLID;
            this.body.gravityScale = 1;
            this.jumpTimer = JUMP_PAUSE;
            this.jumpDirection = 0;
            this.cooldown = 0; // Restart the volley on arrival at centerThor.
            this.sprite.play("idle");
        }
    }

    _shoot(target) {
        const x = this.body.centerX;
        const y = this.body.centerY;
        const angle = Math.atan2(target.centerY - y, target.centerX - x);
        const sprite = new Sprite.Instance(this.hammerSheet, { clip: "fly", scale: GAME_SCALE, origin: [0.5, 0.5] });
        this.hammers.push({ sprite, angle, rotation: 0, radius: HAMMER_RADIUS, x, y });
    }

    _moveHammers(dt, view) {
        this.view = view;
        for (const hammer of this.hammers) {
            const rotation = HAMMER_ORBIT * this.hammerSpeed * dt;
            hammer.angle += rotation;
            hammer.rotation += rotation;
            hammer.radius += HAMMER_SPREAD * this.hammerSpeed * dt;
        }
        this._syncHammers();
    }

    _syncHammers() {
        const x = this.dead ? this.x + HALF : this.body.centerX;
        const y = this.dead ? this.y + HALF : this.body.centerY;
        const view = this.view;
        // Keep the first full orbit visible, even near a camera edge. Restrict
        // expansion there until the first turn ends, then let it grow normally.
        const visibleRadius = view ? Math.max(0, Math.min(
            x - view.x, view.x + view.w - x, y - view.y, view.y + view.h - y
        ) - HALF - 1) : Infinity;
        for (let i = this.hammers.length - 1; i >= 0; i--) {
            const hammer = this.hammers[i];
            if (hammer.rotation < FULL_TURN) hammer.radius = Math.min(hammer.radius, visibleRadius);
            hammer.x = x + Math.cos(hammer.angle) * hammer.radius;
            hammer.y = y + Math.sin(hammer.angle) * hammer.radius;
            hammer.sprite.x = hammer.x;
            hammer.sprite.y = hammer.y;
            hammer.sprite.rotation = hammer.angle;
            if (view && hammer.rotation >= FULL_TURN && (hammer.x + HALF <= view.x || hammer.x - HALF >= view.x + view.w ||
                hammer.y + HALF <= view.y || hammer.y - HALF >= view.y + view.h)) {
                this.hammers.splice(i, 1);
            }
        }
    }

    // Like Zeus's bolts, hammers are spent on contact and cannot be blocked.
    arrowHit(box) {
        this._syncHammers(); // The dynamic boss may have moved in the world step.
        for (let i = this.hammers.length - 1; i >= 0; i--) {
            const hammer = this.hammers[i];
            if (!Collision.overlaps(box, { x: hammer.x - HAMMER_SIZE / 2, y: hammer.y - HAMMER_SIZE / 2, w: HAMMER_SIZE, h: HAMMER_SIZE })) continue;
            this.hammers.splice(i, 1);
            return hammer.x;
        }
        return null;
    }

    // Surviving hammers remain in the level after the boss is removed.
    detachProjectiles() {
        if (!this.hammers.length) return null;
        const thor = this;
        return {
            update: (dt, view) => this._moveHammers(dt, view),
            arrowHit: box => this.arrowHit(box),
            draw: () => this._drawHammers(),
            get dead() { return thor.hammers.length === 0; }
        };
    }

    sync() {
        this.sprite.x = this.body.x;
        this.sprite.y = this.body.y;
        this._syncHammers();
    }

    _drawHammers() {
        for (const hammer of this.hammers) hammer.sprite.draw();
    }

    draw() {
        this.sprite.draw();
        if (this.dying && !this.dead) {
            this.dizzyStars.draw(this.sprite.x + HALF, this.sprite.y - DIZZY_OFFSET_Y);
        }
        this._drawHammers();
    }
}
