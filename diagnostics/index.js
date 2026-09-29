// Boot with default_script = "diagnostics/index.js" in athena.ini.
// Only *_case.js files are runnable; helper modules stay out of this list.
const DIR = "diagnostics";
const SELF = `${DIR}/index.js`;
const WHITE = Color.new(255, 255, 255);
const DIM = Color.new(150, 150, 160);
const ACCENT = Color.new(90, 170, 255);
const GREEN = Color.new(110, 220, 120);
const RED = Color.new(255, 110, 100);
const BAR = Color.new(40, 60, 100);
const font = new Font();
const pad = Gamepad.player(0);
const { width, height } = Screen.getMode();
const line = Math.max(16, Math.ceil(font.getTextSize("Ag").height) + 4);
const margin = 24;
const rows = Math.max(3, Math.floor((height - 4 * line - 2 * margin) / line));
const columns = Math.max(20, Math.floor((width - 2 * margin) / (font.getTextSize("M").width || 10)));
const cases = System.listDir(DIR)
    .filter(entry => !entry.dir && entry.name.endsWith("_case.js"))
    .map(entry => entry.name).sort();
const last = std.lastRun();
let selected = Math.max(0, cases.indexOf(last?.script?.split("/").pop()));
let top = 0;
let output = null;

function print(x, y, value, color = WHITE) {
    font.color = color;
    font.print(x, y, value);
}

function wrap(value) {
    const lines = [];
    for (const paragraph of value.replace(/\n+$/, "").split("\n")) {
        let rest = paragraph.replace(/\t/g, "    ");
        do {
            lines.push(rest.slice(0, columns));
            rest = rest.slice(columns);
        } while (rest.length);
    }
    return lines;
}

function showOutput() {
    if (!last) return;
    const value = [last.output, last.error].filter(Boolean).join("\n");
    const lines = value ? wrap(value) : ["(no output; see diagnostics.log)"];
    output = { lines, scroll: Math.max(0, lines.length - (rows - 1)) };
}

if (last) showOutput();

Loop.run(() => {
    Gamepad.update();
    print(margin, margin, "Bit of War - PS2 diagnostics", ACCENT);

    if (output) {
        const visible = rows - 1;
        const max = Math.max(0, output.lines.length - visible);
        if (pad.repeatPressed(Gamepad.UP)) output.scroll--;
        if (pad.repeatPressed(Gamepad.DOWN)) output.scroll++;
        if (pad.repeatPressed(Gamepad.LEFT)) output.scroll -= visible;
        if (pad.repeatPressed(Gamepad.RIGHT)) output.scroll += visible;
        output.scroll = Math.max(0, Math.min(max, output.scroll));
        print(margin, margin + 2 * line, `${last.script}: ${last.status}`, last.status === "error" ? RED : GREEN);
        for (let i = 0; i < visible && output.scroll + i < output.lines.length; i++) {
            const value = output.lines[output.scroll + i];
            print(margin, margin + (3 + i) * line, value,
                value.includes("[FAIL]") || value.includes("[TIMEOUT]") ? RED :
                    value.includes("[PASS]") ? GREEN : WHITE);
        }
        if (pad.anyJustPressed(Gamepad.CROSS | Gamepad.CIRCLE)) output = null;
        print(margin, height - margin - line, "UP/DOWN scroll   LEFT/RIGHT page   X/O list", DIM);
        return;
    }

    if (selected < top) top = selected;
    if (selected >= top + rows) top = selected - rows + 1;
    for (let i = 0; i < rows && top + i < cases.length; i++) {
        const y = margin + (2 + i) * line;
        if (top + i === selected) Draw.rect(margin - 6, y - 2, width - 2 * margin + 12, line, BAR);
        print(margin, y, cases[top + i], top + i === selected ? WHITE : DIM);
    }
    if (pad.repeatPressed(Gamepad.UP)) selected = (selected + cases.length - 1) % cases.length;
    if (pad.repeatPressed(Gamepad.DOWN)) selected = (selected + 1) % cases.length;
    if (pad.repeatPressed(Gamepad.LEFT)) selected = Math.max(0, selected - rows);
    if (pad.repeatPressed(Gamepad.RIGHT)) selected = Math.min(cases.length - 1, selected + rows);
    if (cases.length && pad.justPressed(Gamepad.CROSS)) {
        std.reload(`${DIR}/${cases[selected]}`, { returnTo: SELF });
    }
    if (last && pad.justPressed(Gamepad.TRIANGLE)) showOutput();
    print(margin, height - margin - line,
        "X run   TRIANGLE last output   SELECT+START return from a case", DIM);
}, { clearColor: Color.new(12, 14, 22) });
