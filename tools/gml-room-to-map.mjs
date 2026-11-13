// Converts a room dumped from the original executable (references/.../extraction
// output: inventory.tsv, objects/*.gml, rooms/*.gml) into the tools/maps-src
// editor format, so tools/build-maps.js can compile it.
//
//   node tools/gml-room-to-map.mjs <dump dir> <room id> <out.json>
//
// Only structure that the dump actually states is reproduced:
//   tiles      one entry per instance, keyed by object name (timerBossRush excluded)
//              or by the atlas frame that draws it (doors -> "door");
//   layers     depth first (GM draws higher depth first), then the instance
//              order wherever two objects overlap in one cell;
//   ground     every cell of an object flagged `solid` in the original;
//   door       tileDoorTo* at (x, y) -> 16x32 collider at (x, y - 16);
//   ladder     tileLadder* cells, merged vertically.
// Colliders for hazards (kill) and hand-tuned rects are not derived.
import fs from "node:fs";
import path from "node:path";

const SKIP = new Set(["timerBossRush"]);
const ATLAS = new URL("../assets/images/tiles/texture.json", import.meta.url);

// The packed atlas names a few of the original objects differently.
function atlasName(name, frames) {
    if (frames.has(`${name}.png`)) return name;
    if (name === "doortopper" || name.startsWith("tileDoorTo")) return "door";
    if (name === "tileStoneWallTop") return "tileWallTop";
    return name;
}
const CELL = 16;

export function readDump(dir) {
    const objects = new Map();
    for (const line of fs.readFileSync(path.join(dir, "inventory.tsv"), "utf8").split("\n")) {
        const p = line.split("\t");
        if (p[0] === "object") objects.set(Number(p[1]), { name: p[2] });
    }
    for (const file of fs.readdirSync(path.join(dir, "objects"))) {
        const head = fs.readFileSync(path.join(dir, "objects", file), "utf8").split("\n", 1)[0];
        const m = /^\/\/ object (\d+): .*depth=(-?\d+) solid=(\w+)/.exec(head);
        Object.assign(objects.get(Number(m[1])), { depth: Number(m[2]), solid: m[3] === "true" });
    }
    return objects;
}

