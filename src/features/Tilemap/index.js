import { loadAthenaLevel } from "../../shared/lib/athena_level.js";
import { ASSETS_PATH, GAME_SCALE } from "../../shared/config/constants.js";

if (globalThis._tileMapInitialized === undefined) {
    if (typeof TileMap !== "undefined" && TileMap.init) {
        TileMap.init();
    }
    globalThis._tileMapInitialized = true;
}

const debugFont = new Font("default");
debugFont.color = Color.new(255, 0, 0, 128);

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

        this.level = typeof levelSource === "string" ? loadAthenaLevel(levelSource) : levelSource;

        this.sprites = this._processMapData(this.level);
        this.instance = this._createInstance();
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
        const sprites = [];
        this._missingAssets = [];

        for (const tile of level.tiles) {
            const config = this._getTileConfig(tile.assetName);

            if (!config) {
                this._missingAssets.push(tile.assetName);
                continue;
            }

            const { frame, spriteSourceSize, rotated, isRotated } = config;
            const trimX = (spriteSourceSize?.x ?? 0) * this.scaleX;
            const trimY = (spriteSourceSize?.y ?? 0) * this.scaleY;

            const isFrameRotated = rotated || isRotated || false;
            const frameW = isFrameRotated ? frame.h : frame.w;
            const frameH = isFrameRotated ? frame.w : frame.h;

            sprites.push({
                x: tile.x * this.scaleX + trimX,
                y: tile.y * this.scaleY + trimY,
                w: frame.w * this.scaleX,
                h: frame.h * this.scaleY,
                u1: frame.x,
                v1: frame.y,
                u2: frame.x + frameW,
                v2: frame.y + frameH,
                r: 128, g: 128, b: 128, a: 128,
            });
        }

        this._totalTiles = level.tiles.length;
        this._generatedSprites = sprites.length;

        return sprites;
    }

    _createDescriptor() {
        const endOffset = Math.max(0, this.sprites.length - 1);

        return new TileMap.Descriptor({
            textures: [this.spritesheet],
            materials: [{
                texture_index: 0,
                blend_mode: Screen.alphaEquation(
                    Screen.SRC_RGB, Screen.DST_RGB,
                    Screen.SRC_ALPHA, Screen.DST_RGB,
                    0
                ),
                end_offset: endOffset,
            }],
        });
    }

    _createInstance() {
        return new TileMap.Instance({
            descriptor: this._createDescriptor(),
            spriteBuffer: TileMap.SpriteBuffer.fromObjects(this.sprites),
        });
    }

    rebuild(levelSource) {
        if (this.instance && this.instance.free) this.instance.free();
        this.instance = null;

        if (levelSource) {
            this.level = typeof levelSource === "string" ? loadAthenaLevel(levelSource) : levelSource;
        }

        this.sprites = this._processMapData(this.level);
        this.instance = this._createInstance();
    }

    render(offsetX = 0, offsetY = 0) {
        TileMap.begin();
        this.instance.render(-offsetX, -offsetY);

        debugFont.print(250, 250, `tiles: ${this._generatedSprites}/${this._totalTiles}`);
        if (this._missingAssets.length > 0) {
            debugFont.print(250, 250, `faltando: ${this._missingAssets[0]}${this._missingAssets.length > 1 ? ` (+${this._missingAssets.length - 1})` : ""}`);
        }
    }

    updateSprite(index, updates) {
        const layout = TileMap.layout;
        const view = new DataView(this.instance.getSpriteBuffer());
        const pos = index * layout.stride;

        if (updates.x !== undefined) view.setFloat32(pos + layout.offsets.x, updates.x, true);
        if (updates.y !== undefined) view.setFloat32(pos + layout.offsets.y, updates.y, true);
        if (updates.r !== undefined) view.setUint32(pos + layout.offsets.r, updates.r >>> 0, true);
        if (updates.g !== undefined) view.setUint32(pos + layout.offsets.g, updates.g >>> 0, true);
        if (updates.b !== undefined) view.setUint32(pos + layout.offsets.b, updates.b >>> 0, true);
        if (updates.a !== undefined) view.setUint32(pos + layout.offsets.a, updates.a >>> 0, true);
    }

    getMapSize() {
        let maxX = 0;
        let maxY = 0;

        for (const sprite of this.sprites) {
            const right = sprite.x + sprite.w;
            const bottom = sprite.y + sprite.h;
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
        if (this.instance && this.instance.free) this.instance.free();
        this.instance = null;
        this.tileConfig = null;
        this.sprites = null;
        this.spritesheet = null;
    }
}