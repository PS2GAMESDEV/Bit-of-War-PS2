import { BLADE_DAMAGE, GAME_SCALE, LAYER, VFX_SCREEN_COLOR, stepsToSeconds } from "../../shared/lib/constants.js";
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
import { Anubis } from "../Enemies/anubis.js";
import { Mummy } from "../Enemies/mummy.js";
import { Scarab } from "../Enemies/scarab.js";
import { Scorpion } from "../Enemies/scorpion.js";
import { Bastet } from "../Enemies/bastet.js";
import { Blood } from "../Vfx/blood.js";
import { Zap } from "../Vfx/zap.js";
import { Rubble } from "../Vfx/rubble.js";
import { stoneFor, STONE_FPS } from "../Enemies/stone.js";
import { ShadowKratos, ShadowZeus, ShadowThor } from "../Enemies/shadowKratos.js";

// Sheet name -> enemy class, made from the map placements. A class has a
// static `clip` (the sprite's first animation) and the methods update(target,
// dt, view), sync() and, optionally, draw(). One the blade can hit also has a
// static `health` and a `hurtbox` ({ x, y, w, h }), and optionally hurt(fromX)
// and die() (one that sets `dying` stays until it sets `dead`); one whose hurtbox
// is null is not hit. Optional hurtboxes exposes several parts of the same
// enemy; a swing still deals damage only once. Optional deathHit() advances a death sequence per hit;
// contactBox can differ from hurtbox to keep a corpse hittable but harmless.
// A class with a static `selfDrawn`
// draws its sprite itself in draw() instead of being drawn with the props. The constructor gets
// (sprite, world, x, y, sheets, markers, sfx).
const ENEMY_CLASS = Object.freeze({
    undead: Undead, minotaur: Minotaur, skelbow: Skelbow, harpie: Harpie, zeus: Zeus, thor: Thor,
    dragon: Dragon, vbow: Vbow, vsoldier: VSoldier, spearman: Spearman,
    anubis: Anubis, mummy: Mummy, scarab: Scarab, scorpion: Scorpion
});

const TILE = 16 * GAME_SCALE;

const BASTET_PART = Object.freeze({ bossBastet: "bastet", lwSphinx: "sphinx" });

// Editor tile variants share artwork; collision comes from map.colliders.
const TILE_ALIAS = Object.freeze({
    tileMastSolid: "tileMast",
    tileEgyptianPillarSolid: "tileEgyptianPillar",
    tileFakeWall: "tileWall",
    "tileFakeWallInterior-Solid": "tileWall",
    tileFakeSolidInterior: "tileSolidInterior",
    tileGreyMast: "tileGrey",
    tileGreyCrate: "tileGrey"
});

const BLEND = Screen.alphaEquation(
    Screen.SRC_RGB, Screen.DST_RGB,
    Screen.SRC_ALPHA, Screen.DST_RGB,
    0
);

