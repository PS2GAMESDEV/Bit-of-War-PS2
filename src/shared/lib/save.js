const DIR = "mc0:/Bit_Of_War";
const FILE = `${DIR}/savegame.json`;
const VERSION = 1;

// Tail of the write queue (see Save._update); its promises never reject.
let queue = Promise.resolve();

// Files that make the save show up in the PS2 browser.
const BROWSER_FILES = Object.freeze({
    "icon.sys": "assets/config/icon.sys",
    "Cleitos.icn": "assets/config/Cleitos.icn"
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
    },

    // The save file, or null without a card, without a file, or unreadable.
    //   { version, progress: Progress | null, bestTime: seconds | null, settings: Settings | null,
    //     gauntletBest?: seconds, weapons?: 1..4 }
    // The last two were added with Gauntlet mode; slots without them read as
    // "no record" and "gorgon head only" (the version is unchanged on purpose).
    // Progress also carries resources, unlockedPowers and selectedPower. Old
    // version-1 slots omit these; Game infers unlocked weapons from the level.
    // Settings: { music, sfx, lang }
    async load() {
        if (!Save.exists()) return null;
        try {
            const data = await Save.read();
            return data && data.version === VERSION ? data : null;
        } catch (e) {
            return null;
        }
    },

    // Stores a game in progress. False when it could not be written.
    saveProgress(progress) {
        return Save._update(() => ({
            progress,
            // New Game resets the unlock flags in the original, so this follows the
            // current game rather than keeping a maximum.
            weapons: Math.min(4, Math.max(1, Number(progress?.unlockedPowers) || 1))
        }));
    },

    // Weapons earned so far (1 = Gorgon Head only): what Gauntlet mode starts with.
    weaponsOf(data) {
        const owned = Number(data?.weapons ?? data?.progress?.unlockedPowers);
        return Number.isFinite(owned) ? Math.min(4, Math.max(1, Math.floor(owned))) : 1;
    },

    // The game was finished in `time` seconds: clears the progress, keeps the
    // best time (returned).
    async saveCompletion(time) {
        let bestTime = time;
        await Save._update(data => {
            if (Number.isFinite(data.bestTime) && data.bestTime >= 0) bestTime = Math.min(data.bestTime, time);
            return { progress: null, bestTime, weapons: 4 };
        });
        return bestTime;
    },

    // A Gauntlet run ended in `seconds`: keeps it only if it beats the record.
    saveGauntlet(seconds) {
        return Save._update(data => ({
            gauntletBest: Number.isFinite(data.gauntletBest) && data.gauntletBest <= seconds ? data.gauntletBest : seconds
        }));
    },

    saveSettings(settings) {
        return Save._update(() => ({ settings }));
    },

    // Read-modify-write of the file. Calls queue up, so two writes never
    // overlap and none loses the other's fields. `change(data)` returns the
    // fields to replace.
    _update(change) {
        const run = queue.then(async () => {
            if (!Save.isReady()) return false;
            try {
                const data = (await Save.load()) ?? { version: VERSION, progress: null, bestTime: null, settings: null };
                await Save.write({ ...data, ...change(data), version: VERSION });
                return true;
            } catch (e) {
                return false;
            }
        });
        queue = run;
        return run;
    }
});
