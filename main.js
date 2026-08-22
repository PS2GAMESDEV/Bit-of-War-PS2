import Player from "./src/features/Player/index.js";
import Gamepad from "./src/shared/lib/gamepad.js";

const world = Box2D.createWorld({ gravity: { x: 0, y: 9.8 } });
const player = new Player(world, { x: 250, y: 250 });

Screen.setParam(Screen.DEPTH_TEST_ENABLE, false);
Screen.display(() => {
    Gamepad.update();
    world.step(1 / 60);

    player.update();
});