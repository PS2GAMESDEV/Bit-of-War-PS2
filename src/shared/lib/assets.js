const imageCache = new Map();
const soundCache = new Map();
const fontCache = new Map();

export default class Assets {
    static image(path, options = {}) {
        const cached = imageCache.get(path);
        if (cached) {
            cached.ref++;
            return cached.asset;
        }

        const img = options.asyncList
            ? new Image(path, options.asyncList)
            : new Image(path);

        if (options.asyncList) {
            imageCache.set(path, {
                asset: img,
                ref: 1,
                pending: {
                    scale: options.scale || null,
                    optimize: !!options.optimize,
                    lock: !!options.lock,
                },
            });
            if (options.animConfig) Object.assign(img, options.animConfig);
            return img;
        }

        if (options.scale) {
            img.width *= options.scale;
            img.height *= options.scale;
        }
        if (options.optimize) img.optimize();
        if (options.animConfig) Object.assign(img, options.animConfig);
        if (options.lock) img.lock();

        imageCache.set(path, { asset: img, ref: 1 });
        return img;
    }

    static applyPostLoad(path) {
        const entry = imageCache.get(path);
        if (!entry || !entry.pending) return;

        const { scale, optimize, lock } = entry.pending;

        if (optimize) entry.asset.optimize();
        if (scale) {
            entry.asset.width *= scale;
            entry.asset.height *= scale;
        }
        if (lock) entry.asset.lock();

        entry.pending = null;
    }

    static sound(path) {
        const cached = soundCache.get(path);
        if (cached) {
            cached.ref++;
            return cached.asset;
        }

        const ext = path.slice(path.lastIndexOf('.') + 1).toLowerCase();
        let asset;
        if (ext === 'adp') asset = Sound.Sfx(path);
        else if (ext === 'ogg' || ext === 'wav') asset = Sound.Stream(path);
        else throw new Error(`[Assets] Unknown extension: ${ext}`);

        soundCache.set(path, { asset, ref: 1 });
        return asset;
    }

    static font(path) {
        const cached = fontCache.get(path);
        if (cached) {
            cached.ref++;
            return cached.asset;
        }
        const fnt = new Font(path);
        fontCache.set(path, { asset: fnt, ref: 1 });
        return fnt;
    }

    static free(target) {
        if (!target) return;

        const caches = [imageCache, soundCache, fontCache];
        for (let i = 0; i < caches.length; i++) {
            const cache = caches[i];
            if (typeof target === 'string') {
                const entry = cache.get(target);
                if (entry) {
                    if (--entry.ref <= 0) {
                        if (entry.asset.locked && entry.asset.locked()) entry.asset.unlock();
                        if (entry.asset.free) entry.asset.free();
                        cache.delete(target);
                    }
                    return;
                }
            } else {
                let foundPath = null;
                for (const [path, entry] of cache.entries()) {
                    if (entry.asset === target) {
                        foundPath = path;
                        break;
                    }
                }

                if (foundPath) {
                    const entry = cache.get(foundPath);
                    if (--entry.ref <= 0) {
                        if (entry.asset.locked && entry.asset.locked()) entry.asset.unlock();
                        if (entry.asset.free) entry.asset.free();
                        cache.delete(foundPath);
                    }
                    return;
                }
            }
        }
    }

    static freePattern(regex) {
        const caches = [imageCache, soundCache, fontCache];
        caches.forEach(cache => {
            const toDelete = [];
            for (const [path] of cache.entries()) {
                if (regex.test(path)) toDelete.push(path);
            }
            toDelete.forEach(path => Assets.free(path));
        });
    }

    static countMatching(regex) {
        const caches = [imageCache, soundCache, fontCache];
        let count = 0;
        caches.forEach(cache => {
            for (const [path] of cache.entries()) {
                if (regex.test(path)) count++;
            }
        });
        return count;
    }
}