import Camera from "./src/features/Camera/camera.js";
import { ScreenFlash } from "./src/features/Chest/chest.js";
import TileMapRenderer from "./src/features/Map/renderer.js";
import Player from "./src/features/Player/player.js";
import Collision from "./src/shared/lib/collision.js";
import { ASSETS_PATH, GAME_SCALE, PLAYER_ONE_PORT } from "./src/shared/lib/constants.js";
import Gamepad from "./src/shared/lib/gamepad.js";

const mapData = JSON.parse(std.loadFile(ASSETS_PATH.MAPS + "/OlympusMntClimb.json"));

const tileMap = new TileMapRenderer(mapData, {
    scaleX: GAME_SCALE,
    scaleY: GAME_SCALE,
});

const camera = new Camera();
const mapSize = tileMap.getMapSize();
camera.setBounds(0, mapSize.width, 0, mapSize.height);

const player = new Player({ initialX: (mapData.tiles.spriteKratos[0].x * GAME_SCALE) + 16, initialY: mapData.tiles.spriteKratos[0].y * GAME_SCALE, scale: GAME_SCALE });

tileMap.buildColliders(Collision);

Screen.setParam(Screen.DEPTH_TEST_ENABLE, false);
let lastFrameTime = Date.now();

while (true) {
    Screen.clear();
    Gamepad.update();

    const now = Date.now();
    const deltaTime = (now - lastFrameTime) / 1000;
    lastFrameTime = now;

    if (Gamepad.player(PLAYER_ONE_PORT).pressed(Pads.L1)) {
        Collision.toggleDebug();
    }

    camera.update(player.movement.position.x, player.movement.position.y);
    tileMap.updateCamera(camera.x, camera.y);
    tileMap.render();

    player.update(deltaTime);

    for (const obj of tileMap.objects) obj.update(player, deltaTime, camera.x, camera.y);

    ScreenFlash.update(deltaTime);
    player.draw(camera.x, camera.y);

    Collision.check();
    Collision.renderDebug(camera.x, camera.y);

    ScreenFlash.draw();
    Screen.flip();
}