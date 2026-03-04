const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Screen.getMode();

const PLAYER_ONE_PORT = 0;
const PLAYER_TWO_PORT = 1

const PLAYER_ANIMATIONS = Object.freeze({
    WALK_L: "walk_l",
    WALK_R: "walk_r",
    JUMP_L: "jump_l",
    JUMP_R: "jump_r",
    BLOCK_L: "block_l",
    BLOCK_R: "BLOCK_r",
    ATK_R: "atk_r",
    ATK_L: "atk_l",
    CLIMB: "climb",
    IDLE_L: "idle_l",
    IDLE_R: "idle_r"
})
const PLAYER_MOVEMENT = Object.freeze({
    DEFAULT_GRAVITY: 0.8,
    MAX_Y_VELOCITY: 12,
    DEFAULT_SPEED: 2,
    DEFAULT_JUMP_STRENGTH: -14,
    DEFAULT_JUMPS: 2
})

const CHEST_ANIMATIONS = Object.freeze({
    OPEN: "open",
    CLOSED: "closed"
})
const CHEST_TYPES = Object.freeze({
    Life: "Life",
    MAGIC: "Magic"
})

const ASSETS_PATH = Object.freeze({
    SPRITES: "./assets/images/sprites",
    OBJECTS: "./assets/images/objects",
    SOUNDS: "./assets/sounds",
    UI: "./assets/images/ui",
    TILES: "./assets/images/tiles",
})

export {
    SCREEN_HEIGHT,
    SCREEN_WIDTH,
    PLAYER_ONE_PORT,
    PLAYER_TWO_PORT,
    ASSETS_PATH,
    PLAYER_ANIMATIONS,
    PLAYER_MOVEMENT,
    CHEST_ANIMATIONS,
    CHEST_TYPES
}