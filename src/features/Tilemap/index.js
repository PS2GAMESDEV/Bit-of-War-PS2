import NativeTileMap from "TileMap";
import { loadAthenaLevel } from "../../shared/lib/athena_level.js";
import { ASSETS_PATH, GAME_SCALE, SCREEN_WIDTH, SCREEN_HEIGHT } from "../../shared/config/constants.js";

export default class TileMapRenderer {
    constructor(levelSource, assets, options = {}) {
        this._scale = GAME_SCALE ?? 1;

        const texturePath = options.texturePath ?? ASSETS_PATH.TILES + "/texture.json";
        this.spritesheetKey = options.spritesheetKey ?? "images/tiles/texture.png";

        this._tileConfig = std.parseExtJSON(std.loadFile(texturePath));

        this.spritesheet = assets.images[this.spritesheetKey];
        if (!this.spritesheet) {
            throw new Error(`[TileMapRenderer] textura "${this.spritesheetKey}" não encontrada nos assets carregados`);
        }

        this._defaultColor = Color.new(128, 128, 128, 128);
        this._colorCache = new Map();
        this._cullPadding = options.cullPadding ?? 0;

        this.native = null;
        this._buf = null;
        this.level = null;

        this._buildNative(levelSource);
    }

    _buildNative(levelSource) {
        if (this.native) {
            this.native.destroy();
            this.native = null;
            this._buf = null;
        }
        this._colorCache.clear();

        this.level = typeof levelSource === "string" ? loadAthenaLevel(levelSource) : levelSource;

        const { frames, tiles, mapWidth, mapHeight, tileWidth, tileHeight, missing } =
            this._prepareLevelData(this.level, this._tileConfig);

        if (missing.length > 0) {
            console.log(`[TileMapRenderer] ${missing.length} asset(s) sem frame no atlas (primeiros: ${missing.slice(0, 5).join(", ")})`);
        }

        this.native = new NativeTileMap({
            mapWidth,
            mapHeight,
            tileWidth,
            tileHeight,
            scale: this._scale,
            frames,
            tiles,
            cullPadding: this._cullPadding,
        });

        this._buf = this.native.getBuffers();
    }

    rebuild(levelSource) {
        this._buildNative(levelSource !== undefined ? levelSource : this.level);
    }

    _prepareLevelData(level, tileConfig) {
        const levelTiles = level.tiles;
        if (!levelTiles || levelTiles.length === 0) {
            throw new Error("[TileMapRenderer] level.tiles está vazio -- nada para montar o grid");
        }

        const tileWidth = level.tileWidth ?? level.tilewidth ?? 16;
        const tileHeight = level.tileHeight ?? level.tileheight ?? tileWidth;
        const tileCount = levelTiles.length;

        let mapWidth = level.mapWidth;
        let mapHeight = level.mapHeight;

        let cachedCols = null;
        let cachedRows = null;
        if (mapWidth === undefined || mapHeight === undefined) {
            cachedCols = new Int32Array(tileCount);
            cachedRows = new Int32Array(tileCount);

            let maxCol = 0;
            let maxRow = 0;
            for (let i = 0; i < tileCount; i++) {
                const tile = levelTiles[i];
                const col = Math.round(tile.x / tileWidth);
                const row = Math.round(tile.y / tileHeight);
                cachedCols[i] = col;
                cachedRows[i] = row;
                if (col > maxCol) maxCol = col;
                if (row > maxRow) maxRow = row;
            }

            if (mapWidth === undefined) mapWidth = maxCol + 1;
            if (mapHeight === undefined) mapHeight = maxRow + 1;
        }

        if (mapWidth <= 0 || mapHeight <= 0 || tileWidth <= 0 || tileHeight <= 0) {
            throw new Error(
                `[TileMapRenderer] dimensões inválidas derivadas do level: ` +
                `mapWidth=${mapWidth} mapHeight=${mapHeight} tileWidth=${tileWidth} tileHeight=${tileHeight}`
            );
        }

        const frameIndexByName = new Map();
        const missingKeys = new Set();
        const frames = [];
        const missing = [];

        const resolveFrameId = (assetName) => {
            const clean = (assetName || "").trim();
            const key = clean.endsWith(".png") ? clean : clean + ".png";

            if (missingKeys.has(key)) return undefined;

            const cachedId = frameIndexByName.get(key);
            if (cachedId !== undefined) return cachedId;

            const config = tileConfig.frames?.[key];
            if (!config) {
                missingKeys.add(key);
                missing.push(assetName);
                return undefined;
            }

            const id = frames.length;
            frames.push(config);
            frameIndexByName.set(key, id);
            return id;
        };

        const tiles = new Uint16Array(mapWidth * mapHeight).fill(0xFFFF);

        for (let i = 0; i < tileCount; i++) {
            const tile = levelTiles[i];
            const col = cachedCols ? cachedCols[i] : Math.round(tile.x / tileWidth);
            const row = cachedRows ? cachedRows[i] : Math.round(tile.y / tileHeight);
            if (col < 0 || col >= mapWidth || row < 0 || row >= mapHeight) continue;

            const frameId = resolveFrameId(tile.assetName);
            if (frameId === undefined) continue;

            tiles[row * mapWidth + col] = frameId;
        }

        return { frames, tiles, mapWidth, mapHeight, tileWidth, tileHeight, missing };
    }

