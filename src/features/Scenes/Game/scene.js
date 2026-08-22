import { Scene } from "../../../shared/lib/scene_manager.js";
import Physics from "../../../shared/lib/physics.js";
import Player from "../../Player/index.js";
import TileMapRenderer from "../../Tilemap/index.js";
import Camera from "../../../shared/lib/camera.js";
import { PLAYER_ONE, ASSETS_PATH } from "../../../shared/config/constants.js";
import { bladeKratosConfig, spritesheetKratosConfig } from "../../Player/constants.js";

export default class GameScene extends Scene {
    static assetRoot = "assets";

    manifest() {
        return {
            images: [
                { path: "images/tiles/texture.png" },
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
        this.currentLevelPath = null;

        this.unsubscribeSensor = Physics.onSensorEvent((event) => this.#handleSensorEvent(event));

        this.loadLevel("./levels/GaiaArm.athenaenv");
    }

    #handleSensorEvent({ sensorData, visitorData, began }) {
        if (!began) return;

        const doorData = (sensorData?.colliderType === "door" ? sensorData : null) ||
            (visitorData?.colliderType === "door" ? visitorData : null);

        if (doorData) {
            const nextLevel = doorData.targetLevel || this.#getNextLevelPath(this.currentLevelPath);

            if (nextLevel && !this.pendingLevelPath) {
                this.pendingLevelPath = nextLevel;
            }
        }
    }

    #getNextLevelPath(currentPath) {
        if (currentPath === "./levels/GaiaArm.athenaenv") {
            return "./levels/GaiaArm.athenaenv";
        }
        return "./levels/GaiaArm.athenaenv";
    }

    loadLevel(levelPath) {
        this.currentLevelPath = levelPath;

        if (!this.mapRenderer) {
            this.mapRenderer = new TileMapRenderer(levelPath, this.assets);
        } else {
            this.mapRenderer.rebuild(levelPath);
        }

        Physics.loadLevelColliders(this.mapRenderer.level);

        const spawn = this.#resolveSpawnPosition(this.mapRenderer.level);

        if (!this.player) {
            this.player = new Player(Physics.world, spawn, this.assets);
        } else {
            if (typeof this.player.setPosition === "function") {
                this.player.setPosition(spawn.x, spawn.y);
            } else if (this.player.body && typeof this.player.body.setTransform === "function") {
                this.player.body.setTransform(spawn.x, spawn.y, 0);
            } else {
                if (typeof this.player.destroy === "function") this.player.destroy();
                this.player = new Player(Physics.world, spawn, this.assets);
            }
        }

        const mapSize = this.mapRenderer.getMapSize();
        this.camera.setBounds(0, mapSize.width, 0, mapSize.height);

        const target = this.player.getCameraTarget();
        this.camera.snapTo(target.x, target.y);
    }

    #resolveSpawnPosition(level) {
        const spawnRef = level?.spawns?.[0];

        if (spawnRef && Number.isFinite(spawnRef.entityIndex)) {
            const entity = level.entities?.[spawnRef.entityIndex];
            if (entity && Number.isFinite(entity.x) && Number.isFinite(entity.y)) {
                return { x: entity.x, y: entity.y };
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

        const target = this.player.getCameraTarget();
        this.camera.update(target.x, target.y);
    }

    onDraw() {
        if (!this.mapRenderer || !this.player) return;

        this.mapRenderer.render(this.camera.x, this.camera.y);

        this.player.update(this.camera);

        Physics.renderDebug(this.camera.x, this.camera.y);
    }

    onExit() {
        if (this.unsubscribeSensor) {
            this.unsubscribeSensor();
            this.unsubscribeSensor = null;
        }

        Physics.clearLevel();

        if (this.player) {
            if (typeof this.player.destroy === "function") {
                this.player.destroy();
            } else if (this.player.id) {
                Physics.destroyBody(this.player.id);
            }
            this.player = null;
        }

        if (this.mapRenderer) {
            this.mapRenderer.destroy();
            this.mapRenderer = null;
        }

        this.camera = null;
    }
}