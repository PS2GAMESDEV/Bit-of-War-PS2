# Bit-of-War-PS2

Port para PS2 (AthenaEnv) de **Bit of War 1.10**, da Holmade Games.

## Menu

Como no original: **New Game**, **Load** (Continue), **Gauntlet** (Boss Rush) e,
no lugar de "Exit", **Options** (volumes, idioma, controles e créditos).

- **Gauntlet** usa as armas já conquistadas na campanha, uma única vida e grava o
  melhor tempo no Memory Card.
- **Seletor de fases escondido** (o original usa D + J no teclado): segure **L1** e
  aperte **R1** no menu principal. Escolha um dos quatro mundos ou alterne
  "Weapons - Normal/Unlock All".

Para depuração existe o seletor com todas as fases: defina `TEMP_LEVEL_SELECT = true`
em `src/scenes/menu.js`. Nesse modo nada é gravado no Memory Card.

## Ferramentas (`tools/`)

- `build-maps.js` compila `maps-src/*.json` em `src/data`.
- `gml-room-to-map.mjs` converte uma sala extraída do executável original em `maps-src`.
- `gml-path-to-js.mjs` expande os caminhos (paths) do original.
- `tests/*.test.mjs`: `node tools/tests/<arquivo>.test.mjs`.

A extração do executável (`references/shadow-kratos/extraction`) usa o crate `gm8exe` do OpenGMK.
