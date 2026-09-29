import { Menu } from "./src/scenes/menu.js";
import { SCREEN_HEIGHT, SCREEN_WIDTH } from "./src/shared/lib/constants.js";
import { log } from "./src/shared/lib/boot_log.js";

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

let lastLoaded = -1;
let loadingFrames = 0;
Scene.loadingScreen = (progress, { loaded, total }) => {
    loadingFrames++;
    if (loaded !== lastLoaded) {
        lastLoaded = loaded;
        log(`loading ${loaded}/${total} (frame ${loadingFrames})`);
    } else if (loadingFrames % 60 === 0) {
        // Heartbeat: still alive, still waiting. It stops if the main thread hangs.
        log(`  loading ${loaded}/${total} still waiting (frame ${loadingFrames})`);
    }
    log_step("draw begin", loadingFrames);
    Draw.rect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT, background);
    spinner.draw();
    log_step("draw end", loadingFrames);
};

// First frames only: tells a hang inside the draw from one outside it.
function log_step(what, frame) {
    if (frame <= 3) log(`  loadingScreen #${frame} ${what}`);
}

// Fixed 60 Hz step, one per frame at most: like the original, a slow frame
// slows the game down instead of running several updates (which would repeat
// the pad's justPressed edges).
log("before Scene.run");
Scene.run(Menu, {}, { fixedStep: 1 / 60, maxSteps: 1 });
log("after Scene.run");
