const imageCache = new Map();
const soundCache = new Map();
const fontCache = new Map();

export default class Assets {
    static image(path, options = {}) {
        if (imageCache.has(path)) return imageCache.get(path).asset;
        const img = new Image(path);

        if (Object.keys(options).length > 0) {
            if (options.optimize) {
                img.optimize();
            }

            if (options.animConfig && Object.keys(options.animConfig).length > 0) {
                Object.assign(img, options.animConfig);
            }
        }

        img.lock();
        imageCache.set(path, { asset: img, ref: 1 });
        return img;
    }

    static sound(path) {
        if (soundCache.has(path)) {
            ++soundCache.get(path).ref;
            return soundCache.get(path).asset;
        }

        const ext = path.slice(path.lastIndexOf('.') + 1).toLowerCase();
        let asset;

        if (ext === 'adp') {
            asset = Sound.Sfx(path);
        } else if (ext === 'ogg' || ext === 'wav') {
            asset = Sound.Stream(path);
        } else {
            throw new Error(`[Assets] Unknown sound extension: ${ext} (${path})`);
        }

        soundCache.set(path, { asset, ref: 1 });
        return asset;
    }

    static font(path) {
        if (fontCache.has(path)) {
            ++fontCache.get(path).ref;
            return fontCache.get(path).asset;
        }
        const fnt = new Font(path);
        fontCache.set(path, { asset: fnt, ref: 1 });
        return fnt;
    }

    static free(path) {
        [imageCache, soundCache, fontCache].forEach(cache => {
            const entry = cache.get(path);
            if (entry && --entry.ref <= 0) {

                if (entry.asset.locked && entry.asset.locked()) entry.asset.unlock();

                entry.asset.free();
                cache.delete(path);
            }
        });
    }

    static freePattern(regex) {
        [...imageCache.keys(), ...soundCache.keys(), ...fontCache.keys()]
            .forEach(k => { if (regex.test(k)) Assets.free(k); });
    }

    static stats() {
        return {
            images: imageCache.size,
            sounds: soundCache.size,
            fonts: fontCache.size
        };
    }
}