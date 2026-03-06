import { ASSETS_PATH } from "../../shared/lib/constants.js";

function TileMapRenderer(mapData, options) {
    options = options || {};

    this.scaleX = options.scaleX ?? 1;
    this.scaleY = options.scaleY ?? 1;
    this.cameraX = 0;
    this.cameraY = 0;

    const texturePath = options.texturePath ?? ASSETS_PATH.TILES + "/texture.json";
    const spritesheetPath = options.spritesheetPath ?? ASSETS_PATH.TILES + "/texture.png";

    this.tileConfig = JSON.parse(std.loadFile(texturePath));
    this.SPRITE_SHEET = spritesheetPath;

    this.mapData = mapData;
    this.sprites = this._processMapData(mapData);
    this.instance = this._createInstance();
}

TileMapRenderer.prototype._resolveFrameKey = function (tileId) {
    return tileId.endsWith(".png") ? tileId : tileId + ".png";
}

TileMapRenderer.prototype._getTileConfig = function (tileId) {
    const key = this._resolveFrameKey(tileId);
    return this.tileConfig.frames?.[key] ?? null;
}

TileMapRenderer.prototype._processMapData = function (mapData) {
    const sprites = [];

    for (const [tileId, placements] of Object.entries(mapData)) {
        const config = this._getTileConfig(tileId);
        if (!config) {
            console.log(`TileMapRenderer: no texture frame found for "${tileId}"`);
            continue;
        }

        const { frame, spriteSourceSize } = config;

        for (const placement of placements) {
            const trimX = (spriteSourceSize?.x ?? 0) * this.scaleX;
            const trimY = (spriteSourceSize?.y ?? 0) * this.scaleY;

            sprites.push({
                x: placement.x * this.scaleX + trimX,
                y: placement.y * this.scaleY + trimY,
                w: frame.w * this.scaleX,
                h: frame.h * this.scaleY,
                zindex: placement.depth ?? 0,
                u1: frame.x,
                v1: frame.y,
                u2: frame.x + frame.w,
                v2: frame.y + frame.h,
                r: 128, g: 128, b: 128, a: 128,
            });
        }
    }

    sprites.sort((a, b) => a.zindex - b.zindex);

    return sprites;
}

TileMapRenderer.prototype._createDescriptor = function () {
    const endOffset = Math.max(0, this.sprites.length - 1);

    return new TileMap.Descriptor({
        textures: [this.SPRITE_SHEET],
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

TileMapRenderer.prototype._createInstance = function () {
    TileMap.init();

    return new TileMap.Instance({
        descriptor: this._createDescriptor(),
        spriteBuffer: TileMap.SpriteBuffer.fromObjects(this.sprites),
    });
}

TileMapRenderer.prototype.updateCamera = function (cameraX, cameraY) {
    this.cameraX = cameraX;
    this.cameraY = cameraY;
}

TileMapRenderer.prototype.render = function (offsetX, offsetY) {
    offsetX = offsetX || 0;
    offsetY = offsetY || 0;

    TileMap.begin();
    TileMap.setCamera(-this.cameraX, -this.cameraY);
    this.instance.render(offsetX, offsetY);
}

TileMapRenderer.prototype.updateSprite = function (index, updates) {
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

TileMapRenderer.prototype.getMapSize = function () {
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

TileMapRenderer.prototype.setScale = function (scaleX, scaleY) {
    this.scaleX = scaleX;
    this.scaleY = scaleY;
}

TileMapRenderer.prototype.rebuild = function (mapData) {
    this.sprites = this._processMapData(mapData);
    this.instance = this._createInstance();
}

TileMapRenderer.prototype.buildColliders = function (Collision) {
    const colliders = this.mapData.colliders;
    if (!colliders?.length) return [];

    const ids = [];

    for (const c of colliders) {
        if (c.type !== 'ground') continue;

        const id = Collision.register({
            type: 'rect',
            x: c.x * this.scaleX,
            y: c.y * this.scaleY,
            w: c.width * this.scaleX,
            h: c.height * this.scaleY,
            layer: 'ground',
            tags: ['ground', 'solid'],
            static: true,
        });

        ids.push(id);
    }

    return ids;
}

TileMapRenderer.prototype.destroy = function () {
    this.instance = null;
    this.tileConfig = null;
    this.sprites = null;
}

export default TileMapRenderer;