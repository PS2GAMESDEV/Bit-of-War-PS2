// Converts the editor exports in tools/maps-src into the compact format the
// game reads from src/data. Run: node tools/build-maps.js
//
//   { "tiles": { "<id>": [x0, y0, x1, y1, ...] },      sorted by x
//     "colliders": { "ground": [x, y, w, h, ...], "door": [...], "ladder": [...] } }
const fs = require("fs");
const path = require("path");

const SRC = path.join(__dirname, "maps-src");
const OUT = path.join(__dirname, "..", "src", "data");
const COLLIDERS = ["ground", "door", "ladder"];

fs.mkdirSync(OUT, { recursive: true });

for (const file of fs.readdirSync(SRC).filter(f => f.endsWith(".json"))) {
    const map = JSON.parse(fs.readFileSync(path.join(SRC, file), "utf8"));
    const out = { tiles: {}, colliders: {} };

    for (const [id, placements] of Object.entries(map.tiles)) {
        out.tiles[id] = placements
            .slice()
            .sort((a, b) => a.x - b.x)
            .flatMap(p => [p.x, p.y]);
    }

    for (const type of COLLIDERS) {
        const list = (map.colliders ?? []).filter(c => c.type === type);
        if (list.length) out.colliders[type] = list.flatMap(c => [c.x, c.y, c.width, c.height]);
    }

    const text = JSON.stringify(out);
    fs.writeFileSync(path.join(OUT, file), text);
    console.log(`${file}: ${fs.statSync(path.join(SRC, file)).size} -> ${text.length} bytes`);
}
