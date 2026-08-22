import { setMusic, setSfx, settings } from "../../../shared/config/settings.js";
import { cycleLang, t } from "../../../shared/lang/lang.js";
import { clamp } from "../../../shared/lib/normalizer.js";
import { MenuFlowScene } from "./scene.js";
import GameScene from "../Game/scene.js";

export default class MenuFlow extends MenuFlowScene {
    static assetRoot = "assets";

    manifest() {
        return {
            images: [
                { path: "images/ui/main.png", scale: 2 },
                { path: "images/ui/logo.png", scale: 2 },
            ],
            sounds: [
                "sounds/music/menu.wav",
                "sounds/sfx/selected.adp",
                "sounds/sfx/selector.adp",
            ],
            fonts: ["font/font.ttf"],
        };
    }

    getPanels() {
        return {
            main: {
                getOptions: (scene) => [
                    { key: "newgame", action: () => scene.manager.goto(GameScene)  },
                    { key: "load", action: () => { /**Carregar jogo */ } },
                    { key: "options", action: () => scene.goToPanel("options") },
                    { key: "extra", action: () => scene.goToPanel("extras") },
                ],
                draw: (scene) => {
                    scene.bg.draw(48, 16);
                    scene.drawOptions(244);
                },
            },
            options: {
                getOptions: (scene) => [
                    {
                        key: "music",
                        customText: () => settings.music,
                        onAdjust: (dir) => setMusic(clamp(settings.music + dir, 0, 10))
                    },
                    {
                        key: "sfx",
                        customText: () => settings.sfx,
                        onAdjust: (dir) => {
                            setSfx(clamp(settings.sfx + dir, 0, 10));
                            scene.selectorSFX.volume = settings.sfx * 10;
                            scene.confirmSFX.volume = settings.sfx * 10;
                        },
                    },
                    { key: "controller", action: () => scene.goToPanel("controls") },
                    {
                        key: "language",
                        onAdjust: (dir) => cycleLang(dir),
                    },
                    { key: "back", action: () => scene.goToPanel("main") },
                ],
                draw: (scene) => scene.drawTitledPanel("options"),
            },
            controls: {
                getOptions: (scene) => [
                    { key: "back", action: () => scene.goToPanel("options") }
                ],
                draw: (scene) => scene.drawTitledPanel("controller"),
            },
            extras: {
                getOptions: (scene) => [
                    { key: "gauntlet" },
                    { key: "challenges", action: () => scene.goToPanel("challenges") },
                    { key: "credits", action: () => scene.goToPanel("credits") },
                    { key: "back", action: () => scene.goToPanel("main") },
                ],
                draw: (scene) => scene.drawTitledPanel("extra"),
            },
            challenges: {
                getOptions: (scene) => [
                    { key: "back", action: () => scene.goToPanel("extras") },
                ],
                draw: (scene) => scene.drawTitledPanel("extra"),
            },
            credits: {
                getOptions: (scene) => [
                    { key: "back", action: () => scene.goToPanel("extras") },
                ],
                draw(scene) {
                    scene.bgLogo.draw(0, 0);
                    scene._drawText(0, 200, "PROGRAMMING", scene.red, 0.8);
                    scene._drawText(0, 225, "GIBRAN KHALIL", scene.white);
                    scene._drawText(0, 245, "EDUARDO SOUSA", scene.white);
                    scene._drawText(0, 265, "DEV NOOB", scene.white);
                    scene._drawText(0, 305, "ORIGINALLY CREATED BY", scene.red, 0.7);
                    scene._drawText(0, 330, "HOLMODE GAMES", scene.white);

                    scene.drawOptions(370);
                }
            }
        };
    }

    onEnter(assets) {
        super.onEnter(assets);
        this.musicMenu = assets.sounds["sounds/music/menu.wav"];
        this.musicMenu.loop = true;
        this.musicMenu.play();
        this.bg = assets.images["images/ui/main.png"];
        this.bgLogo = assets.images["images/ui/logo.png"];
    }

    onExit() {
        this.musicMenu.pause();
    }
}