const S = (first, count) => ({ first, count });
export const STONES = Object.freeze({
    Undead: [S(0, 3), S(3, 3)],
    Minotaur: [S(6, 3), S(9, 3)],
    VSoldier: [S(17, 3), S(20, 3)],
    Spearman: [S(25, 3), S(28, 3)],
    Mummy: [S(34, 3), S(37, 3)],
    Anubis: [S(45, 3), S(48, 3)],
    Skelbow: [S(12, 1), S(13, 1)],
    Vbow: [S(24, 1), S(23, 1)],
    Scorpion: [S(43, 1), S(44, 1)],
    Harpie: [S(14, 3), S(14, 3)],
    Dragon: [S(31, 3), S(31, 3)],
    Scarab: [S(40, 3), S(40, 3)]
});

export const STONE_FPS = 4;

export function stoneFor(enemy) {
    const entry = STONES[enemy.constructor.name];
    if (!entry) return null;
    const dir = enemy.dir ?? (enemy.facingRight ? 1 : -1);
    return entry[dir > 0 ? 0 : 1];
}
