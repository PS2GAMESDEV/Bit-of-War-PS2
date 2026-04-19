import { animationSprite } from "./animation.js";
import Assets from "./assets.js";

const loading = Assets.image("assets/images/sprites/kratos/kratos_spin_atk.png");
loading.frameWidth = 80;
loading.frameHeight = 16;
loading.totalFrames = 4;
loading.framesPerRow = 2;
loading.fps = 10;
loading.scale = 2;

export class SceneManager {
    constructor() {
        this.currentScene = null;
        this.isLoading = false;
        this.loadingTimer = 0;
        this.minLoadingFrames = 3;
    }

    _showLoading() {
        this.isLoading = true;
        Screen.clear();
        this.drawLoading();
        Screen.flip();
    }

    changeScene(SceneClass, extraArg) {
        this._showLoading();

        if (this.currentScene?.unload) {
            try { this.currentScene.unload(); } catch (e) { }
        }
        this.currentScene = null;
        std.gc();

        try {
            this.currentScene = extraArg !== undefined
                ? new SceneClass(this, extraArg)
                : new SceneClass(this);
        } catch (e) {
            this.currentScene = SceneClass(this);
        }

        this.loadingTimer = this.minLoadingFrames;
    }

    resumeScene(next) {
        this._showLoading();

        if (this.currentScene?.unload) {
            try { this.currentScene.unload(); } catch (e) { }
        }
        this.currentScene = null;
        std.gc();

        try {
            if (typeof next === 'function') {
                this.currentScene = new next(this);
            } else {
                this.currentScene = next;
                this.currentScene._pausedForCutscene = false;
                this.currentScene._doLoadLevel();
                if (this.currentScene.player) {
                    this.currentScene.player.movement.canMove = true;
                }
            }
        } catch (e) {
            console.log("[SceneManager] Resume Error: " + e);
        }

        this.loadingTimer = this.minLoadingFrames;
    }

    update(dt) {
        if (this.isLoading) {
            loading.deltaTime = dt;
            animationSprite(loading);

            this.loadingTimer--;
            if (this.loadingTimer <= 0) {
                this.isLoading = false;
            }
            return;
        }

        if (this.currentScene?.update) {
            this.currentScene.update(dt);
        }
    }

    draw() {
        if (this.isLoading) {
            this.drawLoading();
            return;
        }

        if (this.currentScene?.draw) {
            this.currentScene.draw();
        }
    }

    drawLoading() {
        Draw.rect(0, 0, 640, 448, Color.new(8, 8, 8));
        loading.draw(460, 400);
    }
}