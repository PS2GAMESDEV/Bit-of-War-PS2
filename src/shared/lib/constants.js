const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Screen.getMode();

const GAME_SCALE = 2;

const ORIGINAL_HZ = 20;
const stepsToSeconds = steps => steps / ORIGINAL_HZ;
const pxPerStep = px => px * ORIGINAL_HZ * GAME_SCALE;

const ASSETS_PATH = Object.freeze({
    MAPS: "./src/data"
});

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

const KRATOS_GRAVITY = .98 * ORIGINAL_HZ * ORIGINAL_HZ * GAME_SCALE;
const PLAYER_MOVEMENT = Object.freeze({
    GRAVITY: KRATOS_GRAVITY,
    MAX_FALL_SPEED: pxPerStep(12),
    SPEED: pxPerStep(3),
    CLIMB_SPEED: pxPerStep(3),

    JUMP_SPEED: Math.sqrt(2 * KRATOS_GRAVITY * 45.9 * GAME_SCALE),
    JUMPS: 1
});

const PLAYER_HURT = Object.freeze({
    HEALTH: 5,
    MAGIC: 5,
    PATH_SPEED: 6,
    INVULNERABLE: stepsToSeconds(30)
});

const UNDEAD_SPEED = pxPerStep(2);
const MINOTAUR_WALK_SPEED = pxPerStep(1);
const MINOTAUR_RUN_SPEED = pxPerStep(2);

const BLADE_DAMAGE = 1;

const KNOCKBACK_SPEED = 260;
const KNOCKBACK_DECAY = 10;

export {
    ORIGINAL_HZ,
    stepsToSeconds,
    pxPerStep,
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
