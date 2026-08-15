export let currentLang = "en";
export const LANGS = ["en", "br", "sp"]

export const LANG = {
    en: {
        newgame: "NEW GAME",
        load: "LOAD",
        options: "OPTIONS",
        extra: "EXTRA",

        music: "MUSIC: ",
        sfx: "SFX: ",
        controller: "CONTROLLER",
        language: "ENGLISH",
        vibration: "VIBRATION: ",
        on: "ON",
        off: "OFF",

        gauntlet: "GAUNTLET",
        challenges: "CHALLENGES",
        credits: "CREDITS",

        back: "BACK"
    },

    br: {
        newgame: "NOVO JOGO",
        load: "CARREGAR",
        options: "OPÇÕES",
        extra: "EXTRA",

        music: "MÚSICA: ",
        sfx: "EFEITOS: ",
        controller: "CONTROLES",
        language: "PORTUGUÊS",
        vibration: "VIBRAÇÃO: ",
        on: "LIG.",
        off: "DES.",

        gauntlet: "GAUNTLET",
        challenges: "DESAFIOS",
        credits: "CRÉDITOS",

        back: "VOLTAR"
    },

    sp: {
        newgame: "Nuevo Juego",
        load: "CARGA",
        options: "OPCIONES",
        extra: "EXTRA",

        music: "MÚSICA: ",
        sfx: "EFECTOS: ",
        controller: "CONTROLES",
        language: "Español",
        vibration: "VIBRACIÓN: ",
        on: "SÍ ",
        off: "NO",

        gauntlet: "GAUNTLET",
        challenges: "DESAFÍOS",
        credits: "CRÉDITOS",

        back: "ATRÁS"
    }
};

export function t(key) {
    return LANG[currentLang][key] || key;
};

export function setLang(lang) {
    if (LANGS.includes(lang)) {
        currentLang = lang;
    }
}

export function cycleLang(direction) {
    const idx = LANGS.indexOf(currentLang);
    const total = LANGS.length;
    const nextIdx = (idx + direction + total) % total;
    currentLang = LANGS[nextIdx];
}
