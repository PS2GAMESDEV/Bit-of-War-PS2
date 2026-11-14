# Bit-of-War-PS2

Port para PS2 (AthenaEnv) de **Bit of War 1.10**, da Holmade Games.

## Execução pelo USB no PS2

Copie `athena.elf`, `athena.ini`, `main.js`, `src/` e `assets/` para a mesma
pasta do pendrive. Pelo uLaunchELF, abra `athena.elf` nessa pasta em `mass:`.
Para atualizar uma instalação anterior, substitua `athena.elf`, `athena.ini`,
`main.js`, `src/` e `assets/` pelos arquivos do pacote atualizado.

O ELF inclui os drivers USB `usbd`, `bdm`, `bdmfs_fatfs` e `usbmass_bd`.
Eles são necessários porque o Athena reinicia o IOP durante o boot;
os drivers carregados pelo uLaunchELF deixam de estar disponíveis.
Também inclui o módulo `cdrom`, com o driver CDFS para leitura de CD/DVD.
Os módulos `usbmass` e `cdrom` devem ser mantidos nas recompilações, mesmo
que o jogo funcione por `host:` no PCSX2. A configuração está em
`athena-build.json`.

O boot por `mass:/BOW/athena.elf` foi validado no PCSX2 com wLaunchELF e USB
FAT32 virtual, até o menu e a primeira fase. A validação no PS2 físico
depende de executar o ELF atualizado no console.

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

A regressão das otimizações pode ser executada com
`node tests/performance.test.mjs`. Ela verifica a cobertura e a ordem dos tiles
nos 28 mapas, compara as decisões das patrulhas com a lógica anterior e valida
a ordem e a duração dos efeitos, a remoção de flechas e a trajetória do martelo.
As contagens de desenho reportadas medem trabalho enviado ao renderizador;
a [validação no PCSX2 Flatpak](validation/performance/REPORT.md), em 14/11/2026,
registrou 10% a 19% menos tempo de CPU nos quatro cenários comparados, com ambas
as versões a aproximadamente 59,94 FPS. O relatório inclui logs, estados
comparados e 13 capturas internas pelo F8. O PS2 físico ainda não foi medido.

A extração do executável (`references/shadow-kratos/extraction`) usa o crate `gm8exe` do OpenGMK.
