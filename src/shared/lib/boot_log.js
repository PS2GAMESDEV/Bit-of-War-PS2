const BASE = System.bootPath.endsWith("/") ? System.bootPath : System.bootPath + "/";
const LOG = BASE + "boot.log";

export function log(message) {
    try {
        const file = std.open(LOG, "a");
        if (!file) return;
        file.puts(`${message}\n`);
        file.close();
    } catch (e) {

    }
}
