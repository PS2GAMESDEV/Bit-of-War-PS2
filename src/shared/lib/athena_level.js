const EXPECTED_MAGIC = "ATHL";
const EXPECTED_VERSION = 1;
const EXPECTED_ENDIAN_MARKER = 0x01020304;
const MIN_HEADER_SIZE = 128;

const MAX_FILE_SIZE = 32 * 1024 * 1024;

const SECTION_NAMES = ["asset", "string", "tile", "entity", "collider", "spawn", "layer"];

const SECTION_EXACT_RECORD_SIZE = {
    tile: 16,
    entity: 20,
    collider: 20,
    spawn: 4,
};
const SECTION_MIN_RECORD_SIZE = {
    asset: 5,
};

const COLLIDER_TYPES = ["ground", "chest", "ladder", "door"];

export class AthenaLevelError extends Error {
    constructor(message) {
        super(message);
        this.name = "AthenaLevelError";
    }
}

function fail(path, message) {
    throw new AthenaLevelError(`AthenaLevel: ${message} ("${path}")`);
}

function readFileBuffer(path) {
    const candidates = [path];
    if (path.startsWith("host:")) {
        candidates.push(path.substring(5));
    } else if (!path.includes(":")) {
        candidates.push("host:" + path);
        candidates.push("./" + path);
    }

    let file = null;
    let resolvedPath = path;

    for (const candidate of candidates) {
        file = std.open(candidate, "rb");
        if (file) {
            resolvedPath = candidate;
            break;
        }
    }

    if (!file) {
        fail(path, `não foi possível abrir o arquivo (caminhos testados: ${candidates.join(", ")})`);
    }

    try {
        file.seek(0, std.SEEK_END);
        const size = file.tell();
        file.seek(0, std.SEEK_SET);

        if (size <= 0) {
            fail(resolvedPath, `tamanho de arquivo inválido (${size} bytes)`);
        }
        if (size > MAX_FILE_SIZE) {
            fail(resolvedPath, `arquivo maior que o limite de sanidade (${size} > ${MAX_FILE_SIZE} bytes)`);
        }

        const buffer = new ArrayBuffer(size);
        const bytesRead = file.read(buffer, 0, size);

        if (bytesRead !== size) {
            fail(resolvedPath, `falha de leitura (lidos ${bytesRead} de ${size} bytes)`);
        }

        return buffer;
    } finally {
        file.close();
    }
}

function decodeUtf8Manual(bytes) {
    let out = "";
    let i = 0;

    while (i < bytes.length) {
        const b0 = bytes[i];

        if (b0 < 0x80) {
            out += String.fromCharCode(b0);
            i += 1;
            continue;
        }

        let extra, codePoint, min;
        if ((b0 & 0xe0) === 0xc0) { extra = 1; codePoint = b0 & 0x1f; min = 0x80; }
        else if ((b0 & 0xf0) === 0xe0) { extra = 2; codePoint = b0 & 0x0f; min = 0x800; }
        else if ((b0 & 0xf8) === 0xf0) { extra = 3; codePoint = b0 & 0x07; min = 0x10000; }
        else return null;

        if (i + extra >= bytes.length) return null;

        for (let k = 1; k <= extra; k++) {
            const b = bytes[i + k];
            if ((b & 0xc0) !== 0x80) return null;
            codePoint = (codePoint << 6) | (b & 0x3f);
        }

        if (codePoint < min || codePoint > 0x10ffff || (codePoint >= 0xd800 && codePoint <= 0xdfff)) {
            return null;
        }

        out += String.fromCodePoint(codePoint);
        i += extra + 1;
    }

    return out;
}

function decodeUtf8(bytes, path) {
    if (typeof TextDecoder !== "undefined") {
        try {
            return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
        } catch (e) {
            fail(path, "String Pool contém UTF-8 inválido");
        }
    }

    const decoded = decodeUtf8Manual(bytes);
    if (decoded === null) fail(path, "String Pool contém UTF-8 inválido");
    return decoded;
}

