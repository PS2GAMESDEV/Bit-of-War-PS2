import { GAME_SCALE, ORIGINAL_HZ, stepsToSeconds, pxPerStep } from "../../shared/lib/constants.js";

// Magic uses the port's 0..5 gauge; the original uses 0..100.
export const POWER_COST = Object.freeze([1.25, 0.5, 0.5, 1.25]);
export const POWER_NAMES = Object.freeze(["gorgon", "lightning", "hammer", "spin"]);
const S = GAME_SCALE;
const HAMMER_POINTS = [[64,64],[80,32],[96,16],[112,16],[128,16],[144,32],[160,64],[176,256],[176,464]];
const midpoint = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];

// GameMaker's open smooth path, precision 4 (original hammerThrowRight/Left).
function hammerPath() {
    const nodes = [HAMMER_POINTS[0]];
    function smooth(depth, a, b, c) {
        if (!depth) return;
        const average = [(a[0]+2*b[0]+c[0])/4, (a[1]+2*b[1]+c[1])/4];
        if (Math.hypot(a[0]-b[0], a[1]-b[1]) > 4) smooth(depth-1, a, midpoint(a,b), average);
        nodes.push(average);
        if (Math.hypot(b[0]-c[0], b[1]-c[1]) > 4) smooth(depth-1, average, midpoint(b,c), c);
    }
    for (let i=0; i<HAMMER_POINTS.length-2; i++) {
        smooth(4, midpoint(HAMMER_POINTS[i],HAMMER_POINTS[i+1]), HAMMER_POINTS[i+1], midpoint(HAMMER_POINTS[i+1],HAMMER_POINTS[i+2]));
    }
    nodes.push(HAMMER_POINTS[HAMMER_POINTS.length-1]);
    return nodes;
}
const HAMMER_PATH = hammerPath();

export class PlayerPowers {
    constructor(player, sheets, sfx) {
        this.player = player;
        this.sheets = sheets;
        this.sfx = sfx;
        this.projectiles = [];
        this.aura = null;
        this.castTime = 0;
    }

    get spinning() { return this.aura?.kind === "spin"; }
    get channeling() { return this.aura?.kind === "gorgon"; }

    _sprite(name) {
        const sheet = this.sheets[name];
        return sheet ? new Sprite.Instance(sheet, { scale: S, autoUpdate: false }) : null;
    }

    _sound(kind) {
        return this.sfx[kind] ?? this.sfx["player" + kind[0].toUpperCase() + kind.slice(1)];
    }

    cast(index) {
        const p = this.player;
        if (!Number.isInteger(index) || index < 0 || index >= p.unlockedPowers || index >= POWER_NAMES.length ||
            p.dead || p.stun > 0 || !p.canMove || p.climbing || p.defending ||
            this.spinning || this.channeling || this.castTime > 0 || p.attacking ||
            p.magic + 1e-8 < POWER_COST[index]) return false;
        // The original only lets the Gorgon Head start while Kratos is not walking (flagWalk).
        if (index === 0 && Math.abs(p.body.vx) > 1e-6) return false;

        const kind = POWER_NAMES[index];
        // No invisible powers when an asset has not been registered by a scene.
        const key = kind === "gorgon" ? (p.facingLeft ? "playerGorgonLeft" : "playerGorgon")
            : kind === "hammer" ? (p.facingLeft ? "playerHammerLeft" : "playerHammer")
            : kind === "spin" ? "playerSpin" : "playerLightning";
        const sprite = this._sprite(key);
        if (!sprite) return false;
        p.magic = Math.max(0, p.magic - POWER_COST[index]);
        p.openingChest = false;
        const attack = {
            kind, sprite, struck: new Set(), damage: 1, sourceX: p.pos.x,
            x: p.origin.x, y: p.origin.y, elapsed: 0, life: kind === "spin" ? stepsToSeconds(20) : 5,
            direction: p.facingLeft ? -1 : 1, startX: p.origin.x, startY: p.origin.y,
            pathIndex: 0, pathOffset: 0,
            box: { x: p.origin.x, y: p.origin.y, w: 16*S, h: 16*S }
        };
        if (kind === "gorgon" || kind === "spin") this.aura = attack;
        else { this.projectiles.push(attack); this.castTime = stepsToSeconds(9); }
        this._sound(kind)?.play();
        this._alignAura();
        return true;
    }

    clear() {
        if (this.spinning) this._sound("spin")?.stop?.();
        if (this.channeling) this._sound("gorgon")?.stop?.();
        this.aura = null;
        this.projectiles.length = 0;
        this.castTime = 0;
    }

