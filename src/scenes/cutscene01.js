import { scaled } from "../shared/lib/ui.js";
import Game from "./Game.js";

const FRAME_COUNT = 51;
const CHUNK = 6;
const FRAME_TIME = 30;
const FRAME_RATE = 60;
const FAST_FRAME_RATE = 360;
const SCROLL_SPEED = 30;
const FAST_SCROLL_SPEED = 120;
const SCROLL_END = -672;
const END_WAIT = 3;

export class Cutscene01 extends Scene {
    static root = "assets";

    static assets = {
        images: {
            scroll: "images/cutscenes/c01/text01.png",
            end: "images/cutscenes/c01/text02.png",
            mask: "images/cutscenes/black.png",
            arrow: "images/ui/arrow.png"
        },
        music: { level1: "sounds/music/level1.ogg" }
    };

    // The 51 frames are streamed in chunks: the one on screen and the next
    // are resident, the ones already shown are released.
    async enter({ images, music }) {
        this.images = images;
        this.scrollSize = scaled(images.scroll, 2);
        this.endSize = scaled(images.end, 2);
        this.maskSize = scaled(images.mask, 2);
        this.arrowSize = scaled(images.arrow, 1.5);

        this.chunks = [];
        this.sizes = [];
        this.frameIndex = 0;
        this.frameTimer = 0;
        this.scrollY = 448;
        this.waitTimer = 0;
        this.fast = false;
        this.ending = false;

        this._load(0);
        this._load(1);
        Scene.preload(Game);
        await this.chunks[0].ready;

        music.level1.play();
    }

    exit() {
        this.assets.music.level1.stop();
    }

    update(dt) {
        this.fast = Gamepad.player(0).pressed(Gamepad.CROSS);

        this.scrollY -= (this.fast ? FAST_SCROLL_SPEED : SCROLL_SPEED) * dt;
        this.frameTimer += (this.fast ? FAST_FRAME_RATE : FRAME_RATE) * dt;

        // Waits (keeping the timer) while the next frame is still loading.
        if (this.frameTimer >= FRAME_TIME && this.frameIndex < FRAME_COUNT - 1 && this._frame(this.frameIndex + 1)) {
            this.frameTimer = 0;
            this._advance();
        }

        if (this.scrollY <= SCROLL_END) this.ending = true;

        if (this.ending) {
            this.waitTimer += dt;
            if (this.waitTimer >= END_WAIT && !Scene.busy) Scene.go(Game);
        }
    }

    draw() {
        const { images } = this;

        images.scroll.draw(48, this.scrollY, this.scrollSize);
        images.mask.draw(48, 0, this.maskSize);

        if (this.ending) {
            images.end.draw(48, 16, this.endSize);
        } else {
            const frame = this._frame(this.frameIndex);
            if (frame) frame.draw(48, 16, this.sizes[this.frameIndex]);
        }

        if (this.fast) images.arrow.draw(640 - 48, 448 - 32, this.arrowSize);
    }

    _load(chunk) {
        if (chunk * CHUNK >= FRAME_COUNT || this.chunks[chunk] !== undefined) return;

        const frames = {};
        const end = Math.min((chunk + 1) * CHUNK, FRAME_COUNT);
        for (let i = chunk * CHUNK; i < end; i++) frames[`f${i}`] = `images/cutscenes/c01/${i}.png`;

        this.chunks[chunk] = this.acquire({ images: frames });
    }

    // The frame's Image once its chunk has loaded, else null.
    _frame(index) {
        const group = this.chunks[(index / CHUNK) | 0];
        if (!group || !group.done) return null;

        const image = group.assets.images[`f${index}`];
        this.sizes[index] ??= scaled(image, 2);
        return image;
    }

    _advance() {
        this.frameIndex++;
        if (this.frameIndex % CHUNK !== 0) return;

        const chunk = this.frameIndex / CHUNK;
        this.chunks[chunk - 1].release();
        this.chunks[chunk - 1] = null;
        this._load(chunk + 1);
    }
}
