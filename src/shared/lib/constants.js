const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Screen.getMode();

const GAME_SCALE = 2;

const ASSETS_PATH = Object.freeze({
    MAPS: "./src/data"
});

// Collision layers (bit flags, see Collision.World)
const LAYER = Object.freeze({
    SOLID: 1,
    PLAYER: 2,
    LADDER: 4,
    DOOR: 8,
    PROBE: 16,
    ENEMY: 32
});

const VFX_SCREEN_COLOR = Object.freeze({
    LIFE: Color.new(28, 237, 37, 100),
    MAGIC: Color.new(85, 146, 255, 100)
});

const DOOR_CONFIG = Object.freeze({
    TRANSITION_DELAY: 0.5,
    FADE_IN: 0.15
});

const PLAYER_ANIMATIONS = Object.freeze({
    WALK_L: "walk_l",
    WALK_R: "walk_r",
    JUMP_L: "jump_l",
    JUMP_R: "jump_r",
    BLOCK_L: "block_l",
    BLOCK_R: "block_r",
    ATK_L: "atk_l",
    ATK_R: "atk_r",
    CLIMB: "climb",
    IDLE_L: "idle_l",
    IDLE_R: "idle_r"
});

// Units per second (the values used to be pixels per frame at 60 Hz).
const PLAYER_MOVEMENT = Object.freeze({
    GRAVITY: 2160,
    MAX_FALL_SPEED: 720,
    SPEED: 180,
    CLIMB_SPEED: 171,
    JUMP_SPEED: 600,
    JUMPS: 1
});

// Units per second.
const UNDEAD_SPEED = 60;
const MINOTAUR_WALK_SPEED = 60;
const MINOTAUR_RUN_SPEED = 150;

// Damage of one blade swing to each enemy it touches.
const BLADE_DAMAGE = 1;

// The push a hit gives an enemy that moves: initial units per second, and how
// fast it fades (per second). About 26 units in all.
const KNOCKBACK_SPEED = 260;
const KNOCKBACK_DECAY = 10;

export {
    BLADE_DAMAGE,
    KNOCKBACK_SPEED,
    KNOCKBACK_DECAY,
    UNDEAD_SPEED,
    MINOTAUR_WALK_SPEED,
    MINOTAUR_RUN_SPEED,
    SCREEN_HEIGHT,
    SCREEN_WIDTH,
    GAME_SCALE,
    ASSETS_PATH,
    LAYER,
    PLAYER_ANIMATIONS,
    PLAYER_MOVEMENT,
    VFX_SCREEN_COLOR,
    DOOR_CONFIG
}