    _getCachedColor(packedColor) {
        let color = this._colorCache.get(packedColor);
        if (color === undefined) {
            const r = packedColor & 0xFF;
            const g = (packedColor >> 8) & 0xFF;
            const b = (packedColor >> 16) & 0xFF;
            const a = (packedColor >> 24) & 0xFF;
            color = Color.new(r, g, b, a);
            this._colorCache.set(packedColor, color);
        }
        return color;
    }

    render(offsetX = 0, offsetY = 0) {
        const n = this.native.cull(offsetX, offsetY, SCREEN_WIDTH, SCREEN_HEIGHT);
        if (n === 0) return;

        const img = this.spritesheet;
        const { x, y, w, h, u1, v1, u2, v2, color } = this._buf;

        img.color = this._defaultColor;

        let lastU1 = -1, lastV1 = -1, lastU2 = -1, lastV2 = -1;
        let lastW = -1, lastH = -1, lastColor = -1;

        for (let i = 0; i < n; i++) {
            if (u1[i] !== lastU1 || v1[i] !== lastV1) {
                img.startx = u1[i];
                img.starty = v1[i];
                lastU1 = u1[i];
                lastV1 = v1[i];
            }
            if (u2[i] !== lastU2 || v2[i] !== lastV2) {
                img.endx = u2[i];
                img.endy = v2[i];
                lastU2 = u2[i];
                lastV2 = v2[i];
            }
            if (w[i] !== lastW) {
                img.width = w[i];
                lastW = w[i];
            }
            if (h[i] !== lastH) {
                img.height = h[i];
                lastH = h[i];
            }
            if (color[i] !== lastColor) {
                img.color = this._getCachedColor(color[i]);
                lastColor = color[i];
            }

            img.draw(x[i], y[i]);
        }
    }

    setTile(col, row, frameId) {
        this.native.setTile(col, row, frameId);
    }

    setTileByAssetName(col, row, assetName) {
        throw new Error("[TileMapRenderer] setTileByAssetName ainda não implementado -- use setTile(col, row, frameId)");
    }

    setTileColor(col, row, r, g, b, a = 255) {
        const packed = (r & 0xFF) | ((g & 0xFF) << 8) | ((b & 0xFF) << 16) | ((a & 0xFF) << 24);
        this.native.setTileColor(col, row, packed);
    }

    getMapSize() {
        return this.native.getMapSize();
    }

    get stats() {
        return this.native.stats;
    }

    destroy() {
        if (this.native) {
            this.native.destroy();
            this.native = null;
        }
        this._buf = null;
        this.spritesheet = null;
        this._colorCache = null;
    }
}