// Map ids that are placed as sprites instead of atlas tiles -> sheet name.
const PROP_SHEET = Object.freeze({
    bgCloud: "bgCloud",
    bgGreyCloud: "bgGreyCloud",
    bgPyramid: "bgPyramid",
    bgSphinx: "bgSphinx",
    spriteSpazz: "spazz",
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
    enAnubis: "anubis",
    enAnubisWarrior: "anubis",
    enMummy: "mummy",
    enScarab: "scarab",
    enScorpion: "scorpion",
    enScorpionR: "scorpion",
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
    ladder: LAYER.LADDER,
    kill: LAYER.KILL
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
 * Sprite instances of torches, enemies and chests, and the solid/door/ladder/kill
 * bodies in `world`. Layers are drawn in ascending order; the player is drawn
 * in the layer of the spawn point (spriteKratos).
 */
export class Level {
    constructor(map, sheets, world, sfx = {}, options = {}) {
        this.world = world;
        this.sheets = sheets;
        this.options = options;
        this.generators = [];
        this.exitLocked = false;
        this.sfx = sfx;
        this.background = parseColor(map.backgroundColor);
        this.markers = {};
        this.layers = [];
        this.enemies = [];
        this.bastet = null;
        this.projectileGroups = [];
        this.bossReward = null;
        this.chests = [];
        this.blood = new Blood(sheets.blood);
        this.zaps = new Zap(sheets.zapped, sfx);
        this.rubble = new Rubble(sheets);
        this.spazz = [];
        this.spawn = { x: 100, y: 100 };
        this.width = 0;
        this.height = 0;
        this.playerLayer = 0;
        this._range = { first: 0, count: 0 };

        // Named points, scaled: { name: [{ x, y }, ...] }.
        for (const [rawName, points] of Object.entries(map.markers ?? {})) {
            const name = rawName.trim();
            this.markers[name] = [];
            for (let i = 0; i < points.length; i += 2) {
                this.markers[name].push({ x: points[i] * GAME_SCALE, y: points[i + 1] * GAME_SCALE });
            }
        }

        for (const { layer, tiles } of map.layers) {
            this.layers.push(this._buildLayer(layer, tiles, sheets, world));
        }
        this.layers.sort((a, b) => a.index - b.index);

        for (const [type, rects] of Object.entries(map.colliders)) {
            const layer = COLLIDER_LAYER[type];

            for (let i = 0; i < rects.length; i += 4) {
                // Collision rects only: walls just outside the room (GaiaArm's right edge) must not
                // enlarge the camera bounds, or an empty column of tiles shows.
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

        if (map.size) {
            // The original room: its size, not the extent of what was drawn in it.
            this.width = map.size.width * GAME_SCALE;
            this.height = map.size.height * GAME_SCALE;
        }

        const point = this.markers.shadowKratosPoint?.[0];
        if (point) {
            const Boss = options.name === "ShadowRoom1.json" ? ShadowZeus
                : options.name === "ShadowRoom2.json" ? ShadowThor : ShadowKratos;
            const layer = this.layers.find(l => l.index === this.playerLayer) ?? this.layers[0];
            const boss = new Boss(null, world, point.x, point.y, sheets, this.markers, sfx);
            boss.health = Boss.health;
            this.enemies.push(boss);
            layer.enemies.push(boss);
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
            // Scene-level audio/HUD and marker-created Shadow controllers
            // have no tile artwork; their behavior is owned by Game/Level.
            if (id.startsWith("controllerMusic") || id === "healthBarBoss" ||
                id === "skZeusPopIn" || id === "skThorPopIn" || id === "skPopIn") continue;
            if (id === "secretInvisibleBlocks") {
                for (let i = 0; i < placements.length; i += 2) {
                    const x = placements[i] * GAME_SCALE, y = placements[i + 1] * GAME_SCALE;
                    // Collision only: these blocks sit just outside the room (below the Bastet hall,
                    // past the right edge of the armada) and must not enlarge the camera bounds,
                    // which would show an empty row or column of tiles.
                    world.add({ x, y, w: TILE, h: TILE, layer: LAYER.SOLID });
                }
                continue;
            }
            const generatorTypes = { genGreek: ["undead", "minotaur"], genNorse: ["vsoldier", "spearman"], genEgyptian: ["mummy", "anubis"] };
            if (generatorTypes[id]) {
                for (let i = 0; i < placements.length; i += 2) {
                    this.generators.push({ layer, x: placements[i] * GAME_SCALE, y: placements[i + 1] * GAME_SCALE,
                        types: generatorTypes[id], rolls: 0, timer: 1 });
                }
                this.exitLocked = true;
                continue;
            }
            // Generator effects are decorative; the wave controller owns the exit lock.
            if (id === "obMonsterDoorIn" || id === "obMonsterDoor" || id === "obMonsterDoorOut") continue;
            if (id === "spriteKratos") {
                this.spawn = { x: placements[0] * GAME_SCALE, y: placements[1] * GAME_SCALE };
                this.playerLayer = index;
                continue;
            }

            const bossPart = BASTET_PART[id];
            if (bossPart) {
                this._addBastetPart(layer, bossPart, placements, sheets, world);
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

    _addBastetPart(layer, name, placements, sheets, world) {
        if (!placements.length) return;
        if (!this.bastet) {
            this.bastet = new Bastet(world, sheets, this.markers, this.sfx);
            this.enemies.push(this.bastet);
        }

        const sprite = this.bastet.addPart(name, sheets[name],
            placements[0] * GAME_SCALE, placements[1] * GAME_SCALE);
        // Draw the mount before its rider when they share a layer, regardless
        // of the order of the map's entries.
        const rider = layer.props.indexOf(this.bastet.parts.bastet);
        if (name === "sphinx" && rider >= 0) layer.props.splice(rider, 0, sprite);
        else layer.props.push(sprite);
        if (name === "sphinx") layer.enemies.push(this.bastet);
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
                enemy.contactDamage = Enemy.contactDamage ?? (["minotaur", "spearman", "anubis"].includes(sheetName) ? 2 : 1);
                this.enemies.push(enemy);
                layer.enemies.push(enemy);
            }

            // spriteSpazz: purrs and refills life and magic when Kratos touches it.
            if (sheetName === "spazz") this.spazz.push({ x, y, w: 32 * GAME_SCALE, h: TILE, cooldown: 0 });

            // The chest rect doubles as a Collision shape for Collision.overlaps().
            if (flash) this.chests.push({ sprite, x, y, w: TILE, h: TILE, type: sheetName === "lifeChest" ? "life" : "magic", flash, opened: false });
        }
    }

    // Enemy AI; call before the world is stepped. `target` is the player's
    // body and `view` the camera's visible rectangle.
    update(target, dt, view) {
        this._updateGenerators(dt);
        for (const enemy of this.enemies) {
            if (enemy.hitCooldown > 0) enemy.hitCooldown = Math.max(0, enemy.hitCooldown - dt);
            if (!enemy.petrified) enemy.update(target, dt, view);
        }
        for (let i = this.projectileGroups.length - 1; i >= 0; i--) {
            const group = this.projectileGroups[i];
            group.update(dt, view);
            if (group.dead) this.projectileGroups.splice(i, 1);
        }
        this.blood.update(dt);
        this.zaps.update(dt);
        for (const cat of this.spazz) cat.cooldown = Math.max(0, cat.cooldown - dt);
        for (const enemy of this.enemies) {
            const stone = enemy.stoneArt;
            if (!stone) continue;
            stone.time += dt;
            stone.sprite.frame = stone.art.first + Math.min(stone.art.count - 1, Math.floor(stone.time * STONE_FPS));
        }

        // An enemy with a death animation stays until it says it is `dead`.
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            if (!enemy.constructor.reward && enemy.body?.y > this.height + TILE) {
                enemy.die?.();
                enemy.dead = true;
            }
            if (enemy.dead) this._remove(enemy);
        }
        if (this.exitLocked && this.generators.every(g => g.rolls >= 26) &&
            this.enemies.every(e => e.petrified)) this.exitLocked = false;   // stone enemies are other objects: they do not count
    }

    _updateGenerators(dt) {
        for (const g of this.generators) {
            g.timer -= dt;
            while (g.timer <= 0 && g.rolls < 26) {
                g.timer += 1;
                g.rolls++;
                // The original rolls 1..3, with no spawn for 3, for counts 0..25 inclusive.
                const choice = Math.floor(Math.random() * 3);
                if (choice < 2) {
                    const name = g.types[choice];
                    this._addProps(g.layer, this.sheets[name], name, [g.x / GAME_SCALE, g.y / GAME_SCALE], this.world, this.sheets);
                }
            }
        }
    }

    // The blade at `hitbox` (swung by the player at `fromX`) hits every enemy
    // it touches that is not in `struck` yet: they bleed, react and, out of
    // health, are removed. `struck` keeps one swing from hitting twice.
    strike(hitbox, fromX, struck, kind = "blade", damage = BLADE_DAMAGE) {
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            if (struck.has(enemy)) continue;
            if (kind !== "gorgon" && !enemy.petrified && enemy.hitCooldown > 0) continue;
            if (kind === "gorgon" && enemy.gorgonize) {
                const box = enemy.finisherBox;
                if (box && Collision.overlaps(hitbox, box)) {
                    struck.add(enemy);
                    enemy.gorgonize();
                }
                continue;
            }
            const boxes = enemy.hurtboxes;
            const box = boxes ? boxes.find(box => box && Collision.overlaps(hitbox, box)) : enemy.hurtbox;
            if (!box && enemy.deflectBoxes?.some(shield => Collision.overlaps(hitbox, shield))) {
                struck.add(enemy);
                this.sfx.blockArrows?.play();      // soundBlockArrows
                continue;
            }
            if (!box || (!boxes && !Collision.overlaps(hitbox, box))) continue;

            if (kind === "gorgon") {
                if (enemy.petrifiable === false || enemy.constructor.reward || enemy === this.bastet || enemy.petrified) continue;
                struck.add(enemy);
                enemy.petrified = true;
                enemy.sprite?.pause?.();
                const art = stoneFor(enemy);
                const layer = this.layers.find(l => l.enemies.includes(enemy));
                if (art && layer && enemy.sprite) {
                    // The enemy object is replaced by its stone object: hide it and draw the stone art.
                    const sprite = new Sprite.Instance(this.sheets.stones, { scale: GAME_SCALE, x: box.x, y: box.y, autoUpdate: false });
                    sprite.frame = art.first;
                    enemy.stoneArt = { sprite, art, time: 0, layer };
                    layer.props.push(sprite);
                    enemy.sprite.color = Color.new(128, 128, 128, 0);
                } else if (enemy.sprite) enemy.sprite.color = Color.new(95, 95, 95, 128);
                if (enemy.body) { enemy.body.vx = 0; enemy.body.vy = 0; enemy.body.gravityScale = 0; }
                continue;
            }
            const dealt = enemy.damageFor?.(kind, hitbox) ?? damage;
            if (dealt <= 0) continue;
            struck.add(enemy);
            if (!enemy.constructor.reward && !enemy.petrified) enemy.hitCooldown = 0.25;
            // `box` can be the enemy's own physics body, which die() removes: copy its spot now.
            const spot = { x: box.x, y: box.y };
            const centerX = box.x + box.w / 2;
            // Lightning shocks ordinary enemies (`zapped`); every other hit bleeds.
            if (kind === "lightning" && !enemy.constructor.reward) this.zaps.spawn(box.x, box.y);
            else this.blood.spawn(centerX, box.y + box.h / 2, fromX > centerX);

            if (enemy.dying && enemy.deathHit) {
                enemy.deathHit(kind);
                continue;
            }
            // soundZeusOuch: Zeus, Thor and the Sphinx cry out when hurt (Shadow Kratos has his own).
            if (enemy.constructor.reward && enemy.constructor.reward !== "shadowStageComplete") this.sfx.shadowHurt?.play();

            enemy.health = enemy.petrified ? 0 : Math.max(0, enemy.health - dealt);
            if (enemy.health > 0) {
                enemy.hurt?.(fromX, kind);
            } else {
                enemy.die?.();
                // Stone enemies shatter (soundRubbled) instead of dying.
                this.sfx[enemy.petrified ? "rubbled" : enemy.constructor.dieSfx ?? "enemyDie"]?.play();
                if (enemy.petrified) this.rubble.spawn(spot.x, spot.y, enemy instanceof Harpie || enemy instanceof Dragon || enemy instanceof Scarab);
                if (!enemy.dying) this._remove(enemy);
            }
        }
    }

    // Kratos at `body` touches Spazz: true once per purr (alarm of 40 steps).
    touchSpazz(body) {
        for (const cat of this.spazz) {
            if (cat.cooldown > 0 || !Collision.overlaps(body, cat)) continue;
            cat.cooldown = stepsToSeconds(40);
            this.sfx.spazz?.play();
            return true;
        }
        return false;
    }

    // What hurts a player whose body is `box`: an enemy touching it, or an
    // projectile (which is spent). Only archer arrows can be blocked;
    // contact and other projectiles still hurt while defending.
    hitPlayer(box, blocking = false, facingLeft = false) {
        let fromX = null;
        this.lastHitDamage = 1;
        this.lastHitPierces = false;
        for (const sources of [this.enemies, this.projectileGroups]) {
            for (const enemy of sources) {
                if (enemy.petrified) continue;
                const contactBox = enemy.contactBox;
                const hurtbox = contactBox === undefined ? enemy.hurtbox : contactBox;
                if (hurtbox && Collision.overlaps(box, hurtbox) &&
                    !(blocking && (enemy.blockableContact || enemy.constructor.blockableContact))) {
                    const contactX = hurtbox.x + hurtbox.w / 2;
                    this.lastHitDamage = enemy.contactDamage ?? enemy.constructor.contactDamage ?? 1;
                    this.lastHitPierces = enemy === this.bastet;
                    if (!blocking) return contactX;
                    if (fromX === null) fromX = contactX;
                }

                // The shield only stops arrows and spikes that come from the side Kratos faces.
                const blockArrows = blocking && enemy.constructor.blockableArrows;
                const center = box.x + box.w / 2;
                let blocked;
                do {
                    const arrowX = enemy.arrowHit?.(box) ?? null;
                    blocked = blockArrows && arrowX !== null && (facingLeft ? arrowX < center : arrowX > center);
                    if (blocked) this.sfx.blockArrows?.play();   // soundBlockArrows
                    else if (arrowX !== null) {
                        this.lastHitDamage = enemy.arrowDamage ?? 1;
                        this.lastHitPierces = enemy === this.bastet && enemy.state === "sphinxAttack";
                        if (!blocking) return arrowX;
                        if (fromX === null) fromX = arrowX;
                    }
                } while (blocked);
            }
        }
        return fromX;
    }

    _remove(enemy) {
        this.enemies.splice(this.enemies.indexOf(enemy), 1);
        const projectiles = enemy.detachProjectiles?.();
        if (projectiles) this.projectileGroups.push(projectiles);

        if (enemy.stoneArt) {
            const at = enemy.stoneArt.layer.props.indexOf(enemy.stoneArt.sprite);
            if (at >= 0) enemy.stoneArt.layer.props.splice(at, 1);
            enemy.stoneArt = null;
        }
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
        this.rubble.draw();
        this.zaps.draw();
    }
}
