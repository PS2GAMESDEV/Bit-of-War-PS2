import { GAME_SCALE } from "../../shared/config/constants.js";
import { loadAthenaLevel } from "../../shared/lib/athena_level.js";

const DEFAULT_COLOR = 0x80808080;

export default class TileMapRenderer {
    constructor(levelSource, assets, options = {}) {
        this.options = options;
        this.assets = assets;
        this.scaleX = options.scaleX ?? options.scale ?? GAME_SCALE;
        this.scaleY = options.scaleY ?? options.scale ?? GAME_SCALE;

        const texturePath = options.texturePath;
        this.spritesheetKey = options.spritesheetKey;

        if (options.tileConfig) {
            this.tileConfig = options.tileConfig;
        } else if (typeof std !== "undefined" && std.loadFile) {
            try {
                const content = std.loadFile(texturePath);
                this.tileConfig = std.parseExtJSON ? std.parseExtJSON(content) : JSON.parse(content);
            } catch (e) {
                this.tileConfig = { frames: {} };
            }
        } else {
            this.tileConfig = { frames: {} };
        }

        if (!this.tileConfig) this.tileConfig = { frames: {} };
        if (!this.tileConfig.frames) this.tileConfig.frames = {};

        this._buildFramesMap();

        this.spritesheet = (assets && assets.images && assets.images[this.spritesheetKey]) ?
            assets.images[this.spritesheetKey] :
            (assets && assets[this.spritesheetKey] ? assets[this.spritesheetKey] : null);

        if (!this.spritesheet && options.texture) {
            this.spritesheet = options.texture;
        }

        if (!this.spritesheet) {
            throw new Error(`[TileMapRenderer] textura "${this.spritesheetKey}" não encontrada nos assets carregados`);
        }

        this._defaultColor = options.color ?? DEFAULT_COLOR;
        this._frameConfigCache = new Map();

        this.cullingEnabled = options.enableCulling ?? true;
        this.cullPadding = options.cullPadding ?? 0;

        this.level = typeof levelSource === "string" ? loadAthenaLevel(levelSource) : levelSource;

        this.nativeTileMap = null;
        this._processMapData(this.level);
    }

    _buildFramesMap() {
        this._framesMap = new Map();
        if (Array.isArray(this.tileConfig.frames)) {
            for (const f of this.tileConfig.frames) {
                if (f.filename) {
                    this._framesMap.set(f.filename, f);
                    const bare = f.filename.endsWith(".png") ? f.filename.slice(0, -4) : f.filename;
                    this._framesMap.set(bare, f);
                }
            }
        } else if (this.tileConfig.frames && typeof this.tileConfig.frames === "object") {
            for (const [key, f] of Object.entries(this.tileConfig.frames)) {
                this._framesMap.set(key, f);
                const bare = key.endsWith(".png") ? key.slice(0, -4) : key;
                this._framesMap.set(bare, f);
            }
        }
    }

    _resolveFrameKey(assetName) {
        if (!assetName) return "";
        const cleanName = String(assetName).trim();
        return cleanName.endsWith(".png") ? cleanName : cleanName + ".png";
    }

    _getTileConfig(assetName) {
        if (!assetName) return null;
        let config = this._frameConfigCache.get(assetName);
        if (config !== undefined) return config;

        const key = this._resolveFrameKey(assetName);
        const bareKey = key.endsWith(".png") ? key.slice(0, -4) : key;

        config = this._framesMap.get(key) ||
            this._framesMap.get(bareKey) ||
            this._framesMap.get(assetName) ||
            (this.tileConfig.frames ? this.tileConfig.frames[key] || this.tileConfig.frames[bareKey] || this.tileConfig.frames[assetName] : null) ||
            null;

        this._frameConfigCache.set(assetName, config);
        return config;
    }

