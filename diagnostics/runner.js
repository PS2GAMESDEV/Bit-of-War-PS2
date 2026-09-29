// A case writes checkpoints to disk so the last completed operation survives
// a hardware hang, even when std.reload() cannot return to the launcher.
const base = System.bootPath.endsWith("/") ? System.bootPath : `${System.bootPath}/`;
const fileName = `${base}diagnostics.log`;
let currentCase = "startup";

export function checkpoint(message) {
    const line = `[${currentCase}] ${message}`;
    console.log(line);
    try {
        const file = std.open(fileName, "a");
        if (file) {
            file.puts(`${line}\n`);
            file.close();
        }
    } catch (_) {
        // Logging must not alter the behavior being measured.
    }
}

function spinner() {
    return new Sprite.Instance(
        Sprite.Sheet.fromGrid(new Image("assets/images/sprites/kratos/kratos_spin_atk.png"), {
            frameWidth: 80,
            frameHeight: 16,
            clips: { spin: { frames: "0-3", fps: 10 } }
        }),
        { clip: "spin", scale: 2, x: 460, y: 400, realTime: true }
    );
}

export function runScene(name, SceneClass, { seconds = 15, loadingSpinner = true } = {}) {
    currentCase = name;
    checkpoint("START");
    Screen.setParam(Screen.DEPTH_TEST_ENABLE, false);

    let entered = false;
    let draws = 0;
    let confirmed = 0;
    let elapsed = 0;
    let frames = 0;
    let failed = false;
    let lastLoaded = -1;
    let loadingFrames = 0;
    const spin = loadingSpinner ? spinner() : null;
    const background = Color.new(8, 8, 8);

    Scene.loadTimeout = Math.max(30, seconds);
    Scene.onError = error => {
        failed = true;
        checkpoint(`[FAIL] Scene.onError ${String(error)}`);
        Loop.stop();
    };
    Scene.loadingScreen = (progress, { loaded, total }) => {
        loadingFrames++;
        if (loaded !== lastLoaded || loadingFrames % 120 === 0) {
            lastLoaded = loaded;
            checkpoint(`loading ${loaded}/${total}, frame ${loadingFrames}`);
        }
        if (loadingFrames <= 3) checkpoint(`loading draw ${loadingFrames} begin`);
        Draw.rect(0, 0, 640, 448, background);
        if (spin) spin.draw();
        if (loadingFrames <= 3) checkpoint(`loading draw ${loadingFrames} end`);
    };

    class Traced extends SceneClass {
        enter(...args) {
            checkpoint("enter begin");
            try {
                const value = super.enter(...args);
                if (value && typeof value.then === "function") {
                    return value.then(result => {
                        entered = true;
                        checkpoint("enter end");
                        return result;
                    }, error => {
                        checkpoint(`[FAIL] enter ${String(error)}`);
                        throw error;
                    });
                }
                entered = true;
                checkpoint("enter end");
                return value;
            } catch (error) {
                checkpoint(`[FAIL] enter ${String(error)}`);
                throw error;
            }
        }

        draw(...args) {
            draws++;
            if (draws <= 3 || draws % 120 === 0) checkpoint(`draw ${draws} begin`);
            try {
                const value = super.draw(...args);
                if (draws <= 3) checkpoint(`draw ${draws} end`);
                return value;
            } catch (error) {
                checkpoint(`[FAIL] draw ${draws}: ${String(error)}`);
                throw error;
            }
        }
    }

    Loop.addSystem({
        name: "diag.pad",
        priority: -100,
        preUpdate() { Gamepad.update(); }
    });
    Loop.addSystem({
        name: "diag.watchdog",
        priority: -250,
        realTime: true,
        preUpdate(dt) {
            elapsed += dt;
            frames++;
            if (draws > confirmed) {
                confirmed = draws;
                if (confirmed <= 3 || confirmed % 120 === 0)
                    checkpoint(`draw ${confirmed} returned through next frame`);
            }
            if (frames <= 3 || frames % 120 === 0)
                checkpoint(`loop ${frames}: entered=${entered} busy=${Scene.busy} draws=${draws}`);
            if (elapsed >= seconds) {
                checkpoint(failed ? "[FAIL] scene error" : entered && confirmed >= 2 ?
                    `[PASS] ${confirmed} rendered frames` :
                    `[TIMEOUT] entered=${entered} busy=${Scene.busy} draws=${draws}`);
                Loop.stop();
            }
        }
    });

    checkpoint("before Scene.run");
    const first = Scene.run(Traced, {}, { fixedStep: 1 / 60, maxSteps: 1 });
    first.then(() => checkpoint("Scene.go resolved"), error => {
        failed = true;
        checkpoint(`[FAIL] Scene.go ${String(error)}`);
        Loop.stop();
    });
    checkpoint("after Scene.run");
}
