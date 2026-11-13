const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Screen.getMode();

const GAME_SCALE = 2;

// Steps per second of the original game. Every original rate in the port (speeds in px
// per step, alarms and image speeds in steps) is converted with this one number. The
// room speed stored in the executable is 20 for every gameplay room, and its own
// comments assume it ("alarm 400 = after 20 seconds", the Gauntlet timer ticks every
// 20 steps); change it here to run the whole game at another rate.
const ORIGINAL_HZ = 20;
const stepsToSeconds = steps => steps / ORIGINAL_HZ;
const pxPerStep = px => px * ORIGINAL_HZ * GAME_SCALE;      // units per second

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
// spriteKratos of the original, per 20 Hz step x 20 x GAME_SCALE: walks and climbs 3 px,
// jumps with vspeed -9 and gravity .98 (GameMaker adds the gravity before moving, so
// he rises 8.02, 7.04 ... 0.18 px: 37 px in 9 steps, about 0.9 s in the air) and
// falls at most 12 px per step.
const KRATOS_GRAVITY = .98 * ORIGINAL_HZ * ORIGINAL_HZ * GAME_SCALE;
const PLAYER_MOVEMENT = Object.freeze({
    GRAVITY: KRATOS_GRAVITY,
    MAX_FALL_SPEED: pxPerStep(12),
    SPEED: pxPerStep(3),
    CLIMB_SPEED: pxPerStep(3),
    // vspeed -9 on the frame of the key press, when the step event still finds the floor
    // and sets no gravity: he rises 9, 8.02, 7.04 ... 0.18 px, about 46 px in all.
    JUMP_SPEED: Math.sqrt(2 * KRATOS_GRAVITY * 45.9 * GAME_SCALE),
    JUMPS: 1
});

// A hit on the player: he loses one health and follows the original hit path (kratosHitRight/Left,
// 6 px per step, about 32 px sideways and 16 up on top of normal gravity), with no control while
// it lasts, and stays translucent and immune for INVULNERABLE seconds.
const PLAYER_HURT = Object.freeze({
    HEALTH: 5,
    MAGIC: 5,
    PATH_SPEED: 6,                       // px per step
    INVULNERABLE: stepsToSeconds(30)     // countInvincible = 30 steps
});

// Units per second.
// Original px per 20 Hz step x 20 steps x GAME_SCALE: enUndead 2, enMinotaur 1 (2 charging).
const UNDEAD_SPEED = pxPerStep(2);
const MINOTAUR_WALK_SPEED = pxPerStep(1);
const MINOTAUR_RUN_SPEED = pxPerStep(2);

// Damage of one blade swing to each enemy it touches.
const BLADE_DAMAGE = 1;

// The push a hit gives an enemy that moves: initial units per second, and how
// fast it fades (per second). About 26 units in all.
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
