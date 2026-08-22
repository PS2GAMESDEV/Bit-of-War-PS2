import Assets from './assets.js';

const State = Object.freeze({
    IDLE: 'idle',
    EXITING: 'exiting',
    LOADING: 'loading',
    ENTERING: 'entering',
    RUNNING: 'running',
});

class JobQueue {
    constructor() {
        this._jobs = [];
    }

    push(fn) {
        this._jobs.push(fn);
    }

    get size() {
        return this._jobs.length;
    }

    process(budget) {
        const n = Math.min(budget, this._jobs.length);
        for (let i = 0; i < n; i++) {
            const job = this._jobs.shift();
            job();
        }
        return n;
    }

    clear() {
        this._jobs.length = 0;
    }
}

export class Scene {
    static assetRoot = 'assets/scene';

    manifest() {
        return { images: [], sounds: [], fonts: [] };
    }

    onEnter(_assets) {}

    onUpdate(_dt) {}

    onDraw() {}

    onExit() {}
}

export class SceneManager {
    constructor({
        loadingScreen,
        blockingPerFrame = 1,
        minLoadingFrames = 6,
    } = {}) {
        if (!loadingScreen) {
            throw new Error('[SceneManager] loadingScreen é obrigatório');
        }

        this.state = State.IDLE;
        this.current = null;

        this.loadingScreen = loadingScreen;
        this.blockingPerFrame = blockingPerFrame;
        this.minLoadingFrames = minLoadingFrames;

        this._imageList = new ImageList();

        this.blockingQueue = new JobQueue();

        this._nextSceneClass = null;
        this._nextInstance = null;
        this._pendingImages = [];
        this._loadedAssets = null;
        this._pendingAssetPaths = [];

        this._totalJobs = 0;
        this._doneJobs = 0;
        this._loadingFrameCount = 0;
    }

    get progress() {
        if (this._totalJobs === 0) return 1;
        return Math.min(1, this._doneJobs / this._totalJobs);
    }

    get isTransitioning() {
        return this.state !== State.RUNNING && this.state !== State.IDLE;
    }

    goto(SceneClass) {
        if (this.isTransitioning) return false;
        this._nextSceneClass = SceneClass;
        this.state = State.EXITING;
        return true;
    }

    update(dt) {
        switch (this.state) {
            case State.EXITING:
                this._doExit();
                break;
            case State.LOADING:
                this._doLoading();
                break;
            case State.ENTERING:
                this._doEnter();
                break;
            case State.RUNNING:
                if (this.current) this.current.onUpdate(dt);
                break;
        }
    }

    draw() {
        if (this.state === State.RUNNING && this.current) {
            this.current.onDraw();
            return;
        }
        this.loadingScreen.onDraw(this.progress);
    }

    _doExit() {
        if (this.current) {
            this.current.onExit();

            const paths = this._currentAssetPaths || [];
            for (const path of paths) Assets.free(path);
            this._currentAssetPaths = null;
            this.current = null;
        }

        std.gc();

        this._nextInstance = new this._nextSceneClass();
        this._prepareManifest(this._nextInstance.manifest(), this._nextInstance.constructor.assetRoot);
        this._loadingFrameCount = 0;
        this.state = State.LOADING;
    }

    _prepareManifest(manifest, root) {
        this._totalJobs = 0;
        this._doneJobs = 0;
        this._pendingImages = [];
        this._loadedAssets = { images: {}, sounds: {}, fonts: {} };
        this._pendingAssetPaths = [];

        const images = manifest.images || [];
        for (const spec of images) {
            const path = withRoot(root, spec.path);
            this._totalJobs++;
            const img = Assets.image(path, {
                asyncList: this._imageList,
                scale: spec.scale,
                optimize: spec.optimize,
                lock: spec.lock,
                animConfig: spec.animConfig
            });
            this._pendingImages.push({ path, img });
            this._loadedAssets.images[spec.path] = img;
            this._pendingAssetPaths.push(path);
        }
        if (images.length) this._imageList.process();

        for (const relPath of manifest.sounds || []) {
            const path = withRoot(root, relPath);
            this._totalJobs++;
            this._pendingAssetPaths.push(path);
            this.blockingQueue.push(() => {
                this._loadedAssets.sounds[relPath] = Assets.sound(path);
                this._doneJobs++;
            });
        }

        for (const relPath of manifest.fonts || []) {
            const path = withRoot(root, relPath);
            this._totalJobs++;
            this._pendingAssetPaths.push(path);
            this.blockingQueue.push(() => {
                this._loadedAssets.fonts[relPath] = Assets.font(path);
                this._doneJobs++;
            });
        }
    }

    _doLoading() {
        this._loadingFrameCount++;

        if (this._pendingImages.length) {
            this._pendingImages = this._pendingImages.filter(({ path, img }) => {
                if (img.ready()) {
                    Assets.applyPostLoad(path);
                    this._doneJobs++;
                    return false;
                }
                return true;
            });
        }

        this.blockingQueue.process(this.blockingPerFrame);

        const stillLoading =
            this._pendingImages.length > 0 ||
            this.blockingQueue.size > 0;

        const minFramesElapsed = this._loadingFrameCount >= this.minLoadingFrames;

        if (!stillLoading && minFramesElapsed) {
            this.state = State.ENTERING;
        }
    }

    _doEnter() {
        this.current = this._nextInstance;
        const assets = this._loadedAssets;

        this._nextInstance = null;
        this._nextSceneClass = null;
        this._loadedAssets = null;
        this._currentAssetPaths = this._pendingAssetPaths;
        this._pendingAssetPaths = [];

        this.current.manager = this;

        this.current.onEnter(assets);
        this.state = State.RUNNING;
    }
}

function withRoot(root, relPath) {
    if (!root) return relPath;
    return `${root}/${relPath}`.replace(/\/{2,}/g, '/');
}

export function memoryDebugString() {
    const ram = System.getMemoryStats();
    const vramUsed = Screen.getMemoryStats(Screen.VRAM_USED_TOTAL);
    const vramTotal = Screen.getMemoryStats(Screen.VRAM_SIZE);
    const ramMB = (ram.used / (1024 * 1024)).toFixed(2);
    const vramKB = (vramUsed / 1024).toFixed(0);
    const vramTotalKB = (vramTotal / 1024).toFixed(0);
    return `RAM: ${ramMB}MB | VRAM: ${vramKB}/${vramTotalKB}KB`;
}