import Gamepad from "./src/shared/lib/gamepad.js";
import { SceneManager } from "./src/shared/lib/scenemanager.js";
import { Menu } from "./src/scenes/menu.js";
import { Cutscene01 } from "./src/scenes/cutscene01.js";

Screen.setParam(Screen.DEPTH_TEST_ENABLE, false);

const sceneManager = new SceneManager();
sceneManager.changeScene(Menu);

let lastFrameTime = Date.now();


while (true) {
    Screen.clear();
    Gamepad.update();
    
    const now = Date.now();
    const deltaTime = (now - lastFrameTime) / 1000;
    lastFrameTime = now;
    
    sceneManager.update(deltaTime);
    sceneManager.draw();
    
    Screen.flip();
}
