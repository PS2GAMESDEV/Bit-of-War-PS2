import { stepsToSeconds, ORIGINAL_HZ } from "./constants.js";

export const GAUNTLET_ROUTE = Object.freeze([
    "BossRush1.json",
    "FusionGuantlet1.json", "Boss1.json",
    "FusionGuantlet2.json", "Boss2.json",
    "FusionGuantlet3.json", "BossHall3.json",
    "ShadowRoom1.json", "ShadowRoom2.json", "FinalBossRoom.json"
]);

export const GAUNTLET_MUSIC = Object.freeze({
    1: "boss", 2: "boss", 3: "boss", 4: "boss", 5: "boss", 6: "boss", 7: "boss", 8: "boss", 9: "boss"
});

export const DEFAULT_BEST = 10 * 3600;
export const DEVELOPER_TIME = 275;
export const TOTALS_DELAY = stepsToSeconds(40);
export const TRANSITION_TIME = stepsToSeconds(10);

const pad2 = n => (n < 10 ? "0" : "") + n;

export function formatClock(total) {
    const seconds = Math.max(0, Math.floor(total));
    return `${pad2(Math.floor(seconds / 3600))}:${pad2(Math.floor(seconds / 60) % 60)}:${pad2(seconds % 60)}`;
}

export function previousBest(saved) {
    return Number.isFinite(saved) && saved >= 0 ? saved : DEFAULT_BEST;
}

export const isNewRecord = (total, saved) => total < previousBest(saved);

export class GauntletClock {
    constructor() { this.reset(); }
    reset() { this.elapsed = 0; }
    update(dt) { this.elapsed += dt; }

    get seconds() { return Math.floor(this.elapsed * ORIGINAL_HZ / 20 + 1e-9); }
    get text() { return formatClock(this.seconds); }
}
