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
    }

    changeScene(Scene) {
        this.isLoading = true;

        if (this.currentScene && this.currentScene.unload) {
            this.currentScene.unload();
        }

        const thread = new Thread(() => {
            this.currentScene = new Scene(this);
            this.isLoading = false;
        }, "Load Scene");

        thread.start();
    }

    update(dt) {
        if (this.isLoading) {
            loading.deltaTime = dt;
            animationSprite(loading);
            return;
        }

        if (this.currentScene && this.currentScene.update) {
            this.currentScene.update(dt);
        }
    }

    draw() {
        if (this.isLoading) {
            this.drawLoading();
            return;
        }

        if (this.currentScene && this.currentScene.draw) {
            this.currentScene.draw();
        }
    }

    drawLoading() {
        Draw.rect(0, 0, 640, 448, Color.new(8, 8, 8));
        loading.draw(460, 400);
    }
}