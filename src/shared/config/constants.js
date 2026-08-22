import gamepad from "../lib/gamepad.js";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Screen.getMode();
export {SCREEN_WIDTH, SCREEN_HEIGHT}

export const PLAYER_ONE = gamepad.player(0);

export const BOX2D_SCALE = 30;
export const GAME_SCALE = 2;
export const GAME_GRAVITY = 50;

export const ASSETS_PATH = Object.freeze({
    SPRITES: "./assets/images/sprites",
    UI: "./assets/images/ui",
    SOUNDS: "./assets/sounds",
    TILES: "./assets/images/tiles"
})
