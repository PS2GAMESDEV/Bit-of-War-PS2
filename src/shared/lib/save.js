const DIR = "mc0:/Bit_Of_War";
const FILE = `${DIR}/savegame.json`;

// Files that make the save show up in the PS2 browser.
const BROWSER_FILES = Object.freeze({
    "icon.sys": "assets/config/icon.sys",
    "icon.icn": "assets/config/cuphead.icn",
    "del.icn": "assets/config/cupheaddelete.icn"
});

function installBrowserFiles() {
    MemoryCard.mkdir(DIR, { recursive: true });
    for (const [name, source] of Object.entries(BROWSER_FILES)) System.copyFile(source, `${DIR}/${name}`);
}

// Save slot on the memory card in port 1. Reads and writes run on a worker
// thread and return a job: `await` it or poll it.
export const Save = Object.freeze({
    isReady() {
        const card = MemoryCard.getInfo(0);
        return card.connected && card.formatted;
    },

    exists() {
        return this.isReady() && MemoryCard.exists(FILE);
    },

    write(state) {
        if (!MemoryCard.exists(DIR)) installBrowserFiles();
        return MemoryCard.writeJSONAsync(FILE, state, { atomic: true });
    },

    read() {
        return MemoryCard.readJSONAsync(FILE);
    },

    remove() {
        return MemoryCard.removeAsync(FILE);
    }
});