function parseHeader(view, actualFileSize, path) {
    if (view.byteLength < MIN_HEADER_SIZE) {
        fail(path, `arquivo menor que um header (${view.byteLength} bytes)`);
    }

    const magicBytes = new Uint8Array(view.buffer, 0, 4);
    let magic = "";
    for (let i = 0; i < 4; i++) magic += String.fromCharCode(magicBytes[i]);
    if (magic !== EXPECTED_MAGIC) {
        fail(path, `magic inválido (esperado "${EXPECTED_MAGIC}", veio "${magic}")`);
    }

    const version = view.getUint16(4, true);
    if (version !== EXPECTED_VERSION) {
        fail(path, `versão não suportada ${version} (esperado ${EXPECTED_VERSION})`);
    }

    const endianMarker = view.getUint32(8, true);
    if (endianMarker !== EXPECTED_ENDIAN_MARKER) {
        fail(path, `endian marker inválido (0x${endianMarker.toString(16)})`);
    }

    const headerSize = view.getUint32(12, true);
    if (headerSize < MIN_HEADER_SIZE || headerSize > actualFileSize || headerSize % 4 !== 0) {
        fail(path, `headerSize inválido (${headerSize})`);
    }

    const declaredFileSize = view.getUint32(16, true);
    if (declaredFileSize !== actualFileSize) {
        fail(path, `fileSize não bate (header diz ${declaredFileSize}, arquivo tem ${actualFileSize} bytes)`);
    }

    const counts = {
        tile: view.getUint32(20, true),
        entity: view.getUint32(24, true),
        collider: view.getUint32(28, true),
        spawn: view.getUint32(32, true),
        layer: view.getUint32(36, true),
        asset: view.getUint32(40, true),
        string: view.getUint32(44, true),
    };

    const backgroundColor = view.getUint32(48, true);

    const sections = {};
    for (let i = 0; i < SECTION_NAMES.length; i++) {
        const name = SECTION_NAMES[i];
        const base = 56 + i * 8;
        sections[name] = {
            offset: view.getUint32(base, true),
            size: view.getUint32(base + 4, true),
        };
    }

    return { headerSize, fileSize: declaredFileSize, counts, backgroundColor, sections };
}

function validateSections(sections, counts, fileSize, path) {
    const entries = Object.entries(sections);

    for (const [name, { offset, size }] of entries) {
        if (offset % 4 !== 0) {
            fail(path, `seção "${name}" com offset desalinhado (${offset}, não é múltiplo de 4)`);
        }
        if (offset > fileSize || size > fileSize || offset + size > fileSize) {
            fail(path, `seção "${name}" (offset ${offset}, size ${size}) ultrapassa o arquivo`);
        }

        if (name !== "string" && counts[name] === 0 && size !== 0) {
            fail(path, `seção "${name}" tem count 0 mas size ${size} (esperado 0, per spec)`);
        }
    }

    const nonEmpty = entries.filter(([, s]) => s.size > 0).sort((a, b) => a[1].offset - b[1].offset);
    for (let i = 1; i < nonEmpty.length; i++) {
        const [prevName, prev] = nonEmpty[i - 1];
        const [name, cur] = nonEmpty[i];
        if (cur.offset < prev.offset + prev.size) {
            fail(path, `seção "${name}" sobrepõe seção "${prevName}"`);
        }
    }
}

function sectionStride(name, section, count, path) {
    if (count === 0) return 0;

    if (section.size % count !== 0) {
        fail(path, `seção "${name}" com size ${section.size} não divisível pelo count ${count}`);
    }

    const stride = section.size / count;
    const exact = SECTION_EXACT_RECORD_SIZE[name];
    const minimum = SECTION_MIN_RECORD_SIZE[name] ?? exact;

    if (stride < minimum) {
        fail(path, `seção "${name}" com registro de ${stride} bytes, menor que o mínimo exigido (${minimum})`);
    }

    if (exact !== undefined && stride !== exact) {
        console.log(
            `AthenaLevel: "${path}" - seção "${name}" usa registros de ${stride} bytes ` +
            `(esperado ${exact}); os bytes extras serão ignorados como reserva.`
        );
    }

    return stride;
}

function parseStringPool(view, section, path) {
    const strings = new Map();
    let pos = section.offset;
    const end = section.offset + section.size;

    while (pos < end) {
        if (pos + 2 > end) fail(path, "entrada truncada no String Pool");

        const relOffset = pos - section.offset;
        const byteLength = view.getUint16(pos, true);
        pos += 2;

        if (pos + byteLength > end) fail(path, "entrada do String Pool ultrapassa sua seção");

        const bytes = new Uint8Array(view.buffer, pos, byteLength);
        strings.set(relOffset, decodeUtf8(bytes, path));
        pos += byteLength;
    }

    return strings;
}

function parseAssets(view, section, count, stride, strings, path) {
    const assets = [];

    for (let i = 0; i < count; i++) {
        const base = section.offset + i * stride;
        const stringOffset = view.getUint32(base, true);
        const cls = view.getUint8(base + 4);

        const name = strings.get(stringOffset);
        if (name === undefined) fail(path, `asset ${i} referencia offset inválido no String Pool`);
        if (cls !== 0 && cls !== 1) fail(path, `asset ${i} ("${name}") tem class desconhecida ${cls}`);

        assets.push({ name, isTile: cls === 0, isEntity: cls === 1 });
    }

    return assets;
}

function resolveAsset(assets, index, sectionName, recordIndex, path) {
    const asset = assets[index];
    if (!asset) fail(path, `${sectionName} ${recordIndex} referencia assetIndex inválido ${index}`);
    return asset;
}

