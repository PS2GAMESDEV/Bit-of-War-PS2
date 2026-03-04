import Player from "./src/features/Player/player.js";
import Collision from "./src/shared/lib/collision.js";
import { PLAYER_ONE_PORT, SCREEN_HEIGHT, SCREEN_WIDTH } from "./src/shared/lib/constants.js";
import Gamepad from "./src/shared/lib/gamepad.js";

const player = new Player({ initialX: 0, initialY: SCREEN_HEIGHT - 250 });

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

    player.update(deltaTime);
    player.draw();

    Collision.check();
    Collision.renderDebug();

    Screen.flip();
}