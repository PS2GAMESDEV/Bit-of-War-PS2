import { Menu } from "./src/scenes/menu.js";
import { SCREEN_HEIGHT, SCREEN_WIDTH } from "./src/shared/lib/constants.js";
import { log, status, bootPath } from "./src/shared/lib/boot_log.js";

log("---- main.js start");

Screen.setParam(Screen.DEPTH_TEST_ENABLE, false);

// The pad is polled once per frame, before any scene updates.
Loop.addSystem({
    name: "gamepad",
    priority: -100,
    preUpdate() {
        Gamepad.update();
    }
});

// Loading screen: dark background and Kratos spinning his blades.
const spinner = new Sprite.Instance(
    Sprite.Sheet.fromGrid(new Image("assets/images/sprites/kratos/kratos_spin_atk.png"), {
        frameWidth: 80,
        frameHeight: 16,
        clips: { spin: { frames: "0-3", fps: 10 } }
    }),
    { clip: "spin", scale: 2, x: 460, y: 400, realTime: true }
);
const background = Color.new(8, 8, 8);

// Diagnostic text (embedded font): where the log goes and whether it worked.
const diagFont = new Font();
diagFont.color = Color.new(200, 200, 200);

let lastLoaded = -1;
Scene.loadingScreen = (progress, { loaded, total }) => {
    if (loaded !== lastLoaded) {
        lastLoaded = loaded;
        log(`loading ${loaded}/${total}`);
    }
    Draw.rect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT, background);
    spinner.draw();
    diagFont.print(10, 10, `boot: ${bootPath}   loaded ${loaded}/${total}`);
    status.forEach((s, i) => diagFont.print(10, 30 + i * 20,
        `${s.path}: ${s.ok === null ? "-" : s.ok ? "OK" : "FAIL " + s.error}`));
};

// Fixed 60 Hz step, one per frame at most: like the original, a slow frame
// slows the game down instead of running several updates (which would repeat
// the pad's justPressed edges).
log("before Scene.run");
Scene.run(Menu, {}, { fixedStep: 1 / 60, maxSteps: 1 });
log("after Scene.run");
