export const PLAYER_ANIMATIONS = Object.freeze({
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
});

export const X_SPEED = 5;
export const JUMP_FORCE = 16;


export const spritesheetKratosConfig = {
    totalFrames: 12,
    frames: [
        { x: 0, y: 0, width: 16, height: 16 },
        { x: 16, y: 0, width: 16, height: 16 },
        { x: 32, y: 0, width: 16, height: 16 },
        { x: 48, y: 0, width: 16, height: 16 },
        { x: 64, y: 0, width: 16, height: 16 },
        { x: 80, y: 0, width: 16, height: 16 },
        { x: 0, y: 16, width: 16, height: 16 },
        { x: 16, y: 16, width: 16, height: 16 },
        { x: 32, y: 16, width: 16, height: 16 },
        { x: 48, y: 16, width: 16, height: 16 },
        { x: 64, y: 16, width: 16, height: 16 },
        { x: 80, y: 16, width: 16, height: 16 },
    ]
}

export const bladeKratosConfig = {
    totalFrames: 7,
    frames: [
        { x: 0, y: 0, width: 48, height: 16 },
        { x: 48, y: 0, width: 48, height: 16 },
        { x: 96, y: 0, width: 48, height: 16 },
        { x: 144, y: 0, width: 48, height: 16 },
        { x: 192, y: 0, width: 48, height: 16 },
        { x: 240, y: 0, width: 48, height: 16 },
        { x: 288, y: 0, width: 48, height: 16 },
    ]
}