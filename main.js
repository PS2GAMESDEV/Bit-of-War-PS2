import Player from "./src/features/Player/index.js";
import TileMapRenderer from "./src/features/Tilemap/index.js";
import Gamepad from "./src/shared/lib/gamepad.js";

const world = Box2D.createWorld({ gravity: { x: 0, y: 9.8 } });

const mapRenderer = new TileMapRenderer("./levels/GaiaArm.athenaenv");

const player = new Player(world, { x: 250, y: 250 });

Screen.setParam(Screen.DEPTH_TEST_ENABLE, false);
Screen.display(() => {
    Gamepad.update();
    world.step(1 / 60);

    mapRenderer.updateCamera(player.x, player.y);
    mapRenderer.render();

    player.update();

});