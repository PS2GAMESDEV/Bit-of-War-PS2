import { GAME_SCALE, LAYER, ORIGINAL_HZ, pxPerStep } from "../../shared/lib/constants.js";
import { drawSpriteItems } from "../../shared/lib/spriteBatch.js";

const TILE = 16 * GAME_SCALE;

const FACES_RIGHT = true;

const CYCLE = 5 / 0.15 / ORIGINAL_HZ;
const FIRE_AT = 3 / 0.15 / ORIGINAL_HZ;
const COOLDOWN = CYCLE;
const ARROW_SPEED = pxPerStep(5);
const VIEW_MARGIN = 2 * TILE;
const TURN_DEADZONE = 2;

export class Skelbow {
    static clip = "idle";
    static health = 1;
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
        this.cycle = 0;
        this.shooting = false;
        this.arrows = [];
        this._drawSprites = [];

    }

    get hurtbox() {
        return { x: this.x, y: this.y, w: TILE, h: TILE };
    }

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

    update(target, dt, view) {
        const dx = target.centerX - (this.x + TILE / 2);
        const visible = this.x + TILE > view.x && this.x < view.x + view.w &&
            this.y + TILE > view.y && this.y < view.y + view.h;

        if (Math.abs(dx) > TURN_DEADZONE && (dx > 0 ? 1 : -1) !== this.dir) {
            this.dir = dx > 0 ? 1 : -1;
            this.cycle = 0;
        }
        const flipX = (this.dir > 0) !== FACES_RIGHT;
        if (flipX !== this._flipX) this.sprite.flipX = this._flipX = flipX;

        const prev = this.cycle;
        this.cycle += dt;
        let crossed = prev < FIRE_AT && this.cycle >= FIRE_AT;
        if (this.cycle >= CYCLE) this.cycle -= CYCLE;

        const drawing = this.cycle >= FIRE_AT - 0.5 && this.cycle < FIRE_AT + 0.1;
        if (drawing !== this.shooting) {
            this.shooting = drawing;
            this.sprite.play(drawing ? "shoot" : "idle", { restart: true });
        }
        if (visible && crossed) this._release();

        this._moveArrows(dt, view);
    }

    _release() {

        const { arrowWidth, arrowHeight } = this.constructor;
        const x = this.dir > 0 ? this.x + TILE : this.x - arrowWidth;
        const y = this.y + TILE / 2 - arrowHeight / 2 - (this.constructor.arrowLift ?? 0);
        const sprite = new Sprite.Instance(this.arrowSheet, {
            clip: "fly", scale: GAME_SCALE, x, y, flipX: (this.dir > 0) !== FACES_RIGHT
        });
        this.arrows.push({ sprite, x, y, dir: this.dir });
    }

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

    sync() {}

    draw() {
        drawSpriteItems(this.arrows, this._drawSprites);
    }
}
