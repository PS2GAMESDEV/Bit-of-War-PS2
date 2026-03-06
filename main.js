import Chest, { ScreenFlash } from "./src/features/Chest/chest.js";
import TileMapRenderer from "./src/features/Map/renderer.js";
import Player from "./src/features/Player/player.js";
import Collision from "./src/shared/lib/collision.js";
import { ASSETS_PATH, CHEST_TYPES, PLAYER_ONE_PORT, SCREEN_HEIGHT, SCREEN_WIDTH } from "./src/shared/lib/constants.js";
import Gamepad from "./src/shared/lib/gamepad.js";

const mapData = JSON.parse(std.loadFile(ASSETS_PATH.MAPS + "/GaiaArm.json"));

const tileMap = new TileMapRenderer(mapData, {
    scaleX: 2,
    scaleY: 2,
});

const player = new Player({ initialX: 32, initialY: 128, scale: 2 });

const chests = [
    new Chest({ x: 100, y: SCREEN_HEIGHT - 66, type: CHEST_TYPES.Life, scale: 2 }),
    new Chest({ x: 250, y: SCREEN_HEIGHT - 66, type: CHEST_TYPES.MAGIC, scale: 2 }),
];

Collision.register({
    type: 'rect',
    x: 0,
    y: SCREEN_HEIGHT - 50,
    w: SCREEN_WIDTH,
    h: 50,
    layer: 'ground',
    tags: ['ground', 'solid'],
    static: true
});

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

    tileMap.updateCamera(0, 0);
    tileMap.render();

    player.update(deltaTime);

    for (const chest of chests) {
        chest.update(player);
    }
    ScreenFlash.update(deltaTime);
    player.draw();

    Collision.check();
    Collision.renderDebug();

    ScreenFlash.draw();
    Screen.flip();
}