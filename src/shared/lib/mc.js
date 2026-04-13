class MemoryCard {
    static #instance;

    #slot      = 1;
    #gameDir   = "Bit_Of_War";
    #mcPath    = "mc0:/";
    #gamePath  = "mc0:/" + this.#gameDir + "/";

    #icons = {
        icon:       null,
        deleteIcon: null,
        sys:        null,
    };

    #mutex  = new Mutex();
    #thread = null;
    #queue  = [];
    #running = false;

    constructor() {
        if (MemoryCard.#instance) return MemoryCard.#instance;
        MemoryCard.#instance = this;
        this.#startWorker();
    }

    configure({ slot = 1, gameDir = "Bit_Of_War" } = {}) {
        if (slot !== 1 && slot !== 2) throw new Error("[MemoryCard] slot deve ser 1 ou 2.");
        this.#slot      = slot;
        this.#gameDir   = gameDir;
        this.#mcPath    = `mc${slot - 1}:/`;
        this.#gamePath  = `${this.#mcPath}${gameDir}/`;
    }

    setIcons({ icon = null, deleteIcon = null, sys = null } = {}) {
        this.#icons = { icon, deleteIcon, sys };
    }

    save(data, callback, fileName = "savegame.txt") {
        this.#enqueue("save", { data, fileName }, callback);
    }

    load(callback, fileName = "savegame.txt") {
        this.#enqueue("load", { fileName }, callback);
    }

    deleteSave(callback, fileName = "savegame.txt") {
        this.#enqueue("delete", { fileName }, callback);
    }

    listSaves(callback) {
        this.#enqueue("list", {}, callback);
    }

    isReady() {
        try {
            const info = System.getMCInfo(this.#slot - 1);
            return info.type !== 0 && info.format !== 0;
        } catch {
            return false;
        }
    }

    getFreeMemory() {
        try {
            const info = System.getMCInfo(this.#slot - 1);
            return info.freemem ?? -1;
        } catch {
            return -1;
        }
    }

    #enqueue(op, args, resolve) {
        this.#mutex.lock();
        this.#queue.push({ op, args, resolve });
        this.#mutex.unlock();
    }

    #startWorker() {
        this.#running = true;

        this.#thread = new Thread(() => {
            while (this.#running) {
                this.#mutex.lock();
                const job = this.#queue.shift() ?? null;
                this.#mutex.unlock();

                if (!job) {
                    os.sleep(16);
                    continue;
                }

                let result;
                try {
                    result = this.#dispatch(job.op, job.args);
                } catch (err) {
                    console.log(`[MemoryCard] Erro em '${job.op}': ${err}`);
                    result = job.op === "load" ? null : false;
                }

                if (typeof job.resolve === "function") {
                    job.resolve(result);
                }
            }
        }, "MemoryCard: Worker");

        this.#thread.start();
    }

    destroy() {
        this.#running = false;
        this.#thread?.stop();
        this.#thread = null;
    }

    #dispatch(op, args) {
        switch (op) {
            case "save":   return this.#opSave(args.data, args.fileName);
            case "load":   return this.#opLoad(args.fileName);
            case "delete": return this.#opDelete(args.fileName);
            case "list":   return this.#opList();
            default:
                console.log(`[MemoryCard] Operação desconhecida: ${op}`);
                return false;
        }
    }

    #opSave(data, fileName) {
        if (!this.isReady()) return false;

        if (!std.exists(this.#gamePath)) {
            if (!this.#createGameDirectory()) return false;
        }

        const file = std.open(`${this.#gamePath}${fileName}`, "w");
        if (!file) {
            console.log("[MemoryCard] Falha ao abrir arquivo para escrita.");
            return false;
        }

        for (const key in data) {
            file.printf("%s=%s\n", key, data[key]);
        }

        file.flush();
        file.close();
        return true;
    }

    #opLoad(fileName) {
        if (!this.isReady()) return null;

        const filePath = `${this.#gamePath}${fileName}`;
        if (!std.exists(filePath)) return null;

        const file = std.open(filePath, "r");
        if (!file) return null;

        const content = file.readAsString();
        file.close();

        const data = {};
        for (const line of content.split("\n")) {
            if (line.trim() === "") continue;

            const eqIdx = line.indexOf("=");
            if (eqIdx === -1) continue;

            const key   = line.slice(0, eqIdx).trim();
            const value = line.slice(eqIdx + 1).trim();

            if      (value === "true")                      data[key] = true;
            else if (value === "false")                     data[key] = false;
            else if (value !== "NaN" && !isNaN(value))     data[key] = Number(value);
            else                                            data[key] = value;
        }

        return data;
    }

    #opDelete(fileName) {
        if (!this.isReady()) return false;

        const filePath = `${this.#gamePath}${fileName}`;
        if (!std.exists(filePath)) return false;

        return os.remove(filePath) === 0;
    }

    #opList() {
        if (!this.isReady()) return [];
        if (!std.exists(this.#gamePath)) return [];

        const files = System.listDir(this.#gamePath);
        return files
            .filter(f => !f.directory)
            .map(f => f.name);
    }

    #createGameDirectory() {
        const result = os.mkdir(this.#gamePath, 0o777);

        if (result !== 0 && result !== -os.EEXIST) {
            console.log(`[MemoryCard] Falha ao criar diretório: ${result}`);
            return false;
        }

        this.#copyIcons();
        return true;
    }

    #copyIcons() {
        const { icon, deleteIcon, sys } = this.#icons;

        if (icon)       this.#safeCopy(icon,       `${this.#gamePath}icon.icn`);
        if (deleteIcon) this.#safeCopy(deleteIcon,  `${this.#gamePath}del.icn`);
        if (sys)        this.#safeCopy(sys,         `${this.#gamePath}icon.sys`);
    }

    #safeCopy(src, dest) {
        try {
            System.copyFile(src, dest);
        } catch (err) {
            console.log(`[MemoryCard] Aviso: não foi possível copiar '${src}': ${err}`);
        }
    }
}

export default new MemoryCard();