export function readRoom(dir, id, objects) {
    const file = fs.readdirSync(path.join(dir, "rooms")).find(f => f.startsWith(`${id}_`));
    const text = fs.readFileSync(path.join(dir, "rooms", file), "utf8");
    const bg = /^\/\/ BG (#[0-9a-f]{6})/m.exec(text)?.[1].toUpperCase() ?? "#000000";
    const instances = [...text.matchAll(/\/\/ INSTANCE \((-?\d+), (-?\d+), (\d+), (\d+)\)/g)]
        .map(m => ({ x: Number(m[1]), y: Number(m[2]), id: Number(m[4]), ...objects.get(Number(m[3])) }))
        .filter(i => !SKIP.has(i.name))
        .sort((a, b) => a.id - b.id);
    const [width, height] = /^\/\/ room \d+ \S+ (\d+)x(\d+)/m.exec(text).slice(1).map(Number);
    return { name: file.replace(/^\d+_|\.gml$/g, ""), bg, instances, size: { width, height } };
}

// name -> layer number. Objects of one depth that overlap keep their creation order.
function assignLayers(instances) {
    const depth = new Map(instances.map(i => [i.name, i.depth]));
    const cells = new Map();
    const before = new Map();
    for (const i of instances) {
        const key = `${i.x},${i.y}`;
        for (const earlier of cells.get(key) ?? []) {
            if (earlier === i.name || depth.get(earlier) !== i.depth) continue;
            (before.get(earlier) ?? before.set(earlier, new Set()).get(earlier)).add(i.name);
        }
        (cells.get(key) ?? cells.set(key, []).get(key)).push(i.name);
    }
    // Longest path in the "drawn before" graph; a back edge in a cycle is ignored.
    const rank = new Map();
    const visiting = new Set();
    const visit = name => {
        if (rank.has(name)) return rank.get(name);
        visiting.add(name);
        let r = 0;
        for (const [other, afters] of before) {
            if (afters.has(name) && !visiting.has(other)) r = Math.max(r, visit(other) + 1);
        }
        visiting.delete(name);
        rank.set(name, r);
        return r;
    };
    for (const name of depth.keys()) visit(name);
    const keys = [...depth.keys()].map(name => [-depth.get(name), rank.get(name)]);
    const unique = [...new Set(keys.map(k => k.join(",")))].map(k => k.split(",").map(Number))
        .sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    return new Map([...depth.keys()].map(name => [name,
        unique.findIndex(k => k[0] === -depth.get(name) && k[1] === rank.get(name))]));
}

// Greedy rectangles: horizontal runs per row, then identical runs stacked.
function mergeCells(cells) {
    const rows = new Map();
    for (const [x, y] of new Map(cells.map(c => [`${c}`, c])).values()) (rows.get(y) ?? rows.set(y, []).get(y)).push(x);
    const runs = [];
    for (const y of [...rows.keys()].sort((a, b) => a - b)) {
        const xs = rows.get(y).sort((a, b) => a - b);
        let start = xs[0];
        for (let i = 1; i <= xs.length; i++) {
            if (xs[i] !== xs[i - 1] + CELL) {
                runs.push({ x: start, y, w: xs[i - 1] + CELL - start, h: CELL });
                start = xs[i];
            }
        }
    }
    const merged = [];
    for (const run of runs) {
        const above = merged.find(r => r.x === run.x && r.w === run.w && r.y + r.h === run.y);
        if (above) above.h += CELL;
        else merged.push({ ...run });
    }
    return merged;
}

export function convert(room) {
    const layers = assignLayers(room.instances);
    const tiles = {};
    const frames = new Set(Object.keys(JSON.parse(fs.readFileSync(ATLAS, "utf8")).frames));
    for (const i of room.instances) {
        (tiles[atlasName(i.name, frames)] ??= []).push({ x: i.x, y: i.y, creationCode: null, locked: false, layer: layers.get(i.name) });
    }
    const colliders = [];
    const ground = room.instances.filter(i => i.solid && i.name !== "secretInvisibleBlocks").map(i => [i.x, i.y]);
    for (const r of mergeCells(ground)) colliders.push({ x: r.x, y: r.y, width: r.w, height: r.h, type: "ground" });
    for (const i of room.instances.filter(i => i.name.startsWith("tileDoorTo"))) {
        colliders.push({ x: i.x, y: i.y - CELL, width: CELL, height: 2 * CELL, type: "door" });
    }
    const ladder = room.instances.filter(i => i.name.startsWith("tileLadder")).map(i => [i.x, i.y]);
    const columns = new Map();
    for (const [x, y] of ladder) (columns.get(x) ?? columns.set(x, []).get(x)).push(y);
    for (const [x, ys] of columns) {
        ys.sort((a, b) => a - b);
        let start = ys[0];
        for (let k = 1; k <= ys.length; k++) {
            if (ys[k] !== ys[k - 1] + CELL) {
                colliders.push({ x, y: start, width: CELL, height: ys[k - 1] + CELL - start, type: "ladder" });
                start = ys[k];
            }
        }
    }
    return { backgroundColor: room.bg, size: room.size, tiles, colliders, markers: [] };
}

if (import.meta.url === `file://${process.argv[1]}`) {
    const [dir, id, out] = process.argv.slice(2);
    const objects = readDump(dir);
    const map = convert(readRoom(dir, id, objects));
    fs.writeFileSync(out, JSON.stringify(map, null, 2) + "\n");
    console.log(`${out}: ${Object.keys(map.tiles).length} tile ids, ${map.colliders.length} colliders`);
}
