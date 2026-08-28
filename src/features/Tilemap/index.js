import { loadAthenaLevel } from "../../shared/lib/athena_level.js";
import { ASSETS_PATH, GAME_SCALE, SCREEN_WIDTH, SCREEN_HEIGHT } from "../../shared/config/constants.js";

export default class TileMapRenderer {
    constructor(levelSource, assets, options = {}) {
        this.scaleX = GAME_SCALE ?? 1;
        this.scaleY = GAME_SCALE ?? 1;

        const texturePath = options.texturePath ?? ASSETS_PATH.TILES + "/texture.json";
        this.spritesheetKey = options.spritesheetKey ?? "images/tiles/texture.png";

        this.tileConfig = std.parseExtJSON(std.loadFile(texturePath));

        this.spritesheet = assets.images[this.spritesheetKey];

        if (!this.spritesheet) {
            throw new Error(`[TileMapRenderer] textura "${this.spritesheetKey}" não encontrada nos assets carregados`);
        }

        this._defaultColor = Color.new(128, 128, 128, 128);

        this.cullingEnabled = options.enableCulling ?? true;
        this.cullPadding = options.cullPadding ?? 0;

        this.level = typeof levelSource === "string" ? loadAthenaLevel(levelSource) : levelSource;

        this._processMapData(this.level);
    }

    _resolveFrameKey(assetName) {
        const cleanName = (assetName || "").trim();
        return cleanName.endsWith(".png") ? cleanName : cleanName + ".png";
    }

    _getTileConfig(assetName) {
        const key = this._resolveFrameKey(assetName);
        return this.tileConfig.frames?.[key] ?? null;
    }

    _processMapData(level) {
        const tiles = level.tiles;
        const total = tiles.length;

        const x = new Float32Array(total);
        const y = new Float32Array(total);
        const w = new Float32Array(total);
        const h = new Float32Array(total);

        const u1 = new Uint16Array(total);
        const v1 = new Uint16Array(total);
        const u2 = new Uint16Array(total);
        const v2 = new Uint16Array(total);

        let count = 0;
        const missing = [];

        for (let i = 0; i < total; i++) {
            const tile = tiles[i];
            const config = this._getTileConfig(tile.assetName);

            if (!config) {
                missing.push(tile.assetName);
                continue;
            }

            const { frame, spriteSourceSize, rotated, isRotated } = config;
            const trimX = (spriteSourceSize?.x ?? 0) * this.scaleX;
            const trimY = (spriteSourceSize?.y ?? 0) * this.scaleY;

            const isFrameRotated = rotated || isRotated || false;
            const frameW = isFrameRotated ? frame.h : frame.w;
            const frameH = isFrameRotated ? frame.w : frame.h;

            x[count] = tile.x * this.scaleX + trimX;
            y[count] = tile.y * this.scaleY + trimY;
            w[count] = frame.w * this.scaleX;
            h[count] = frame.h * this.scaleY;
            u1[count] = frame.x;
            v1[count] = frame.y;
            u2[count] = frame.x + frameW;
            v2[count] = frame.y + frameH;

            count++;
        }

        this._missingAssets = missing;
        this._totalTiles = total;
        this._generatedSprites = count;

        this.x = x.subarray(0, count);
        this.y = y.subarray(0, count);
        this.w = w.subarray(0, count);
        this.h = h.subarray(0, count);
        this.u1 = u1.subarray(0, count);
        this.v1 = v1.subarray(0, count);
        this.u2 = u2.subarray(0, count);
        this.v2 = v2.subarray(0, count);
        this.count = count;

        this.colorR = null;
        this.colorG = null;
        this.colorB = null;
        this.colorA = null;
        this._hasColorOverrides = false;
    }

    _ensureColorOverrides() {
        if (this._hasColorOverrides) return;
        const n = this.count;
        this.colorR = new Uint8Array(n).fill(128);
        this.colorG = new Uint8Array(n).fill(128);
        this.colorB = new Uint8Array(n).fill(128);
        this.colorA = new Uint8Array(n).fill(128);
        this._hasColorOverrides = true;
    }

