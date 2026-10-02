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
    ENEMY: 32,
    KILL: 64
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
    IDLE_R: "idle_r",
    DIE: "die"
});

// Units per second (the values used to be pixels per frame at 60 Hz).
const PLAYER_MOVEMENT = Object.freeze({
    GRAVITY: 2160,
    MAX_FALL_SPEED: 720,
    SPEED: 180,
    CLIMB_SPEED: 171,
    JUMP_SPEED: 655,   // jumps 99 units: 83 (the old 600) plus half a block (16 units)
    JUMPS: 1
});

// A hit on the player: he loses one health, is thrown up and away from the
// attacker (units per second) with no control for STUN seconds, and stays
// translucent and immune for INVULNERABLE seconds.
const PLAYER_HURT = Object.freeze({
    HEALTH: 5,
    KNOCK_X: 200,
    KNOCK_Y: 360,
    STUN: 0.3,
    INVULNERABLE: 1.2
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
    PLAYER_HURT,
    VFX_SCREEN_COLOR,
    DOOR_CONFIG
}
