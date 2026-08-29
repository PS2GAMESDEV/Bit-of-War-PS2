import { Scene } from "../../../shared/lib/scene_manager.js";
import Physics from "../../../shared/lib/physics.js";
import Player from "../../Player/index.js";
import TileMapRenderer from "../../Tilemap/index.js";
import Camera from "../../../shared/lib/camera.js";
import { PLAYER_ONE, ASSETS_PATH, LEVEL_SEQUENCE, GAME_SCALE } from "../../../shared/config/constants.js";
import { bladeKratosConfig, spritesheetKratosConfig } from "../../Player/constants.js";

export default class GameScene extends Scene {
    static assetRoot = "assets";

    manifest() {
        return {
            images: [
                { path: "images/tiles/texture.png", lock: true },
                {
                    path: "images/sprites/kratos/spritesheet.png",
                    animConfig: spritesheetKratosConfig
                },
                {
                    path: "images/sprites/kratos/blade.png",
                    animConfig: bladeKratosConfig
                },
                { path: "images/ui/hud.png" },
                { path: "images/ui/powerup.png" },
            ],
            sounds: [
                "sounds/sfx/jump.adp",
                "sounds/sfx/blades.adp",
            ],
            fonts: []
        };
    }

    onEnter(assets) {
        this.assets = assets;
        this.camera = new Camera();
        this.pendingLevelPath = null;
        this.currentLevelIndex = 0;

        this.loadLevel(LEVEL_SEQUENCE[this.currentLevelIndex]);
    }

    #tryAdvanceLevel() {
        if (!this.player.isTouching("door")) return;
        if (!PLAYER_ONE.justPressed(Pads.UP)) return;

        const nextIndex = this.currentLevelIndex + 1;
        if (nextIndex >= LEVEL_SEQUENCE.length) return;

        this.currentLevelIndex = nextIndex;
        this.pendingLevelPath = LEVEL_SEQUENCE[nextIndex];
    }

    loadLevel(levelPath) {
        this.currentLevelPath = levelPath;

        if (!this.mapRenderer) {
            this.mapRenderer = new TileMapRenderer(levelPath, this.assets,
                {
                    spritesheetKey: "images/tiles/texture.png",
                    texturePath: "./assets/images/tiles/texture.json"
                });
        } else {
            this.mapRenderer.rebuild(levelPath);
        }

        Physics.loadLevelColliders(this.mapRenderer.level);

        if (this.player) {
            this.player.resetSensors();
        }

        const spawn = this.#resolveSpawnPosition(this.mapRenderer.level);

        if (!this.player) {
            this.player = new Player(spawn, this.assets);
        } else {
            this.player.setPosition(spawn.x, spawn.y);
        }

        const mapSize = this.mapRenderer.getMapSize();
        this.camera.setBounds(0, mapSize.pixelWidth, 0, mapSize.pixelHeight);

        const target = this.player.getCameraTarget();
        this.camera.snapTo(target.x, target.y);
    }

    #resolveSpawnPosition(level) {
        const spawnRef = level?.spawns?.[0];

        if (spawnRef && Number.isFinite(spawnRef.entityIndex)) {
            const entity = level.entities?.[spawnRef.entityIndex];
            if (entity && Number.isFinite(entity.x) && Number.isFinite(entity.y)) {
                return { x: entity.x * GAME_SCALE, y: entity.y * GAME_SCALE };
            }
            console.log("[GameScene] spawn referencia entidade inválida:", JSON.stringify(spawnRef));
        }

        return { x: 250, y: 250 };
    }

    onUpdate(dt) {
        if (this.pendingLevelPath) {
            const nextPath = this.pendingLevelPath;
            this.pendingLevelPath = null;
            this.loadLevel(nextPath);
            return;
        }

        Physics.step(dt || 1 / 60);

        if (PLAYER_ONE.justPressed(Pads.L1)) {
            Physics.toggleDebug();
        }

        this.#tryAdvanceLevel();

        const target = this.player.getCameraTarget();
        this.camera.update(target.x, target.y);
    }

    onDraw() {
        if (!this.mapRenderer || !this.player) return;

        if (this._tileMapWasReady === undefined) this._tileMapWasReady = false;
        const ready = this.mapRenderer.stats !== null;
        if (ready && !this._tileMapWasReady) {
            console.log("[GameScene] tilemap ficou pronto para renderizar");
            this._tileMapWasReady = true;
        }

        this.mapRenderer.render(this.camera.x, this.camera.y);

        this.player.update(this.camera);

        Physics.renderDebug(this.camera.x, this.camera.y);
    }

    onExit() {
        if (this.player) {
            this.player.destroy();
            this.player = null;
        }
        Physics.clearLevel();

        if (this.mapRenderer) {
            this.mapRenderer.destroy();
            this.mapRenderer = null;
        }

        this.camera = null;
    }
}