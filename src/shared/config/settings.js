export const settings = {
    music: 10,
    sfx: 10,
};

export function setMusic(value) {
    settings.music = value;
    Sound.setVolume(settings.music * 10);
}

export function setSfx(value) {
    settings.sfx = value;
}

export const PLAYER_CONTROLS = {
    BLOCK: Pads.R1,
    JUMP: Pads.CROSS,
    ATK: Pads.SQUARE,
    OPEN_CHEST: Pads.CIRCLE
}