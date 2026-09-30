export const LANG = {
    en: {
        newgame: "NEW GAME",
        load: "LOAD",
        options: "OPTIONS",
        extra: "EXTRA",

        LOAD: "LOAD",

        OPTIONS: "OPTIONS",
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

        back: "BACK",

        reading: "READING MEMORY CARD...",
        noCard: "NO MEMORY CARD",
        noSave: "NO SAVED GAME",
        level: "LEVEL ",
        time: "TIME ",
        best: "BEST ",
        completed: "GAME COMPLETED",
        pressX: "PRESS X",
        paused: "PAUSED",
        resume: "RESUME",
        saveGame: "SAVE GAME",
        quit: "QUIT TO MENU",
        gameSaved: "GAME SAVED",
        restartSave: "RESTART FROM LAST SAVE",
        saveQuit: "SAVE AND QUIT",
        quitNoSave: "QUIT WITHOUT SAVING",
        saveFailed: "COULD NOT SAVE - CHECK THE MEMORY CARD"
    },

    br: {
        newgame: "NOVO JOGO",
        load: "CARREGAR",
        options: "OPÇÕES",
        extra: "EXTRA",

        LOAD: "CARREGAR",

        OPTIONS: "OPÇÕES",
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

        back: "VOLTAR",

        reading: "LENDO O MEMORY CARD...",
        noCard: "SEM MEMORY CARD",
        noSave: "NENHUM JOGO SALVO",
        level: "FASE ",
        time: "TEMPO ",
        best: "MELHOR ",
        completed: "JOGO CONCLUÍDO",
        pressX: "APERTE X",
        paused: "PAUSADO",
        resume: "CONTINUAR",
        saveGame: "SALVAR JOGO",
        quit: "SAIR PARA O MENU",
        gameSaved: "JOGO SALVO",
        restartSave: "REINICIAR DO ÚLTIMO SAVE",
        saveQuit: "SALVAR E SAIR",
        quitNoSave: "SAIR SEM SALVAR",
        saveFailed: "NÃO FOI POSSÍVEL SALVAR - VERIFIQUE O MEMORY CARD"
    },

    sp: {
        newgame: "Nuevo Juego",
        load: "CARGA",
        options: "OPCIONES",
        extra: "EXTRA",

        LOAD: "CARGAR",

        OPTIONS: "OPCIONES",
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

        back: "ATRÁS",

        reading: "LEYENDO LA MEMORY CARD...",
        noCard: "SIN MEMORY CARD",
        noSave: "NO HAY PARTIDA GUARDADA",
        level: "NIVEL ",
        time: "TIEMPO ",
        best: "MEJOR ",
        completed: "JUEGO COMPLETADO",
        pressX: "PULSA X",
        paused: "PAUSA",
        resume: "CONTINUAR",
        saveGame: "GUARDAR PARTIDA",
        quit: "SALIR AL MENÚ",
        gameSaved: "PARTIDA GUARDADA",
        restartSave: "REINICIAR DESDE LA ÚLTIMA PARTIDA",
        saveQuit: "GUARDAR Y SALIR",
        quitNoSave: "SALIR SIN GUARDAR",
        saveFailed: "NO SE PUDO GUARDAR - REVISA LA MEMORY CARD"
    }
};

// Language picked in the options menu, shared with the game scenes.
export const LANGS = ["en", "br", "sp"];
let current = LANGS[0];

export const getLang = () => current;
export const setLang = lang => { current = lang; };
export const t = key => LANG[current][key] || key;

// Every glyph the menus can print, rasterized while the scene loads.
export const GLYPHS = Font.ASCII + [...new Set(Object.values(LANG).flatMap(strings => Object.values(strings).join("")))].join("");
