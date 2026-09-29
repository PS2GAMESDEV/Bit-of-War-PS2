import { LANGS, getLang, setLang } from "../lang/lang.js";
import { Save } from "./save.js";

// Options menu values, kept on the memory card with the save.
export const settings = { music: 10, sfx: 10 };

const clampVolume = v => Math.min(Math.max(Math.round(Number(v)), 0), 10);

export function applySettings() {
    Sound.setVolume(settings.music * 10);
    Sound.setSfxVolume(settings.sfx * 10);
}

let loaded = false;

// Reads the options from the card once per run (the menu comes back many times)
// and applies them. Without a card or a stored value the defaults stay.
export async function loadSettings() {
    if (loaded) return;
    loaded = true;

    const stored = (await Save.load())?.settings;
    if (!stored) return;

    if (Number.isFinite(Number(stored.music))) settings.music = clampVolume(stored.music);
    if (Number.isFinite(Number(stored.sfx))) settings.sfx = clampVolume(stored.sfx);
    if (LANGS.includes(stored.lang)) setLang(stored.lang);
    applySettings();
}

export function saveSettings() {
    return Save.saveSettings({ music: settings.music, sfx: settings.sfx, lang: getLang() });
}
