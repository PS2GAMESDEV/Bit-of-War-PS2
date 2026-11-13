// Petrified enemies. The Gorgon Head replaces an enemy with its stone object
// (enUndeadS, enMinotaurLS...): `sprite <id>` of the original, 3 frames at
// image_speed .2 (4 fps) that stop on the last one, or a single frame for the
// archers. Values are [first frame, frame count] in assets/images/enemies/stones.png
// for [facing right, facing left]; flyers and archers have one entry per object.
const S = (first, count) => ({ first, count });
export const STONES = Object.freeze({
    Undead: [S(0, 3), S(3, 3)],
    Minotaur: [S(6, 3), S(9, 3)],
    VSoldier: [S(17, 3), S(20, 3)],
    Spearman: [S(25, 3), S(28, 3)],
    Mummy: [S(34, 3), S(37, 3)],
    Anubis: [S(45, 3), S(48, 3)],
    Skelbow: [S(12, 1), S(13, 1)],      // enSkelbowRS / enSkelbowS
    Vbow: [S(24, 1), S(23, 1)],         // enVbowRS / enVbowS
    Scorpion: [S(43, 1), S(44, 1)],     // enScorpionRS / enScorpionS
    Harpie: [S(14, 3), S(14, 3)],
    Dragon: [S(31, 3), S(31, 3)],
    Scarab: [S(40, 3), S(40, 3)]
});

export const STONE_FPS = 4;

// The stone art for `enemy` given the way it faces (dir > 0: right), or null.
export function stoneFor(enemy) {
    const entry = STONES[enemy.constructor.name];
    if (!entry) return null;
    const dir = enemy.dir ?? (enemy.facingRight ? 1 : -1);
    return entry[dir > 0 ? 0 : 1];
}
