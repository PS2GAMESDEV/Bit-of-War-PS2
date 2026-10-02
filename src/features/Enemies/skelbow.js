import { GAME_SCALE, LAYER } from "../../shared/lib/constants.js";

const TILE = 16 * GAME_SCALE;

// Which way the enSkelbow and arrow art look in their sheets (flipped otherwise).
const FACES_RIGHT = true;

const COOLDOWN = 2;               // seconds between shots
const ARROW_SPEED = 240;          // units per second
const VIEW_MARGIN = 2 * TILE;     // an arrow this far outside the camera's view disappears
const TURN_DEADZONE = 2;          // does not turn for a player right above or below it

/**
 * enSkelbow: stays put, always faces the player and, while visible on camera,
 * draws its bow (clip "shoot", frames 0-1) and shoots an arrow ahead. Arrows
 * fly straight and disappear against a solid.
 */
export class Skelbow {
    static clip = "idle";
    static health = 3;
    static cooldown = COOLDOWN;
    static arrowSpeed = ARROW_SPEED;
    static arrowSheetName = "arrow";
    static arrowWidth = 10 * GAME_SCALE;
    static arrowHeight = 3 * GAME_SCALE;
    static blockableArrows = true;

    constructor(sprite, world, x, y, sheets) {
        this.sprite = sprite;
        this.world = world;
        this.arrowSheet = sheets[this.constructor.arrowSheetName];
        this.x = x;
        this.y = y;
        this.dir = FACES_RIGHT ? 1 : -1;
        this.cooldown = 0; // Start drawing the bow as soon as the enemy is visible.
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
        const { arrowWidth, arrowHeight } = this.constructor;

        for (let i = arrows.length - 1; i >= 0; i--) {
            const { x, y } = arrows[i];
            if (!Collision.overlaps(box, { x, y, w: arrowWidth, h: arrowHeight })) continue;

            arrows.splice(i, 1);
            return x + arrowWidth / 2;
        }
        return null;
    }

    // `view` is the camera's visible rectangle { x, y, w, h }.
    update(target, dt, view) {
        const dx = target.centerX - (this.x + TILE / 2);
        const visible = this.x + TILE > view.x && this.x < view.x + view.w &&
            this.y + TILE > view.y && this.y < view.y + view.h;

        if (Math.abs(dx) > TURN_DEADZONE) this.dir = dx > 0 ? 1 : -1;
        this.sprite.flipX = (this.dir > 0) !== FACES_RIGHT;

        if (this.cooldown > 0) this.cooldown -= dt;
        if (!visible && this.shooting) {
            this.shooting = false;
            this.sprite.play("idle");
        }
        if (visible && !this.shooting && this.cooldown <= 0) {
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

        const { arrowWidth, arrowHeight } = this.constructor;
        const x = this.dir > 0 ? this.x + TILE : this.x - arrowWidth;
        const y = this.y + TILE / 2 - arrowHeight / 2;
        const sprite = new Sprite.Instance(this.arrowSheet, {
            clip: "fly", scale: GAME_SCALE, x, y, flipX: (this.dir > 0) !== FACES_RIGHT
        });
        this.arrows.push({ sprite, x, y, dir: this.dir });
    }

    // Arrows fly on until they hit a solid or leave the view plus VIEW_MARGIN.
    _moveArrows(dt, view) {
        const arrows = this.arrows;
        const { arrowWidth, arrowHeight } = this.constructor;
        const left = view.x - VIEW_MARGIN - arrowWidth;
        const right = view.x + view.w + VIEW_MARGIN;
        const top = view.y - VIEW_MARGIN - arrowHeight;
        const bottom = view.y + view.h + VIEW_MARGIN;

        for (let i = arrows.length - 1; i >= 0; i--) {
            const arrow = arrows[i];

            arrow.x += arrow.dir * this.constructor.arrowSpeed * dt;
            arrow.sprite.x = arrow.x;

            const tip = arrow.dir > 0 ? arrow.x + arrowWidth : arrow.x;
            const outside = arrow.x < left || arrow.x > right || arrow.y < top || arrow.y > bottom;
            if (outside || this.world.solidAt(tip, arrow.y + arrowHeight / 2, LAYER.SOLID)) {
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