    _processMapData(level) {
        if (this.nativeTileMap) {
            this.nativeTileMap.destroy();
            this.nativeTileMap = null;
        }

        const tiles = (level && level.tiles) ? level.tiles : [];
        const total = tiles.length;

        let tileWidth = this.options.tileWidth ?? this.options.tileSize ?? 0;
        let tileHeight = this.options.tileHeight ?? this.options.tileSize ?? 0;

        if (tileWidth <= 0 || tileHeight <= 0) {
            for (const f of this._framesMap.values()) {
                const w = f.sourceSize?.w ?? f.frame?.w ?? f.w;
                const h = f.sourceSize?.h ?? f.frame?.h ?? f.h;
                if (w > 0 && h > 0) {
                    if (tileWidth <= 0) tileWidth = w;
                    if (tileHeight <= 0) tileHeight = h;
                    break;
                }
            }
        }

        if (tileWidth <= 0) tileWidth = 32;
        if (tileHeight <= 0) tileHeight = tileWidth;

        let maxTileX = 0;
        let maxTileY = 0;
        let isPixelCoords = false;

        for (let i = 0; i < total; i++) {
            const t = tiles[i];
            if (t.x > maxTileX) maxTileX = t.x;
            if (t.y > maxTileY) maxTileY = t.y;
            if (tileWidth > 1 && (t.x % tileWidth === 0 || t.y % tileHeight === 0) && (t.x >= tileWidth || t.y >= tileHeight)) {
                isPixelCoords = true;
            }
        }

        const maxCol = isPixelCoords ? Math.floor(maxTileX / tileWidth) : Math.floor(maxTileX);
        const maxRow = isPixelCoords ? Math.floor(maxTileY / tileHeight) : Math.floor(maxTileY);

        let mapWidth = this.options.mapWidth ?? this.options.width ?? (level ? level.width : 0) ?? 0;
        let mapHeight = this.options.mapHeight ?? this.options.height ?? (level ? level.height : 0) ?? 0;

        if (mapWidth > (maxCol + 1) * 2 && mapWidth % tileWidth === 0 && isPixelCoords) {
            mapWidth = Math.floor(mapWidth / tileWidth);
        }
        if (mapHeight > (maxRow + 1) * 2 && mapHeight % tileHeight === 0 && isPixelCoords) {
            mapHeight = Math.floor(mapHeight / tileHeight);
        }

        mapWidth = Math.max(mapWidth, maxCol + 1, 1);
        mapHeight = Math.max(mapHeight, maxRow + 1, 1);

        const frameByConfig = new Map();
        const framesList = [];

        const getFrameId = (config) => {
            let id = frameByConfig.get(config);
            if (id !== undefined) return id;

            id = framesList.length;
            framesList.push(config);
            frameByConfig.set(config, id);
            return id;
        };

        const totalCells = mapWidth * mapHeight;
        const initialTiles = new Uint16Array(totalCells);
        initialTiles.fill(0xFFFF);

        const missing = [];
        let count = 0;

        for (let i = 0; i < total; i++) {
            const tile = tiles[i];
            const config = this._getTileConfig(tile.assetName);

            if (!config) {
                missing.push(tile.assetName);
                continue;
            }

            const frameId = getFrameId(config);
            const col = isPixelCoords ? Math.round(tile.x / tileWidth) : Math.round(tile.x);
            const row = isPixelCoords ? Math.round(tile.y / tileHeight) : Math.round(tile.y);

            if (col >= 0 && col < mapWidth && row >= 0 && row < mapHeight) {
                initialTiles[row * mapWidth + col] = frameId;
                count++;
            }
        }

        this._missingAssets = missing;
        this._totalTiles = total;
        this._generatedSprites = count;
        this.count = count;
        this._mapWidth = mapWidth;
        this._mapHeight = mapHeight;
        this._tileWidth = tileWidth;
        this._tileHeight = tileHeight;

        console.log("spritesheet typeof:", typeof this.spritesheet,
            "é instância de Image?:", this.spritesheet instanceof Image,
            "keys:", Object.keys(this.spritesheet || {}));

        console.log("amostra de frames:", framesList.slice(0, 3).map(f => JSON.stringify(f)));

        this.nativeTileMap = new TileMap({
            mapWidth: mapWidth,
            mapHeight: mapHeight,
            tileWidth: tileWidth,
            tileHeight: tileHeight,
            scaleX: this.scaleX,
            scaleY: this.scaleY,
            image: this.spritesheet,
            frames: [],
            tiles: initialTiles,
            cullPadding: this.cullPadding,
            color: this._defaultColor
        });
    }

