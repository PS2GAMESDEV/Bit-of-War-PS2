import { scaled } from "../shared/lib/ui.js";

const FRAME_COUNT = 12;
const LAST = FRAME_COUNT - 1;
const FRAME_TIME = 12 / 60;
const ARROW_BLINK = 20 / 60;

const frameImages = {};
for (let i = 0; i < FRAME_COUNT; i++) frameImages[`f${i}`] = `images/cutscenes/c02/${i}.png`;

// Frames 4-7 wait for CROSS; the others advance by themselves.
const waitsForInput = frame => frame >= 4 && frame <= 7;

export class Cutscene02 extends Scene {
    static root = "assets";

    static assets = {
        images: { arrow: "images/ui/arrow.png", ...frameImages },
        sfx: { selector: "sounds/sfx/selector.adp" }
    };

    enter({ images }) {
        this.frames = Array.from({ length: FRAME_COUNT }, (_, i) => images[`f${i}`]);
        this.frameSizes = this.frames.map(frame => scaled(frame, 2));
        this.arrowSize = scaled(images.arrow, 1.5);

        this.current = 0;
        this.timer = 0;
        this.arrowTimer = 0;
        this.showArrow = true;
        this.done = false;
    }

    update(dt) {
        if (this.done) return;

        this.timer += dt;
        if (this.timer >= FRAME_TIME) {
            this.timer = 0;
            if (this.current < 4 || (this.current > 7 && this.current < LAST)) this.current++;
        }

        if (waitsForInput(this.current) && Gamepad.player(0).justPressed(Gamepad.CROSS)) {
            if (this.current < 7) this.assets.sfx.selector.play();
            this.current++;
        }

        this.arrowTimer += dt;
        if (this.arrowTimer >= ARROW_BLINK) {
            this.arrowTimer = 0;
            this.showArrow = !this.showArrow;
        }

        if (this.current === LAST) {
            this.done = true;
            Scene.pop();
        }
    }

    draw() {
        this.frames[this.current].draw(48, 16, this.frameSizes[this.current]);

        if (this.showArrow && waitsForInput(this.current)) this.assets.images.arrow.draw(562, 419, this.arrowSize);
    }
}
