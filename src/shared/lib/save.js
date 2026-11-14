const DIR = "mc0:/Bit_Of_War";
const FILE = `${DIR}/savegame.json`;
const VERSION = 1;

let queue = Promise.resolve();

const BROWSER_FILES = Object.freeze({
    "icon.sys": "assets/config/icon.sys",
    "Cleitos.icn": "assets/config/Cleitos.icn"
});

function installBrowserFiles() {
    MemoryCard.mkdir(DIR, { recursive: true });
    for (const [name, source] of Object.entries(BROWSER_FILES)) System.copyFile(source, `${DIR}/${name}`);
}

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

    async load() {
        if (!Save.exists()) return null;
        try {
            const data = await Save.read();
            return data && data.version === VERSION ? data : null;
        } catch (e) {
            return null;
        }
    },

    saveProgress(progress) {
        return Save._update(() => ({
            progress,

            weapons: Math.min(4, Math.max(1, Number(progress?.unlockedPowers) || 1))
        }));
    },

    weaponsOf(data) {
        const owned = Number(data?.weapons ?? data?.progress?.unlockedPowers);
        return Number.isFinite(owned) ? Math.min(4, Math.max(1, Math.floor(owned))) : 1;
    },

    async saveCompletion(time) {
        let bestTime = time;
        await Save._update(data => {
            if (Number.isFinite(data.bestTime) && data.bestTime >= 0) bestTime = Math.min(data.bestTime, time);
            return { progress: null, bestTime, weapons: 4 };
        });
        return bestTime;
    },

    saveGauntlet(seconds) {
        return Save._update(data => ({
            gauntletBest: Number.isFinite(data.gauntletBest) && data.gauntletBest <= seconds ? data.gauntletBest : seconds
        }));
    },

    saveSettings(settings) {
        return Save._update(() => ({ settings }));
    },

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
