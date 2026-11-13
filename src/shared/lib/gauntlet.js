import { stepsToSeconds, ORIGINAL_HZ } from "./constants.js";

// Gauntlet (Boss Rush) mode of Bit of War 1.10: rules recovered from the
// original executable (objects controllerMenu, timerBossRush,
// controllerBossRushTotals, controllerGameOverBossRushMenu and the BossRush1-8
// rooms; BossRush2-8 are copies of campaign rooms without their cutscenes).

// Rooms in the order the original visits them: BossRush1 (new room), the three
// "Fusion" gauntlets interleaved with Zeus and Thor, Bastet (which jumps
// straight to ShadowRoom1) and the three Shadow Kratos fights. skDefeat then
// goes to the totals screen (room 77) instead of the ending.
export const GAUNTLET_ROUTE = Object.freeze([
    "BossRush1.json",
    "FusionGuantlet1.json", "Boss1.json",
    "FusionGuantlet2.json", "Boss2.json",
    "FusionGuantlet3.json", "BossHall3.json",
    "ShadowRoom1.json", "ShadowRoom2.json", "FinalBossRoom.json"
]);

// Only BossRush2 holds a controllerMusicBoss; the other rooms leave it playing.
export const GAUNTLET_MUSIC = Object.freeze({
    1: "boss", 2: "boss", 3: "boss", 4: "boss", 5: "boss", 6: "boss", 7: "boss", 8: "boss", 9: "boss"
});

export const DEFAULT_BEST = 10 * 3600;      // 10:00:00, the original's initial record
export const DEVELOPER_TIME = 275;          // below it the totals time is drawn red
export const TOTALS_DELAY = stepsToSeconds(40);        // alarm 0 of the totals screen: 40 steps
export const TRANSITION_TIME = stepsToSeconds(10);     // transition_steps = 10 after a boss falls

const pad2 = n => (n < 10 ? "0" : "") + n;

// "HH:MM:SS" as timerBossRush and the totals screen print it.
export function formatClock(total) {
    const seconds = Math.max(0, Math.floor(total));
    return `${pad2(Math.floor(seconds / 3600))}:${pad2(Math.floor(seconds / 60) % 60)}:${pad2(seconds % 60)}`;
}

// A missing or invalid best time reads as the original's 10:00:00 default.
export function previousBest(saved) {
    return Number.isFinite(saved) && saved >= 0 ? saved : DEFAULT_BEST;
}

export const isNewRecord = (total, saved) => total < previousBest(saved);

// timerBossRush: one tick per second (an alarm of 20 steps at 20 Hz). It is
// persistent, so it keeps counting across rooms; BossRush1 resets it.
export class GauntletClock {
    constructor() { this.reset(); }
    reset() { this.elapsed = 0; }
    update(dt) { this.elapsed += dt; }
    // One tick per 20 steps, whatever the step rate.
    get seconds() { return Math.floor(this.elapsed * ORIGINAL_HZ / 20 + 1e-9); }
    get text() { return formatClock(this.seconds); }
}
