import { GAME_SCALE, LAYER } from "../../shared/lib/constants.js";
import { ShadowKratos, PathMotion } from "./shadowKratos.js";

const S = GAME_SCALE;

export const ZEUS_FRAMES = Object.freeze({
    walkL: [0, 0], walkR: [1, 1], zeusL: [2, 6], zeusR: [7, 11],
    hitL: [12, 31], hitR: [32, 51], croakL: [52, 79], croakR: [80, 107], float: [108, 108]
});

export class Zeus extends ShadowKratos {
    static clip = "idle";
    static selfDrawn = true;
    static health = 100;
    static reward = "gotZeusLightning";
    static contactDamage = 1;

    constructor(sprite, world, x, y, sheets, markers = {}, sfx = {}) {
        const fight = markers.zeusMove1?.[0] ?? { x, y };
        super(null, world, x, y, sheets, markers, sfx, "zeus", {
            campaign: true, frames: ZEUS_FRAMES, transportY: fight.y,
            sheets: {
                body: "zeus", transport: "zeusTransportBoss",
                lightning: ["zeusLightningLeft", "zeusLightningRight"]
            }
        });
        this.fight = fight;
        this.petrifiable = false;
        this.bossName = "Zeus";

        this.state = "intro";
        this.intro = new PathMotion(18, 5, 0, 0, true);
        this.body.setPosition(this.intro.x * S, this.intro.y * S);
        this._pose("float");
    }

    get introActive() { return this.state === "intro"; }
    get contactBox() { return null; }
    damageFor(weapon = "blade") { return weapon === "blade" ? 20 : 0; }

    die() {
        if (this.dying) return;
        this.health = 0;
        this.dying = true;
        this.state = "croak";
        this.stateTicks = 0;
        this.body.mask = 0;
        this._pose(this.direction < 0 ? "croakL" : "croakR");
    }

    _step(target) {
        if (this.state === "intro") {
            this._stepProjectiles();
            const p = this.intro.step();
            this.body.setPosition(p.x, p.y);
            this._pose("float");
            if (this.intro.done) {
                this.body.setPosition(this.fight.x, this.fight.y);
                this._resumeCombat(target, true);
            }
        } else if (this.state === "croak") {
            this._stepProjectiles();
            this.stateTicks++;
            this._pose(this.direction < 0 ? "croakL" : "croakR", Math.min(27, Math.floor(this.stateTicks * 0.25)));
            if (this.stateTicks >= 28 / 0.25) this._complete();
        } else super._step(target);
    }
}