    rebuild(levelSource) {
        if (levelSource) {
            this.level = typeof levelSource === "string" ? loadAthenaLevel(levelSource) : levelSource;
        }
        this._frameConfigCache.clear();
        this._processMapData(this.level);
    }

    render(offsetX = 0, offsetY = 0, zIndex = 0) {
        if (!this.nativeTileMap) return;
        this.nativeTileMap.render(offsetX, offsetY, zIndex);
    }

    setTile(colOrIndex, rowOrFrameId, frameId) {
        if (!this.nativeTileMap) return;
        if (frameId !== undefined) {
            return this.nativeTileMap.setTile(colOrIndex, rowOrFrameId, frameId);
        } else {
            return this.nativeTileMap.setTile(colOrIndex, rowOrFrameId);
        }
    }

    getTile(colOrIndex, row) {
        if (!this.nativeTileMap) return 0xFFFF;
        if (row !== undefined) {
            return this.nativeTileMap.getTile(colOrIndex, row);
        } else {
            return this.nativeTileMap.getTile(colOrIndex);
        }
    }

    setTiles(dstCol, dstRow, width, height, data) {
        if (!this.nativeTileMap) return;
        return this.nativeTileMap.setTiles(dstCol, dstRow, width, height, data);
    }

    setColor(r, g, b, a) {
        if (!this.nativeTileMap) return;
        if (g !== undefined && b !== undefined) {
            this.nativeTileMap.setColor(r, g, b, a);
        } else {
            this.nativeTileMap.setColor(r);
        }
    }

    setTileColor(col, row, color) {
        if (!this.nativeTileMap) return;
        return this.nativeTileMap.setTileColor(col, row, color);
    }

    getMapSize() {
        if (this.nativeTileMap) {
            const native = this.nativeTileMap.getMapSize();
            return {
                ...native,
                width: native.pixelWidth,
                height: native.pixelHeight,
                mapWidth: native.width,
                mapHeight: native.height,
            };
        }
        return {
            width: this._mapWidth * this._tileWidth * this.scaleX,
            height: this._mapHeight * this._tileHeight * this.scaleY,
            mapWidth: this._mapWidth,
            mapHeight: this._mapHeight,
            tileWidth: this._tileWidth,
            tileHeight: this._tileHeight,
            pixelWidth: this._mapWidth * this._tileWidth * this.scaleX,
            pixelHeight: this._mapHeight * this._tileHeight * this.scaleY
        };
    }

    setScale(scaleX, scaleY) {
        this.scaleX = scaleX;
        this.scaleY = scaleY !== undefined ? scaleY : scaleX;
        this.rebuild();
    }

    get width() {
        return this.nativeTileMap ? this.nativeTileMap.width : this._mapWidth;
    }

    get height() {
        return this.nativeTileMap ? this.nativeTileMap.height : this._mapHeight;
    }

    get tileWidth() {
        return this.nativeTileMap ? this.nativeTileMap.tileWidth : this._tileWidth;
    }

    get tileHeight() {
        return this.nativeTileMap ? this.nativeTileMap.tileHeight : this._tileHeight;
    }

    get pixelWidth() {
        return this.nativeTileMap ? this.nativeTileMap.pixelWidth : (this._mapWidth * this._tileWidth * this.scaleX);
    }

    get pixelHeight() {
        return this.nativeTileMap ? this.nativeTileMap.pixelHeight : (this._mapHeight * this._tileHeight * this.scaleY);
    }

    get stats() {
        return this.nativeTileMap ? this.nativeTileMap.stats : null;
    }

    get native() {
        return this.nativeTileMap;
    }

    get tileMap() {
        return this.nativeTileMap;
    }

    destroy() {
        if (this.nativeTileMap) {
            this.nativeTileMap.destroy();
            this.nativeTileMap = null;
        }
        this.tileConfig = null;
        this.spritesheet = null;
        this._framesMap = null;
        this._frameConfigCache = null;
        this.count = 0;
    }
}

export { TileMapRenderer };