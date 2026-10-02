import { BLADE_DAMAGE, GAME_SCALE, LAYER, VFX_SCREEN_COLOR } from "../../shared/lib/constants.js";
import { Harpie } from "../Enemies/harpie.js";
import { Minotaur } from "../Enemies/minotaur.js";
import { Skelbow } from "../Enemies/skelbow.js";
import { Undead } from "../Enemies/undead.js";
import { Zeus } from "../Enemies/zeus.js";
import { Thor } from "../Enemies/thor.js";
import { Dragon } from "../Enemies/dragon.js";
import { Vbow } from "../Enemies/vbow.js";
import { VSoldier } from "../Enemies/vsoldier.js";
import { Spearman } from "../Enemies/spearman.js";
import { Blood } from "../Vfx/blood.js";

// Sheet name -> enemy class, made from the map placements. A class has a
// static `clip` (the sprite's first animation) and the methods update(target,
// dt, view), sync() and, optionally, draw(). One the blade can hit also has a
// static `health` and a `hurtbox` ({ x, y, w, h }), and optionally hurt(fromX)
// and die() (one that sets `dying` stays until it sets `dead`); one whose hurtbox
// is null is not hit. Optional deathHit() advances a death sequence per hit;
// contactBox can differ from hurtbox to keep a corpse hittable but harmless.
// A class with a static `selfDrawn`
// draws its sprite itself in draw() instead of being drawn with the props. The constructor gets
// (sprite, world, x, y, sheets, markers, sfx).
const ENEMY_CLASS = Object.freeze({
    undead: Undead, minotaur: Minotaur, skelbow: Skelbow, harpie: Harpie, zeus: Zeus, thor: Thor,
    dragon: Dragon, vbow: Vbow, vsoldier: VSoldier, spearman: Spearman
});

const TILE = 16 * GAME_SCALE;

// Editor tile variants share artwork; collision comes from map.colliders.
const TILE_ALIAS = Object.freeze({ tileMastSolid: "tileMast" });

const BLEND = Screen.alphaEquation(
    Screen.SRC_RGB, Screen.DST_RGB,
    Screen.SRC_ALPHA, Screen.DST_RGB,
    0
);

// Map ids that are placed as sprites instead of atlas tiles -> sheet name.
const PROP_SHEET = Object.freeze({
    obLifeChest: "lifeChest",
    obMagicChest: "magicChest",
    spriteTorch: "torch",
    enUndead: "undead",
    enMinotaur: "minotaur",
    enSkelbow: "skelbow",
    enSkelbowR: "skelbow",
    enHarpie: "harpie",
    enDragon: "dragon",
    enVbow: "vbow",
    enVbowR: "vbow",
    enVsoldier: "vsoldier",
    enVSoldier: "vsoldier",
    enSpearman: "spearman",
    bossZeus: "zeus",
    bossThor: "thor"
});

const CHEST_FLASH = Object.freeze({
    lifeChest: VFX_SCREEN_COLOR.LIFE,
    magicChest: VFX_SCREEN_COLOR.MAGIC
});

const COLLIDER_LAYER = Object.freeze({
    ground: LAYER.SOLID,
    door: LAYER.DOOR,
    ladder: LAYER.LADDER
});

// "#rrggbb" -> packed color; black when missing or malformed.
function parseColor(hex) {
    const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex ?? "");
    return m
        ? Color.new(parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16))
        : Color.new(0, 0, 0);
}

// First index whose value is >= `value` in a sorted Float32Array.
function lowerBound(values, value) {
    let lo = 0;
    let hi = values.length;
    while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (values[mid] < value) lo = mid + 1;
        else hi = mid;
    }
    return lo;
}

function findFrame(atlas, id) {
    const name = TILE_ALIAS[id] ?? id;
    const index = atlas.findFrame(name + ".png");
    return index >= 0 ? index : atlas.findFrame(name);
}

/**
 * One map: per layer a TileMap for the static tiles (drawn by VU1) plus the
 * Sprite instances of torches, enemies and chests, and the solid/door/ladder
 * bodies in `world`. Layers are drawn in ascending order; the player is drawn
 * in the layer of the spawn point (spriteKratos).
 */