    stopAura() {
        if (this.spinning) this._sound("spin")?.stop?.();
        if (this.channeling) this._sound("gorgon")?.stop?.();
        this.aura = null;
    }

    _alignAura() {
        const a = this.aura, p = this.player;
        if (!a) return;
        if (a.kind === "spin") {
            a.x = p.origin.x - (p.facingLeft ? 34 : 30)*S;
            a.y = p.origin.y;
            a.box.w = 80*S; a.box.h = 16*S;
            a.sprite.frame = Math.floor(a.elapsed*ORIGINAL_HZ) % 4;
        } else {
            a.x = p.origin.x + (p.facingLeft ? -44 : 12)*S;
            a.y = p.origin.y - 8*S;
            a.box.w = 48*S; a.box.h = 32*S;
            // Switching direction selects the actual original directional art.
            const key = p.facingLeft ? "playerGorgonLeft" : "playerGorgon";
            if (a.direction !== (p.facingLeft ? -1 : 1)) {
                a.sprite = this._sprite(key);
                a.direction = p.facingLeft ? -1 : 1;
            }
            if (a.sprite) a.sprite.frame = Math.floor(a.elapsed*100) % 2;
        }
        a.box.x = a.x; a.box.y = a.y;
        a.sourceX = p.pos.x;
    }

    update(dt, held, selected) {
        this.castTime = Math.max(0, this.castTime-dt);
        const p = this.player;
        if (this.aura) {
            const a = this.aura;
            a.elapsed += dt;
            if (a.kind === "gorgon") {
                if (!held || selected !== 0 || p.magic <= 0 || p.dead || p.stun > 0) this.stopAura();
                else {
                    p.magic = Math.max(0, p.magic - dt*ORIGINAL_HZ*0.05); // 1/100 per original step, on the port's 0..5 gauge
                    if (p.magic <= 0) this.stopAura();
                }
            } else if (a.elapsed + 1e-8 >= a.life) this.stopAura();
            this._alignAura();
        }
        for (let i=this.projectiles.length-1; i>=0; i--) {
            const a = this.projectiles[i];
            a.elapsed += dt;
            if (a.kind === "lightning") {
                a.x += a.direction*pxPerStep(10)*dt;      // obLightning moves 10 px per step
                a.sprite.flipX = a.direction < 0;
                a.sprite.frame = Math.floor(a.elapsed*100) % 2;
            } else {
                let distance = 8*ORIGINAL_HZ*dt; // original path speed 8 px per step, before display scale
                // Athena computes in 32-bit floats: never wait for an offset to equal a length
                // exactly (a tiny segment then never ends and the game hangs).
                let segments = 0;
                while (distance > 0 && a.pathIndex < HAMMER_PATH.length-1 && ++segments < 64) {
                    const start=HAMMER_PATH[a.pathIndex], end=HAMMER_PATH[a.pathIndex+1];
                    const length=Math.hypot(end[0]-start[0],end[1]-start[1]);
                    const remaining=length-a.pathOffset;
                    if (distance >= remaining - 1e-3) {
                        distance -= Math.max(0, remaining);
                        a.pathIndex++; a.pathOffset=0;
                        a.x=a.startX+((end[0]-64))*a.direction*S;
                        a.y=a.startY+((end[1]-64))*S;
                    } else {
                        a.pathOffset+=distance; distance=0;
                        const t=a.pathOffset/length;
                        a.x=a.startX+((start[0]-64)+(end[0]-start[0])*t)*a.direction*S;
                        a.y=a.startY+((start[1]-64)+(end[1]-start[1])*t)*S;
                    }
                }
                a.sprite.frame=Math.floor(a.elapsed*100)%4;
            }
            a.box.x=a.x; a.box.y=a.y;
            const bounds=p.levelBounds;
            // obLightning ends on "outside view 0".
            const view=this.view;
            const gone = a.kind === "lightning" && view && (a.x+a.box.w<view.x || a.x>view.x+view.w);
            if (gone || a.elapsed>=a.life || a.kind === "hammer" && a.pathIndex>=HAMMER_PATH.length-1 ||
                bounds && (a.x+a.box.w<0 || a.x>bounds.width || a.y>bounds.height)) this.projectiles.splice(i,1);
        }
    }

    get attacks() { return this.aura ? [...this.projectiles, this.aura] : this.projectiles; }

    draw() {
        for (const a of this.attacks) a.sprite?.draw(a.x,a.y);
    }
}
