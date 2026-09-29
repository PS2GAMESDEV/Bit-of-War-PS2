// Diagnostic log for freezes on real hardware. A file is opened and closed per
// line so what was written survives a hang. Remove once solved.
// Only the boot folder: an extra mc0: target could itself block the IOP.
const BASE = System.bootPath.endsWith("/") ? System.bootPath : System.bootPath + "/";
const LOG = BASE + "boot.log";

export function log(message) {
    try {
        const file = std.open(LOG, "a");
        if (!file) return;
        file.puts(`${message}\n`);
        file.close();
    } catch (e) {
        // The log must never bring the game down.
    }
}
