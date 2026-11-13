// Expands original GM8 paths (extraction dump: paths/*.tsv) into the control
// nodes the game follows, using the same smoothing as the original runtime.
//   node tools/gml-path-to-js.mjs <dump dir> <id> [<id> ...]   -> JSON on stdout
import fs from "node:fs";
import path from "node:path";

const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];

export function expandPath(text) {
    const [header, ...rows] = text.trim().split("\n");
    const meta = /connection=(\d+) closed=(\w+) precision=(\d+)/.exec(header);
    const points = rows.map(r => r.split("\t").slice(0, 2).map(Number));
    const [curve, closed, precision] = [meta[1] === "1", meta[2] === "true", Number(meta[3])];
    const nodes = [];
    const push = p => nodes.push(p);
    const smooth = (n, p1, p2, p3) => {
        if (n <= 0) return;
        const avg = [(p1[0] + 2 * p2[0] + p3[0]) / 4, (p1[1] + 2 * p2[1] + p3[1]) / 4];
        if (dist(p1, p2) > 4) smooth(n - 1, p1, mid(p1, p2), avg);
        push(avg);
        if (dist(p2, p3) > 4) smooth(n - 1, avg, mid(p2, p3), p3);
    };
    if (!curve) {
        points.forEach(push);
        if (closed) push(points[0]);
    } else {
        if (!closed) push(points[0]);
        const count = closed ? points.length : points.length - 2;
        for (let i = 0; i < count; i++) {
            const p0 = points[i % points.length], p1 = points[(i + 1) % points.length], p2 = points[(i + 2) % points.length];
            smooth(precision, mid(p0, p1), p1, mid(p1, p2));
        }
        push(closed ? nodes[0] ?? points[0] : points.at(-1));
    }
    return nodes.flat();
}

if (import.meta.url === `file://${process.argv[1]}`) {
    const [dir, ...ids] = process.argv.slice(2);
    const out = {};
    for (const id of ids) {
        const file = fs.readdirSync(path.join(dir, "paths")).find(f => f.startsWith(`${id}_`));
        out[id] = expandPath(fs.readFileSync(path.join(dir, "paths", file), "utf8"));
    }
    console.log(JSON.stringify(out));
}
