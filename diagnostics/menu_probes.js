import { LANG, GLYPHS } from "../src/shared/lang/lang.js";
import { centeredX, scaled } from "../src/shared/lib/ui.js";
import { Menu } from "../src/scenes/menu.js";
import { runScene, checkpoint } from "./runner.js";

const RED = Color.new(255, 0, 0);
const WHITE = Color.new(255, 255, 255);
const LABELS = [LANG.en.newgame, LANG.en.load, LANG.en.options, LANG.en.extra];

function menuProbe({ image = false, text = false, music = false, lock = false } = {}) {
    return class MenuProbe extends Scene {
        static root = "assets";
        static assets = {
            images: image ? { main: lock ? { path: "images/ui/main.png", upload: "lock" } : "images/ui/main.png" } : {},
            fonts: text ? { text: { path: "font/font.ttf", size: 18, preload: GLYPHS } } : {},
            music: music ? { menu: { path: "sounds/music/menu.wav", loop: true } } : {}
        };

        enter(assets) {
            this.assets = assets;
            if (image) this.mainSize = scaled(assets.images.main, 2);
            if (music) {
                checkpoint("before music.play");
                assets.music.menu.play();
                checkpoint("after music.play");
            }
        }

        exit() {
            if (music) this.assets.music.menu.stop();
        }

        draw() {
            if (image) this.assets.images.main.draw(48, 16, this.mainSize);
            if (text) {
                const font = this.assets.fonts.text;
                for (let i = 0; i < LABELS.length; i++) {
                    const label = LABELS[i];
                    font.color = i === 0 ? RED : WHITE;
                    font.print(centeredX(font, label), 244 + i * 20, label);
                }
            }
        }
    };
}

export function runMenu(kind) {
    switch (kind) {
        case "spinner": {
            class LoadingProbe extends Scene {
                static root = "assets";
                static assets = { images: { spin: "images/sprites/kratos/kratos_spin_atk.png" } };
                enter({ images }) {
                    this.sprite = new Sprite.Instance(Sprite.Sheet.fromGrid(images.spin, {
                        frameWidth: 80, frameHeight: 16,
                        clips: { spin: { frames: "0-3", fps: 10 } }
                    }), { clip: "spin", scale: 2, x: 460, y: 400, realTime: true });
                }
                draw() {
                    Draw.rect(0, 0, 640, 448, Color.new(8, 8, 8));
                    this.sprite.draw();
                }
            }
            runScene("00-spinner", LoadingProbe, { loadingSpinner: false, seconds: 8 });
            break;
        }
        case "image": runScene("01-menu-image", menuProbe({ image: true })); break;
        case "text": runScene("02-menu-text", menuProbe({ text: true })); break;
        case "image-text": runScene("03-menu-image-text", menuProbe({ image: true, text: true })); break;
        case "image-text-lock": runScene("04-menu-image-text-lock", menuProbe({ image: true, text: true, lock: true })); break;
        case "image-text-music": runScene("05-menu-image-text-music", menuProbe({ image: true, text: true, music: true })); break;
        case "full": runScene("06-menu-full", Menu, { seconds: 25 }); break;
        default: throw new Error(`Unknown menu probe: ${kind}`);
    }
}
