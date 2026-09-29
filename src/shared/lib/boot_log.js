// Diagnostic log for freezes on real hardware. Each line goes to every target
// below; a file is opened and closed per line so what was written survives a
// hang. Remove once solved.
const BASE = System.bootPath.endsWith("/") ? System.bootPath : System.bootPath + "/";

// The boot folder first (USB / HDD through mass:), then the memory card.
const TARGETS = [BASE + "boot.log", "mc0:/bwp_boot.log"];

// The last write error per target, shown on the loading screen.
export const status = TARGETS.map(path => ({ path, ok: null, error: "" }));

export function log(message) {
    for (let i = 0; i < TARGETS.length; i++) {
        try {
            const file = std.open(TARGETS[i], "a");
            if (!file) throw new Error("open failed");
            file.puts(`${message}\n`);
            file.close();
            status[i].ok = true;
        } catch (e) {
            status[i].ok = false;
            status[i].error = String(e && e.message || e);
        }
    }
}

export const bootPath = System.bootPath;
