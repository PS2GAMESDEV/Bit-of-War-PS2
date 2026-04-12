import Torch from "./src/features/Objects/Torch/torch.js";
import Game from "./src/scenes/Game.js";

Screen.setParam(Screen.DEPTH_TEST_ENABLE, false);

const game = new Game();
let lastFrameTime = Date.now();


while (true) {
    Screen.clear();
    
    const now = Date.now();
    const deltaTime = (now - lastFrameTime) / 1000;
    lastFrameTime = now;
    
    game.update(deltaTime);
    
    Screen.flip();
}