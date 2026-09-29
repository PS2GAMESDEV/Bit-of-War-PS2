import Game from "../src/scenes/Game.js";
import { Level } from "../src/features/Map/level.js";
import { Player } from "../src/features/Player/player.js";
import { LAYER, PLAYER_MOVEMENT as MOVE } from "../src/shared/lib/constants.js";
import { runScene, checkpoint } from "./runner.js";

class GameAssets extends Scene {
    static root = Game.root;
    static assets = Game.assets;
    enter() { checkpoint("all Game assets ready"); }
    draw() { Draw.rect(48, 48, 320, 240, Color.new(40, 100, 80)); }
}

class MapProbe extends Scene {
    static root = Game.root;
    static assets = { sheets: Game.assets.sheets };

    async enter({ sheets }) {
        this.sheets = sheets;
        this.world = new Collision.World({ gravity: { x: 0, y: MOVE.GRAVITY }, autoStep: false });
        this.camera = new Camera2D.Camera({ current: true });
        checkpoint("before GaiaArm.json read");
        const text = await Thread.readFileAsync("./src/data/GaiaArm.json", { text: true });
        checkpoint("after GaiaArm.json read; before Level constructor");
        this.level = new Level(JSON.parse(text), sheets, this.world);
        checkpoint(`Level ready: ${this.level.width}x${this.level.height}`);
        this.camera.setBounds(0, 0, this.level.width, this.level.height);
    }

    draw() { this.level.render(this.camera); }
    exit() { Camera2D.main.makeCurrent(); }
}

class PlayerProbe extends Scene {
    static root = Game.root;
    static assets = {
        sheets: { kratos: Game.assets.sheets.kratos, blade: Game.assets.sheets.blade },
        sfx: { jump: Game.assets.sfx.jump, blades: Game.assets.sfx.blades }
    };

    enter(assets) {
        this.world = new Collision.World({ gravity: { x: 0, y: MOVE.GRAVITY }, autoStep: false });
        this.world.add({ x: 0, y: 400, w: 640, h: 48, layer: LAYER.SOLID });
        this.player = new Player(assets);
        this.player.attach(this.world, 320, 300);
        checkpoint("Player attached to test floor");
    }

    update(dt) { this.player.update(dt, Gamepad.player(0)); }
    draw() { this.player.draw(); }
}

export function runGame(kind) {
    switch (kind) {
        case "assets": runScene("10-game-assets", GameAssets, { seconds: 60 }); break;
        case "map": runScene("11-map", MapProbe, { seconds: 60 }); break;
        case "player": runScene("12-player", PlayerProbe, { seconds: 30 }); break;
        case "full": runScene("13-game-full", Game, { seconds: 75 }); break;
        default: throw new Error(`Unknown game probe: ${kind}`);
    }
}
