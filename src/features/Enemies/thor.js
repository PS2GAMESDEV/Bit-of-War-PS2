import { GAME_SCALE, LAYER } from "../../shared/lib/constants.js";
import { ShadowKratos, PathMotion } from "./shadowKratos.js";

const S = GAME_SCALE;

export const THOR_FRAMES = Object.freeze({
    walkL: [0, 1], walkR: [2, 3], jumpL: [4, 4], jumpR: [5, 5],
    attackL: [6, 6], attackR: [7, 7], hitL: [8, 27], hitR: [28, 47],
    poundedL: [48, 53], poundedR: [54, 59], float: [62, 62]
});

const POUNDED_LAST = 5;
const POUNDED_HIT_DELAY = 5;
const POUNDED_TO_NEXT_ROOM = 80;

export class Thor extends ShadowKratos {
    static clip = "idle";
    static selfDrawn = true;
    static health = 100;
    static reward = "gotMjolnir";
    static contactDamage = 2;

    constructor(sprite, world, x, y, sheets, markers = {}, sfx = {}) {
        super(null, world, x, y, sheets, markers, sfx, "thor", {
            campaign: true, frames: THOR_FRAMES, spiralPath: 26, walkFps: 0.5,
            sheets: { body: "thor", hammer: ["thorHammerLeft", "thorHammerRight"] }
        });
        this.petrifiable = false;
        this.bossName = "Thor";
        this.deathFrame = 0;
        this.hitDelay = 0;
        this.restTicks = 0;
        this.dizzy = new Sprite.Instance(sheets.dizzyStar, {
            clip: "spin", scale: S, origin: [0.5, 0.5], autoUpdate: false
        });
    }

    damageFor(weapon = "blade") { return weapon === "blade" ? 20 : weapon === "lightning" ? 5 : 0; }

    get hurtbox() {
        if (this.dying) return this.state === "pounded" ? this.body : null;
        return super.hurtbox;
    }
    get contactBox() { return this.dying ? null : super.contactBox; }

    _airborne() { return !this._groundAt(this.body.x + 3 * S, this.body.bottom); }

    hurt(fromX) {
        if (this.dying || !this.hurtbox) return;

        if (this._airborne()) this.body.setPosition(this.body.x, this.body.y - 10 * S);
        super.hurt(fromX);
    }

    die() {
        if (this.dying) return;
        this.health = 0;
        this.dying = true;
        this.blade = null;
        if (this._airborne()) this.body.setPosition(this.body.x, this.body.y - 10 * S);
        const fromLeft = (this.target?.centerX ?? this.body.centerX) < this.body.centerX;
        this.direction = fromLeft ? -1 : 1;
        this.state = "pounded";
        this.stateTicks = 0;
        this.deathFrame = 0;
        this.hitDelay = 0;
        this.restTicks = 0;
        this.body.mask = LAYER.SOLID;
        this.verticalSpeed = 0;
        this.recoil = new PathMotion(fromLeft ? 2 : 1, 6, this.body.x, this.body.y);
        this.recoilLast = { x: this.body.x, y: this.body.y };
        this.sfx.thorDizzy?.play();
        this._pose(fromLeft ? "poundedL" : "poundedR", 0);
    }

    deathHit(kind = "blade") {
        if (kind !== "blade" || this.state !== "pounded" || this.hitDelay > 0) return;
        if (this.deathFrame < POUNDED_LAST) {
            this.deathFrame++;
            this.hitDelay = POUNDED_HIT_DELAY;
            this.sfx.shadowHurt?.play();
            this.sfx.enemyDie?.play();
        } else {
            this.sfx.bastetStone?.play();
            this.hitDelay = 60;
            this.dizzy = null;
        }
    }

    _step(target) {
        if (this.state !== "pounded") return super._step(target);
        this._stepProjectiles();
        this.stateTicks++;
        if (this.hitDelay > 0) this.hitDelay--;
        if (this.recoil && !this.recoil.done) {
            const p = this.recoil.step();
            this.body.move(p.x - this.recoilLast.x, p.y - this.recoilLast.y);
            this.recoilLast = p;
        }
        this._fall();
        this._pose(this.direction < 0 ? "poundedL" : "poundedR", this.deathFrame);
        if (this.deathFrame === POUNDED_LAST && ++this.restTicks >= POUNDED_TO_NEXT_ROOM) this._complete();
    }

    sync() {
        super.sync();
        if (this.dizzy && !this.dead) {
            this.dizzy.x = this.body.x + 8 * S;
            this.dizzy.y = this.body.y - 2 * S;
            this.dizzy.frame = Math.floor(this.stateTicks / 2) % 2;
        }
    }

    draw() {
        super.draw();
        if (this.state === "pounded" && this.dizzy && !this.dead) this.dizzy.draw();
    }
}
