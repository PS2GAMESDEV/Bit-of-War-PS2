import LoadingScreen from "./src/features/Scenes/loading.js";
import Assets from "./src/shared/lib/assets.js";
import { ASSETS_PATH } from "./src/shared/config/constants.js";
import { SceneManager } from "./src/shared/lib/scene_manager.js";
import Gamepad from "./src/shared/lib/gamepad.js";
import MenuFlow from "./src/features/Scenes/Menu/flow.js";

const loadingScreen = new LoadingScreen();
const manager = new SceneManager({
    loadingScreen,
    blockingPerFrame: 1,
    minLoadingFrames: 6,
});

manager.goto(MenuFlow);
let lastFrameTime = Date.now();

Screen.setParam(Screen.DEPTH_TEST_ENABLE, false);
Screen.display(() => {
    Gamepad.update();

    const now = Date.now();
    const deltaTime = (now - lastFrameTime) / 1000;
    lastFrameTime = now;

    manager.update(deltaTime);
    manager.draw();
})