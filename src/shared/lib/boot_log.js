// Diagnostic log for freezes on real hardware. The file is opened and closed on
// every line so that what was written survives a hang. Remove once solved.
const LOG = System.bootPath + "boot.log";

export function log(message) {
    try {
        const file = std.open(LOG, "a");
        file.puts(`${message}\n`);
        file.close();
    } catch (e) {
        // The log must never bring the game down.
    }
}
