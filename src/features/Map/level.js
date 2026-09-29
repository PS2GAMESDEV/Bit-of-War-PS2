import { GAME_SCALE, LAYER, VFX_SCREEN_COLOR } from "../../shared/lib/constants.js";
import { Undead } from "../Enemies/undead.js";

const TILE = 16 * GAME_SCALE;

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
    enHarpie: "harpie"
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
    const index = atlas.findFrame(id + ".png");
    return index >= 0 ? index : atlas.findFrame(id);
}

/**
 * One map: a TileMap for the static tiles (drawn by VU1), Sprite instances for
 * torches, enemies and chests, and the solid/door/ladder bodies in `world`.
 */
export class Level {
    constructor(map, sheets, world) {
        const atlas = sheets.atlas;
        const sprites = [];
        const groups = [];

        this.background = parseColor(map.backgroundColor);
        this.props = [];
        this.enemies = [];
        this.chests = [];
        this.spawn = { x: 100, y: 100 };
        this.width = 0;
        this.height = 0;
        this._range = { first: 0, count: 0 };

        for (const [id, placements] of Object.entries(map.tiles)) {
            if (id === "spriteKratos") {
                this.spawn = { x: placements[0] * GAME_SCALE, y: placements[1] * GAME_SCALE };
                continue;
            }

            const sheetName = PROP_SHEET[id];
            if (sheetName) {
                this._addProps(sheets[sheetName], sheetName, placements, world);
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

        this.groups = groups;
        this.tiles = new TileMap.Instance({
            descriptor: new TileMap.Descriptor({
                textures: [atlas.image],
                materials: [{ textureIndex: 0, blendMode: BLEND, endOffset: sprites.length - 1 }]
            }),
            spriteBuffer: TileMap.SpriteBuffer.fromObjects(sprites)
        });

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
    }

    _addProps(sheet, sheetName, placements, world) {
        const flash = CHEST_FLASH[sheetName];

        for (let i = 0; i < placements.length; i += 2) {
            const x = placements[i] * GAME_SCALE;
            const y = placements[i + 1] * GAME_SCALE;
            const options = { scale: GAME_SCALE, x, y };
            if (sheetName === "torch") options.clip = "burn";
            if (sheetName === "undead") options.clip = "walk";

            const sprite = new Sprite.Instance(sheet, options);
            this.props.push(sprite);

            if (sheetName === "undead") this.enemies.push(new Undead(sprite, world, x, y));

            // The chest rect doubles as a Collision shape for Collision.overlaps().
            if (flash) this.chests.push({ sprite, x, y, w: TILE, h: TILE, flash, opened: false });
        }
    }

    // Enemy AI; call before the world is stepped.
    update() {
        for (const enemy of this.enemies) enemy.update();
    }

    // Draws only the slice of every tile group that the camera can see.
    render(camera) {
        for (const enemy of this.enemies) enemy.sync();

        const view = camera.visibleRect();
        const right = view.x + view.w;
        const range = this._range;

        for (const group of this.groups) {
            const from = lowerBound(group.xs, view.x - group.reach);
            const to = lowerBound(group.xs, right);
            if (to <= from) continue;

            range.first = group.first + from;
            range.count = to - from;
            this.tiles.render(0, 0, range);
        }

        Sprite.drawAll(this.props);
    }
}