    rebuild(levelSource) {
        if (levelSource) {
            this.level = typeof levelSource === "string" ? loadAthenaLevel(levelSource) : levelSource;
        }
        this._processMapData(this.level);
    }

    render(offsetX = 0, offsetY = 0) {
        const n = this.count;
        if (n === 0) return;

        const img = this.spritesheet;
        const xs = this.x, ys = this.y, ws = this.w, hs = this.h;
        const u1 = this.u1, v1 = this.v1, u2 = this.u2, v2 = this.v2;

        const cullLeft = offsetX - this.cullPadding;
        const cullTop = offsetY - this.cullPadding;
        const cullRight = offsetX + SCREEN_WIDTH + this.cullPadding;
        const cullBottom = offsetY + SCREEN_HEIGHT + this.cullPadding;
        const culling = this.cullingEnabled;

        const overrides = this._hasColorOverrides;
        if (!overrides) {
            img.color = this._defaultColor;
        }
        const cr = this.colorR, cg = this.colorG, cb = this.colorB, ca = this.colorA;

        let lastU1 = -1, lastV1 = -1, lastU2 = -1, lastV2 = -1;
        let lastW = -1, lastH = -1;
        let lastR = -1, lastG = -1, lastB = -1, lastA = -1;

        for (let i = 0; i < n; i++) {
            const sx = xs[i], sy = ys[i], sw = ws[i], sh = hs[i];

            if (culling && (sx + sw < cullLeft || sx > cullRight || sy + sh < cullTop || sy > cullBottom)) {
                continue;
            }

            const su1 = u1[i], sv1 = v1[i], su2 = u2[i], sv2 = v2[i];
            if (su1 !== lastU1 || sv1 !== lastV1) {
                img.startx = su1;
                img.starty = sv1;
                lastU1 = su1;
                lastV1 = sv1;
            }
            if (su2 !== lastU2 || sv2 !== lastV2) {
                img.endx = su2;
                img.endy = sv2;
                lastU2 = su2;
                lastV2 = sv2;
            }
            if (sw !== lastW) {
                img.width = sw;
                lastW = sw;
            }
            if (sh !== lastH) {
                img.height = sh;
                lastH = sh;
            }

            if (overrides) {
                const r = cr[i], g = cg[i], b = cb[i], a = ca[i];
                if (r !== lastR || g !== lastG || b !== lastB || a !== lastA) {
                    img.color = Color.new(r, g, b, a);
                    lastR = r;
                    lastG = g;
                    lastB = b;
                    lastA = a;
                }
            }

            img.draw(sx - offsetX, sy - offsetY);
        }
    }

    updateSprite(index, updates) {
        if (index < 0 || index >= this.count) return;

        if (updates.x !== undefined) this.x[index] = updates.x;
        if (updates.y !== undefined) this.y[index] = updates.y;

        const hasColorUpdate =
            updates.r !== undefined || updates.g !== undefined ||
            updates.b !== undefined || updates.a !== undefined;

        if (hasColorUpdate) {
            this._ensureColorOverrides();
            if (updates.r !== undefined) this.colorR[index] = updates.r;
            if (updates.g !== undefined) this.colorG[index] = updates.g;
            if (updates.b !== undefined) this.colorB[index] = updates.b;
            if (updates.a !== undefined) this.colorA[index] = updates.a;
        }
    }

    getMapSize() {
        let maxX = 0;
        let maxY = 0;

        const xs = this.x, ys = this.y, ws = this.w, hs = this.h;
        for (let i = 0; i < this.count; i++) {
            const right = xs[i] + ws[i];
            const bottom = ys[i] + hs[i];
            if (right > maxX) maxX = right;
            if (bottom > maxY) maxY = bottom;
        }
        return { width: maxX, height: maxY };
    }

    setScale(scaleX, scaleY) {
        this.scaleX = scaleX;
        this.scaleY = scaleY;
        this.rebuild();
    }

    destroy() {
        this.tileConfig = null;
        this.spritesheet = null;

        this.x = this.y = this.w = this.h = null;
        this.u1 = this.v1 = this.u2 = this.v2 = null;
        this.colorR = this.colorG = this.colorB = this.colorA = null;
        this.count = 0;
    }
}