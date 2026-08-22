import Physics from "./src/shared/lib/physics.js";
import Player from "./src/features/Player/index.js";
import TileMapRenderer from "./src/features/Tilemap/index.js";
import Gamepad from "./src/shared/lib/gamepad.js";
import Camera from "./src/shared/lib/camera.js";
import { PLAYER_ONE } from "./src/shared/config/constants.js";

const mapRenderer = new TileMapRenderer("./levels/GaiaArm.athenaenv");
Physics.loadLevelColliders(mapRenderer.level);

const player = new Player(Physics.world, { x: 250, y: 250 });

const camera = new Camera();
const mapSize = mapRenderer.getMapSize();
camera.setBounds(0, mapSize.width, 0, mapSize.height);
camera.snapTo(player.getCameraTarget().x, player.getCameraTarget().y);

Screen.setParam(Screen.DEPTH_TEST_ENABLE, false);
Screen.display(() => {
    Gamepad.update();
    Physics.step(1 / 60);

    if (PLAYER_ONE.justPressed(Pads.L1)) {
        Physics.toggleDebug();
    }

    const target = player.getCameraTarget();
    camera.update(target.x, target.y);

    mapRenderer.render(camera.x, camera.y);
    player.update(camera);
    Physics.renderDebug(camera.x, camera.y);
});