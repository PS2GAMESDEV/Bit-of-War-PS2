import Camera from "src/features/Camera/camera.js";
import { ASSETS_PATH, GAME_SCALE, PLAYER_ONE_PORT } from "src/shared/lib/constants.js";
import { ScreenFlash } from "src/features/Chest/chest.js";
import TileMapRenderer from "src/features/Map/renderer.js";
import Player from "src/features/Player/player.js";
import Collision from "src/shared/lib/collision.js";
import Gamepad from "src/shared/lib/gamepad.js";

// Level 3
export function OlympusMntClimb(Scene) {
    const mapData = JSON.parse(
        std.loadFile(ASSETS_PATH.MAPS + "/OlympusMntClimb.json")
    );

    const tileMap = new TileMapRenderer(mapData, {
        scaleX: GAME_SCALE,
        scaleY: GAME_SCALE,
    });

    const camera = new Camera();
    const mapSize = tileMap.getMapSize();

    camera.setBounds(0, mapSize.width, 0, mapSize.height);

    const player = new Player({
        initialX: (mapData.tiles.spriteKratos[0].x * GAME_SCALE) + 16,
        initialY: mapData.tiles.spriteKratos[0].y * GAME_SCALE,
        scale: GAME_SCALE,
    });

    tileMap.buildColliders(Collision);
    

    return {
        update(deltaTime) {
            if (Gamepad.player(PLAYER_ONE_PORT).pressed(Pads.L1)) {
                Collision.toggleDebug();
            }

            camera.update(
                player.movement.position.x,
                player.movement.position.y
            );

            tileMap.updateCamera(camera.x, camera.y);

            player.update(deltaTime);

            for (const obj of tileMap.objects) {
                obj.update(player, deltaTime, camera.x, camera.y);
            }

            ScreenFlash.update(deltaTime);
            Collision.check();
        },

        draw() {
            tileMap.render();

            player.draw(camera.x, camera.y);

            Collision.renderDebug(camera.x, camera.y);

            ScreenFlash.draw();
        },
    };
}