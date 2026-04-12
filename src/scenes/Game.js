import Camera from "../features/Camera/camera.js";
import { ScreenFlash } from "../features/Objects/Chest/chest.js";
import TileMapRenderer from "../features/Map/renderer.js";
import Player from "../features/Player/player.js";
import Collision from "../shared/lib/collision.js";
import { ASSETS_PATH, GAME_SCALE, PLAYER_ONE_PORT, DOOR_CONFIG } from "../shared/lib/constants.js";
import Gamepad from "../shared/lib/gamepad.js";

const GAME_ROOMS = Object.freeze({
    world1: {
        sequence: ["OlympusMntI01.json", "OlympusMntClimb.json"],
    }
});

const GAME_STATE = Object.freeze({
    PLAYING: 0,
    TRANSITIONING: 1,
    COMPLETED: 2
});

export default function Game() {
    this.currentWorld = 'world1';
    this.state = GAME_STATE.PLAYING;
    this.transitionTimer = 0;
    this.fadeAlpha = 0;

    this.tileMap = null;
    this.player = null;
    this.camera = null;
    this.mapData = null;

    this.levelGenerator = this._createLevelGenerator();

    this._initGame();
}

Game.prototype._createLevelGenerator = function* () {
    const sequence = GAME_ROOMS[this.currentWorld].sequence;

    for (let i = 0; i < sequence.length; i++) {
        yield {
            index: i,
            mapFile: sequence[i],
            isLast: i === sequence.length - 1
        };
    }

    return null;
};

Game.prototype._initGame = function () {
    const firstLevel = this.levelGenerator.next();
    if (!firstLevel.done) {
        this._loadLevel(firstLevel.value);
    }
}

Game.prototype._cleanupCurrentLevel = function () {
    if (this.tileMap) {
        for (const obj of this.tileMap.objects) {
            obj.destroy?.();
        }

        const statics = [...Collision.staticColliders.values()];
        for (const c of statics) {
            Collision.unregister(c.id);
        }

        const dynamics = [...Collision.colliders.values()];
        for (const c of dynamics) {
            if (!c.tags.includes('player')) {
                Collision.unregister(c.id);
            }
        }

        this.tileMap = null;
    }
}

Game.prototype._loadLevel = function (levelInfo) {
    if (!levelInfo) {
        this.state = GAME_STATE.COMPLETED;
        return;
    }

    this._cleanupCurrentLevel();

    const mapFile = levelInfo.mapFile;
    this.mapData = JSON.parse(std.loadFile(ASSETS_PATH.MAPS + "/" + mapFile));

    this.tileMap = new TileMapRenderer(this.mapData, {
        scaleX: GAME_SCALE,
        scaleY: GAME_SCALE,
    });

    this.tileMap.buildColliders(Collision);

    const spawnPoint = this._findSpawnPoint();

    if (!this.player) {
        this.player = new Player({
            initialX: spawnPoint.x,
            initialY: spawnPoint.y,
            scale: GAME_SCALE
        });
    } else {
        this.player.reposition(spawnPoint.x, spawnPoint.y);
    }

    if (!this.camera) {
        this.camera = new Camera();
    }
    this.camera.setBounds(0, this.tileMap.getMapSize().width, 0, this.tileMap.getMapSize().height);

    this.state = GAME_STATE.PLAYING;
    this.transitionTimer = 0;
    this.fadeAlpha = 0;
}

Game.prototype._findSpawnPoint = function () {
    if (this.mapData.tiles.spriteKratos && this.mapData.tiles.spriteKratos.length > 0) {
        return {
            x: (this.mapData.tiles.spriteKratos[0].x * GAME_SCALE) + 16,
            y: this.mapData.tiles.spriteKratos[0].y * GAME_SCALE
        };
    }

    return { x: 100, y: 100 };
}

Game.prototype._checkDoorInteraction = function () {
    if (this.state !== GAME_STATE.PLAYING) return;

    const gamepad = Gamepad.player(PLAYER_ONE_PORT);
    if (!gamepad.justPressed(Pads.CIRCLE)) return;

    const bounds = this.player.getBounds();
    const doorCheck = Collision.checkArea({
        type: 'rect',
        x: bounds.left + 4,
        y: bounds.top + 4,
        w: (bounds.right - bounds.left) - 8,
        h: (bounds.bottom - bounds.top) - 8,
        mask: ['door'],
        excludeId: this.player.colliderId
    });

    if (doorCheck.length > 0) {
        this._startTransition();
    }
}

Game.prototype._startTransition = function () {
    this.state = GAME_STATE.TRANSITIONING;
    this.transitionTimer = Date.now();
    this.player.movement.canMove = false;
}

Game.prototype._updateTransition = function (deltaTime) {
    const elapsed = Date.now() - this.transitionTimer;
    const progress = Math.min(elapsed / DOOR_CONFIG.TRANSITION_DELAY, 1);

    this.fadeAlpha = Math.floor(progress * 128);

    if (progress >= 1) {
        const nextLevel = this.levelGenerator.next();
        this._loadLevel(nextLevel.value);
        this.player.movement.canMove = true;
    }
}

Game.prototype.update = function (deltaTime) {
    if (this.state === GAME_STATE.COMPLETED) {
        return;
    }

    Gamepad.update();

    if (Gamepad.player(PLAYER_ONE_PORT).pressed(Pads.L1)) {
        Collision.toggleDebug();
    }

    if (this.state === GAME_STATE.TRANSITIONING) {
        this._updateTransition(deltaTime);
    } else {
        this._checkDoorInteraction();
    }

    this.camera.update(this.player.movement.position.x, this.player.movement.position.y);
    this.tileMap.updateCamera(this.camera.x, this.camera.y);
    this.tileMap.render();

    this.player.update(deltaTime);
    for (const obj of this.tileMap.objects) {
        obj.update(this.camera.x, this.camera.y, {
            player: this.player,
            deltaTime: deltaTime,
        });
    }

    ScreenFlash.update(deltaTime);
    this.player.draw(this.camera.x, this.camera.y);

    Collision.check();
    Collision.renderDebug(this.camera.x, this.camera.y);

    ScreenFlash.draw();

    if (this.state === GAME_STATE.TRANSITIONING) {
        const fadeColor = Color.new(0, 0, 0, this.fadeAlpha);
        Draw.rect(0, 0, Screen.getMode().width, Screen.getMode().height, fadeColor);
    }
}