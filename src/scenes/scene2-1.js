import { scaled } from "../shared/lib/ui.js";
import Game from "./Game.js";

const FRAME_COUNT_1 = 10;
const FRAME_COUNT_2 = 101;
const CHUNK = 6;
const FRAME_TIME = 30;
const FRAME_RATE_1 = 300;
const FRAME_RATE_2 = 180;
const FAST_FRAME_RATE = 360;
const SCROLL_SPEED = 24;
const FAST_SCROLL_SPEED = 110;
const SCROLL_END = 1350;

export class Scene03 extends Scene {
    static root = "assets";

    static assets = {
        images: {
            scroll: "images/cutscenes/texts/EN/text2-1.png",
            mask: "images/cutscenes/bg.png"
        },

        music: {
            level1: "sounds/music/level1.ogg"
        }
    };

    async enter({ images, music }) {
        this.images = images;

        this.scrollSize = scaled(images.scroll, 2);
        this.maskSize = scaled(images.mask, 2);

        this.chunks1 = [];
        this.chunks2 = [];

        this.sizes1 = [];
        this.sizes2 = [];

        this.animation = 1;

        this.frameIndex = 0;
        this.frameTimer = 0;

        this.scrollY = 432;
        this.waitTimer = 0;
        this.ending = false;

        this._loadChunk(this.chunks1, 0, FRAME_COUNT_1, "2-1/01");
        this._loadChunk(this.chunks1, 1, FRAME_COUNT_1, "2-1/01");

        this._loadChunk(this.chunks2, 0, FRAME_COUNT_2, "2-1/02");
        this._loadChunk(this.chunks2, 1, FRAME_COUNT_2, "2-1/02");

        Scene.preload(Game);

        await this.chunks1[0].ready;
        await this.chunks2[0].ready;

        music.level1.play();
    }

    exit() {
        this.assets.music.level1.stop();
    }

    update(dt) {
        this.fast = Gamepad.player(0).pressed(Gamepad.CROSS);

        this.scrollY -= (this.fast ? FAST_SCROLL_SPEED : SCROLL_SPEED) * dt;

        this.frameTimer += (this.fast ? FAST_FRAME_RATE
        : this.animation === 1 ? FRAME_RATE_1 : FRAME_RATE_2) * dt;


        if (this.frameTimer >= FRAME_TIME) {
            
            this.frameTimer = 0;

            if (this.animation === 1) {
                const nextFrame = (this.frameIndex + 1) % FRAME_COUNT_1;

                const chunk = (nextFrame / CHUNK) | 0;

                this._loadChunk(this.chunks1, chunk, FRAME_COUNT_1, "2-1/01");

                if (this._frame(this.chunks1, nextFrame, this.sizes1)) {
                    this.frameIndex = nextFrame;
                }
                
        } else {
            const nextFrame = this.frameIndex + 1;

            if (nextFrame < FRAME_COUNT_2) {
                const chunk = (nextFrame / CHUNK) | 0;

                    this._loadChunk(
                        this.chunks2,
                        chunk,
                        FRAME_COUNT_2,
                        "2-1/02"
                    );

                    this._loadChunk(
                        this.chunks2,
                        chunk + 1,
                        FRAME_COUNT_2,
                        "2-1/02"
                    );

                    if (this._frame(this.chunks2, nextFrame, this.sizes2)) {
                        this.frameIndex = nextFrame;
                    }

                }
            }
        }

        if (this.animation === 1 && this.scrollY <= -130) {
            const frame = this._frame(this.chunks2, 0, this.sizes2);

            if (frame) {
                this.animation = 2;
                this.frameIndex = 0;
                this.frameTimer = 0;
                this.waitTimer = 0;
            }
        }

        if (this.scrollY <= -SCROLL_END && !Scene.busy) {
            Scene.pop();
        }

    }

    draw() {
        const { images } = this;
        
        images.scroll.draw(48, this.scrollY, this.scrollSize);
        images.mask.draw(0, 0, this.maskSize);

        let frame;
        let size;

        if (this.animation === 1) {

            frame = this._frame(
                this.chunks1,
                this.frameIndex,
                this.sizes1
            );

            size = this.sizes1[this.frameIndex];

        } else {

            frame = this._frame(
                this.chunks2,
                this.frameIndex,
                this.sizes2
            );

            size = this.sizes2[this.frameIndex];

        }

        if (frame) {
            frame.draw(48, 16, size);
        }

    }

    _loadChunk(chunks, chunk, frameCount, folder) {
        if (chunk * CHUNK >= frameCount || chunks[chunk] !== undefined) {
            return;
        }

        const frames = {};
        const start = chunk * CHUNK;

        const end = Math.min((chunk + 1) * CHUNK, frameCount);

        for (let i = start; i < end; i++) {
            frames[`f${i}`] = `images/cutscenes/${folder}/${i}.png`;
        }

        chunks[chunk] = this.acquire({images: frames});

    }

    _frame(chunks, index, sizes) {
        const chunk = chunks[(index / CHUNK) | 0];

        if (!chunk || !chunk.done) {
            return null;
        }

        const image = chunk.assets.images[`f${index}`];

        if (!image) {
            return null;
        }

        sizes[index] ??= scaled(image, 2);

        return image;
    }
}