function parseTiles(view, section, count, stride, assets, path) {
    const tiles = [];

    for (let i = 0; i < count; i++) {
        const base = section.offset + i * stride;
        const assetIndex = view.getUint32(base, true);
        const x = view.getInt32(base + 4, true);
        const y = view.getInt32(base + 8, true);
        const flags = view.getUint32(base + 12, true);

        const asset = resolveAsset(assets, assetIndex, "tile", i, path);
        if (!asset.isTile) {
            fail(path, `tile ${i} aponta para "${asset.name}", que não é classificado como Tile`);
        }

        tiles.push({ assetName: asset.name, x, y, flags });
    }

    return tiles;
}

function parseEntities(view, section, count, stride, assets, path) {
    const entities = [];

    for (let i = 0; i < count; i++) {
        const base = section.offset + i * stride;
        const assetIndex = view.getUint32(base, true);
        const x = view.getInt32(base + 4, true);
        const y = view.getInt32(base + 8, true);
        const flags = view.getUint32(base + 12, true);
        const creationCodeByteLength = view.getUint32(base + 16, true);

        const asset = resolveAsset(assets, assetIndex, "entity", i, path);
        if (!asset.isEntity) {
            fail(path, `entity ${i} aponta para "${asset.name}", que não é classificado como Entity`);
        }

        entities.push({ assetName: asset.name, x, y, flags, creationCodeByteLength });
    }

    return entities;
}

function parseColliders(view, section, count, stride, path) {
    const colliders = [];

    for (let i = 0; i < count; i++) {
        const base = section.offset + i * stride;
        const x = view.getInt32(base, true);
        const y = view.getInt32(base + 4, true);
        const width = view.getInt32(base + 8, true);
        const height = view.getInt32(base + 12, true);
        const typeId = view.getUint32(base + 16, true);

        const type = COLLIDER_TYPES[typeId];
        if (!type) fail(path, `collider ${i} tem typeId desconhecido ${typeId}`);

        colliders.push({ x, y, width, height, type });
    }

    return colliders;
}

function parseSpawns(view, section, count, stride, entityCount, path) {
    const spawns = [];

    for (let i = 0; i < count; i++) {
        const base = section.offset + i * stride;
        const entityIndex = view.getUint32(base, true);

        if (entityIndex >= entityCount) {
            fail(path, `spawn ${i} referencia entityIndex inválido ${entityIndex}`);
        }

        spawns.push({ entityIndex });
    }

    return spawns;
}

export function loadAthenaLevel(path) {
    const buffer = readFileBuffer(path);
    const view = new DataView(buffer);

    const header = parseHeader(view, buffer.byteLength, path);
    validateSections(header.sections, header.counts, header.fileSize, path);

    if (header.counts.layer !== 0 || header.sections.layer.size !== 0) {
        console.log(`AthenaLevel: "${path}" contém dados de Layer, que loaders V1 ignoram.`);
    }

    const assetStride = sectionStride("asset", header.sections.asset, header.counts.asset, path);
    const strings = parseStringPool(view, header.sections.string, path);
    const assets = parseAssets(view, header.sections.asset, header.counts.asset, assetStride, strings, path);

    const level = {
        backgroundColor: `#${header.backgroundColor.toString(16).padStart(6, "0").toUpperCase()}`,
        assets
    };

    let tilesCache = null;
    let entitiesCache = null;
    let collidersCache = null;
    let spawnsCache = null;

    const getEntities = () => {
        if (!entitiesCache) {
            const stride = sectionStride("entity", header.sections.entity, header.counts.entity, path);
            entitiesCache = parseEntities(view, header.sections.entity, header.counts.entity, stride, assets, path);
        }
        return entitiesCache;
    };

    Object.defineProperty(level, "tiles", {
        enumerable: true,
        get() {
            if (!tilesCache) {
                const stride = sectionStride("tile", header.sections.tile, header.counts.tile, path);
                tilesCache = parseTiles(view, header.sections.tile, header.counts.tile, stride, assets, path);
            }
            return tilesCache;
        },
    });

    Object.defineProperty(level, "entities", {
        enumerable: true,
        get: getEntities,
    });

    Object.defineProperty(level, "colliders", {
        enumerable: true,
        get() {
            if (!collidersCache) {
                const stride = sectionStride("collider", header.sections.collider, header.counts.collider, path);
                collidersCache = parseColliders(view, header.sections.collider, header.counts.collider, stride, path);
            }
            return collidersCache;
        },
    });

    Object.defineProperty(level, "spawns", {
        enumerable: true,
        get() {
            if (!spawnsCache) {
                const stride = sectionStride("spawn", header.sections.spawn, header.counts.spawn, path);
                spawnsCache = parseSpawns(
                    view, header.sections.spawn, header.counts.spawn, stride, getEntities().length, path
                );
            }
            return spawnsCache;
        },
    });

    return level;
}