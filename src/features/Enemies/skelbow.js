import { GAME_SCALE, LAYER } from "../../shared/lib/constants.js";

const TILE = 16 * GAME_SCALE;
const ARROW_W = 10 * GAME_SCALE;
const ARROW_H = 3 * GAME_SCALE;

// Which way the enSkelbow and arrow art look in their sheets (flipped otherwise).
const FACES_RIGHT = true;

const SHOOT_RANGE = 10 * TILE;    // horizontal distance at which it starts shooting
const SHOOT_HEIGHT = 3 * TILE;    // vertical distance, so it does not shoot at other floors
const COOLDOWN = 2;               // seconds between shots
const ARROW_SPEED = 240;          // units per second
const VIEW_MARGIN = 2 * TILE;     // an arrow this far outside the camera's view disappears
const TURN_DEADZONE = 2;          // does not turn for a player right above or below it

/**
 * enSkelbow: stays put, always faces the player and, while he is in range,
 * draws its bow (clip "shoot", frames 0-1) and shoots an arrow ahead. Arrows
 * fly straight and disappear against a solid.
 */
export class Skelbow {
    static clip = "idle";
    static health = 3;
    static cooldown = COOLDOWN;
    static arrowSpeed = ARROW_SPEED;
    static blockableArrows = true;

    constructor(sprite, world, x, y, sheets) {
        this.sprite = sprite;
        this.world = world;
        this.arrowSheet = sheets.arrow;
        this.x = x;
        this.y = y;
        this.dir = FACES_RIGHT ? 1 : -1;
        this.cooldown = this.constructor.cooldown;
        this.shooting = false;
        this.arrows = [];

        this.sprite.on("end", () => this._release());
    }

    // Box the blade can hit.
    get hurtbox() {
        return { x: this.x, y: this.y, w: TILE, h: TILE };
    }

    // An arrow that touches `box` is spent: returns its center x, or null.
    arrowHit(box) {
        const arrows = this.arrows;

        for (let i = arrows.length - 1; i >= 0; i--) {
            const { x, y } = arrows[i];
            if (!Collision.overlaps(box, { x, y, w: ARROW_W, h: ARROW_H })) continue;

            arrows.splice(i, 1);
            return x + ARROW_W / 2;
        }
        return null;
    }

    // `view` is the camera's visible rectangle { x, y, w, h }.
    update(target, dt, view) {
        const dx = target.centerX - (this.x + TILE / 2);
        const dy = target.centerY - (this.y + TILE / 2);

        if (Math.abs(dx) > TURN_DEADZONE) this.dir = dx > 0 ? 1 : -1;
        this.sprite.flipX = (this.dir > 0) !== FACES_RIGHT;

        if (this.cooldown > 0) this.cooldown -= dt;
        if (!this.shooting && this.cooldown <= 0 && Math.abs(dx) <= SHOOT_RANGE && Math.abs(dy) <= SHOOT_HEIGHT) {
            this.shooting = true;
            this.sprite.play("shoot", { restart: true });
        }

        this._moveArrows(dt, view);
    }

    // The bow is loosed when the draw animation ends.
    _release() {
        if (!this.shooting) return;

        this.shooting = false;
        this.cooldown = this.constructor.cooldown;
        this.sprite.play("idle");

        const x = this.dir > 0 ? this.x + TILE : this.x - ARROW_W;
        const y = this.y + TILE / 2 - ARROW_H / 2;
        const sprite = new Sprite.Instance(this.arrowSheet, {
            clip: "fly", scale: GAME_SCALE, x, y, flipX: (this.dir > 0) !== FACES_RIGHT
        });
        this.arrows.push({ sprite, x, y, dir: this.dir });
    }

    // Arrows fly on until they hit a solid or leave the view plus VIEW_MARGIN.
    _moveArrows(dt, view) {
        const arrows = this.arrows;
        const left = view.x - VIEW_MARGIN - ARROW_W;
        const right = view.x + view.w + VIEW_MARGIN;
        const top = view.y - VIEW_MARGIN - ARROW_H;
        const bottom = view.y + view.h + VIEW_MARGIN;

        for (let i = arrows.length - 1; i >= 0; i--) {
            const arrow = arrows[i];

            arrow.x += arrow.dir * this.constructor.arrowSpeed * dt;
            arrow.sprite.x = arrow.x;

            const tip = arrow.dir > 0 ? arrow.x + ARROW_W : arrow.x;
            const outside = arrow.x < left || arrow.x > right || arrow.y < top || arrow.y > bottom;
            if (outside || this.world.solidAt(tip, arrow.y + ARROW_H / 2, LAYER.SOLID)) {
                arrows.splice(i, 1);
            }
        }
    }

    // The Skelbow does not move: nothing to follow.
    sync() {}

    draw() {
        for (const arrow of this.arrows) arrow.sprite.draw();
    }
}