export class Level {
    constructor(map, sheets, world, sfx = {}) {
        this.sfx = sfx;
        this.background = parseColor(map.backgroundColor);
        this.markers = {};
        this.layers = [];
        this.enemies = [];
        this.projectileGroups = [];
        this.bossReward = null;
        this.chests = [];
        this.blood = new Blood(sheets.blood);
        this.spawn = { x: 100, y: 100 };
        this.width = 0;
        this.height = 0;
        this.playerLayer = 0;
        this._range = { first: 0, count: 0 };

        // Named points, scaled: { name: [{ x, y }, ...] }.
        for (const [name, points] of Object.entries(map.markers ?? {})) {
            this.markers[name] = [];
            for (let i = 0; i < points.length; i += 2) {
                this.markers[name].push({ x: points[i] * GAME_SCALE, y: points[i + 1] * GAME_SCALE });
            }
        }

        for (const { layer, tiles } of map.layers) {
            this.layers.push(this._buildLayer(layer, tiles, sheets, world));
        }

        for (const [type, rects] of Object.entries(map.colliders)) {
            const layer = COLLIDER_LAYER[type];

            for (let i = 0; i < rects.length; i += 4) {
                world.add({
                    x: rects[i] * GAME_SCALE,
                    y: rects[i + 1] * GAME_SCALE,
                    w: rects[i + 2] * GAME_SCALE,
                    h: rects[i + 3] * GAME_SCALE,
                    layer,
                    sensor: layer !== LAYER.SOLID
                });
            }
        }

        // Bridge ladder openings only between two solid platform edges.
        const ladders = map.colliders.ladder ?? [];
        for (let i = 0; i < ladders.length; i += 4) {
            const x = ladders[i] * GAME_SCALE;
            const y = ladders[i + 1] * GAME_SCALE;
            const w = ladders[i + 2] * GAME_SCALE;
            const floors = world.query(x - 1, y, w + 2, 1, LAYER.SOLID)
                .filter(floor => floor.y === y && !floor.sensor && !floor.oneWay);
            const hasLeftFloor = floors.some(floor => floor.right === x);
            const hasRightFloor = floors.some(floor => floor.x === x + w);
            if (hasLeftFloor && hasRightFloor) {
                world.add({ x, y, w, h: 2 * GAME_SCALE, layer: LAYER.SOLID, oneWay: true });
            }
        }
    }

    _buildLayer(index, tiles, sheets, world) {
        const atlas = sheets.atlas;
        const sprites = [];
        const groups = [];
        const layer = { index, groups, props: [], enemies: [], tiles: null };

        for (const [id, placements] of Object.entries(tiles)) {
            if (id === "spriteKratos") {
                this.spawn = { x: placements[0] * GAME_SCALE, y: placements[1] * GAME_SCALE };
                this.playerLayer = index;
                continue;
            }

            const sheetName = PROP_SHEET[id];
            if (sheetName) {
                this._addProps(layer, sheets[sheetName], sheetName, placements, world, sheets);
                continue;
            }

            const frameIndex = findFrame(atlas, id);
            if (frameIndex < 0) {
                console.warn(`[Level] no atlas frame for "${id}"`);
                continue;
            }

            // Placements come sorted by x (tools/build-maps.js), so the visible
            // slice of a group is found by bisection.
            const frame = atlas.getFrame(frameIndex);
            const count = placements.length / 2;
            const xs = new Float32Array(count);
            const w = frame.w * GAME_SCALE;
            const h = frame.h * GAME_SCALE;

            for (let i = 0; i < count; i++) {
                const x = (placements[2 * i] + frame.offsetX) * GAME_SCALE;
                const y = (placements[2 * i + 1] + frame.offsetY) * GAME_SCALE;

                xs[i] = x;
                sprites.push({
                    x, y, w, h,
                    u1: frame.x, v1: frame.y,
                    u2: frame.x + frame.w, v2: frame.y + frame.h
                });

                if (x + w > this.width) this.width = x + w;
                if (y + h > this.height) this.height = y + h;
            }

            groups.push({ first: sprites.length - count, xs, reach: w });
        }

        if (sprites.length) {
            layer.tiles = new TileMap.Instance({
                descriptor: new TileMap.Descriptor({
                    textures: [atlas.image],
                    materials: [{ textureIndex: 0, blendMode: BLEND, endOffset: sprites.length - 1 }]
                }),
                spriteBuffer: TileMap.SpriteBuffer.fromObjects(sprites)
            });
        }

        return layer;
    }

    _addProps(layer, sheet, sheetName, placements, world, sheets) {
        const flash = CHEST_FLASH[sheetName];

        for (let i = 0; i < placements.length; i += 2) {
            const x = placements[i] * GAME_SCALE;
            const y = placements[i + 1] * GAME_SCALE;
            const options = { scale: GAME_SCALE, x, y };
            if (sheetName === "torch") options.clip = "burn";
            const Enemy = ENEMY_CLASS[sheetName];
            if (Enemy) options.clip = Enemy.clip;

            const sprite = new Sprite.Instance(sheet, options);
            if (!Enemy?.selfDrawn) layer.props.push(sprite);

            if (Enemy) {
                const enemy = new Enemy(sprite, world, x, y, sheets, this.markers, this.sfx);
                enemy.health = Enemy.health ?? Infinity;
                this.enemies.push(enemy);
                layer.enemies.push(enemy);
            }

            // The chest rect doubles as a Collision shape for Collision.overlaps().
            if (flash) this.chests.push({ sprite, x, y, w: TILE, h: TILE, flash, opened: false });
        }
    }

