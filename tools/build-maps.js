// Converts the editor exports in tools/maps-src into the compact format the
// game reads from src/data. Run: node tools/build-maps.js
//
//   { "backgroundColor": "#rrggbb",
//     "layers": [ { "layer": 0, "tiles": { "<id>": [x0, y0, x1, y1, ...] } }, ... ],
//     "colliders": { "ground": [x, y, w, h, ...], "door": [...], "ladder": [...], "kill": [...] },
//     "markers": { "<name>": [x0, y0, x1, y1, ...] } }   in editor order
//
// "layers" is sorted by draw order (ascending, the last one is drawn on top) and
// each group of tiles is sorted by x. A placement without a layer is layer 0.
const fs = require("fs");
const path = require("path");

const SRC = path.join(__dirname, "maps-src");
const OUT = path.join(__dirname, "..", "src", "data");
const COLLIDERS = ["ground", "door", "ladder", "kill"];

fs.mkdirSync(OUT, { recursive: true });

for (const file of fs.readdirSync(SRC).filter(f => f.endsWith(".json"))) {
    const map = JSON.parse(fs.readFileSync(path.join(SRC, file), "utf8"));
    const out = { backgroundColor: map.backgroundColor ?? "#000000", layers: [], colliders: {}, markers: {} };
    const byLayer = new Map();

    for (const [id, placements] of Object.entries(map.tiles)) {
        for (const p of placements) {
            const layer = p.layer ?? 0;
            if (!byLayer.has(layer)) byLayer.set(layer, {});
            const tiles = byLayer.get(layer);
            (tiles[id] ??= []).push(p);
        }
    }

    for (const layer of [...byLayer.keys()].sort((a, b) => a - b)) {
        const tiles = byLayer.get(layer);
        for (const id of Object.keys(tiles)) {
            tiles[id] = tiles[id].sort((a, b) => a.x - b.x).flatMap(p => [p.x, p.y]);
        }
        out.layers.push({ layer, tiles });
    }

    for (const type of COLLIDERS) {
        const list = (map.colliders ?? []).filter(c => c.type === type);
        if (list.length) out.colliders[type] = list.flatMap(c => [c.x, c.y, c.width, c.height]);
    }

    for (const m of map.markers ?? []) (out.markers[m.name] ??= []).push(m.x, m.y);

    const text = JSON.stringify(out);
    fs.writeFileSync(path.join(OUT, file), text);
    console.log(`${file}: ${fs.statSync(path.join(SRC, file)).size} -> ${text.length} bytes`);
}