    // Enemy AI; call before the world is stepped. `target` is the player's
    // body and `view` the camera's visible rectangle.
    update(target, dt, view) {
        for (const enemy of this.enemies) enemy.update(target, dt, view);
        for (let i = this.projectileGroups.length - 1; i >= 0; i--) {
            const group = this.projectileGroups[i];
            group.update(dt, view);
            if (group.dead) this.projectileGroups.splice(i, 1);
        }
        this.blood.update(dt);

        // An enemy with a death animation stays until it says it is `dead`.
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            if (this.enemies[i].dead) this._remove(this.enemies[i]);
        }
    }

    // The blade at `hitbox` (swung by the player at `fromX`) hits every enemy
    // it touches that is not in `struck` yet: they bleed, react and, out of
    // health, are removed. `struck` keeps one swing from hitting twice.
    strike(hitbox, fromX, struck) {
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            const box = enemy.hurtbox;
            if (!box || struck.has(enemy) || !Collision.overlaps(hitbox, box)) continue;

            struck.add(enemy);
            const centerX = box.x + box.w / 2;
            this.blood.spawn(centerX, box.y + box.h / 2, fromX > centerX);

            if (enemy.dying && enemy.deathHit) {
                enemy.deathHit();
                continue;
            }

            enemy.health -= BLADE_DAMAGE;
            if (enemy.health > 0) {
                enemy.hurt?.(fromX);
            } else {
                enemy.die?.();
                this.sfx[enemy.constructor.dieSfx ?? "enemyDie"]?.play();
                if (!enemy.dying) this._remove(enemy);
            }
        }
    }

    // What hurts a player whose body is `box`: an enemy touching it, or an
    // projectile (which is spent). Only archer arrows can be blocked;
    // contact and other projectiles still hurt while defending.
    hitPlayer(box, blocking = false) {
        let fromX = null;
        for (const sources of [this.enemies, this.projectileGroups]) {
            for (const enemy of sources) {
                const contactBox = enemy.contactBox;
                const hurtbox = contactBox === undefined ? enemy.hurtbox : contactBox;
                if (hurtbox && Collision.overlaps(box, hurtbox)) {
                    const contactX = hurtbox.x + hurtbox.w / 2;
                    if (!blocking) return contactX;
                    if (fromX === null) fromX = contactX;
                }

                const blockArrows = blocking && enemy.constructor.blockableArrows;
                let arrowX;
                do {
                    arrowX = enemy.arrowHit?.(box) ?? null;
                    if (!blockArrows && arrowX !== null) {
                        if (!blocking) return arrowX;
                        if (fromX === null) fromX = arrowX;
                    }
                } while (blockArrows && arrowX !== null);
            }
        }
        return fromX;
    }

    _remove(enemy) {
        this.enemies.splice(this.enemies.indexOf(enemy), 1);
        const projectiles = enemy.detachProjectiles?.();
        if (projectiles) this.projectileGroups.push(projectiles);

        for (const layer of this.layers) {
            const at = layer.enemies.indexOf(enemy);
            if (at < 0) continue;

            layer.enemies.splice(at, 1);
            const prop = layer.props.indexOf(enemy.sprite);
            if (prop >= 0) layer.props.splice(prop, 1);
        }

        // A boss grants its reward only after its death animation and removal.
        if (enemy.constructor.reward) this.bossReward = enemy.constructor.reward;
    }

    // Draws the layers in ascending order, only the slice of every tile group
    // that the camera can see. `drawPlayer` runs after the entities of the
    // player's layer, so higher layers are drawn over the player.
    render(camera, drawPlayer) {
        for (const enemy of this.enemies) enemy.sync();

        const view = camera.visibleRect();
        const right = view.x + view.w;
        const range = this._range;
        let playerDrawn = false;

        for (const layer of this.layers) {
            if (!playerDrawn && layer.index > this.playerLayer) {
                drawPlayer?.();
                playerDrawn = true;
            }

            if (layer.tiles) {
                for (const group of layer.groups) {
                    const from = lowerBound(group.xs, view.x - group.reach);
                    const to = lowerBound(group.xs, right);
                    if (to <= from) continue;

                    range.first = group.first + from;
                    range.count = to - from;
                    layer.tiles.render(0, 0, range);
                }
            }

            Sprite.drawAll(layer.props);
            for (const enemy of layer.enemies) enemy.draw?.();
        }

        if (!playerDrawn) drawPlayer?.();
        for (const group of this.projectileGroups) group.draw();
        this.blood.draw();
    }
}
