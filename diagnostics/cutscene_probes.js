import { Cutscene01 } from "../src/scenes/cutscene01.js";
import { scaled } from "../src/shared/lib/ui.js";
import { runScene, checkpoint } from "./runner.js";

class CutsceneAssets extends Scene {
    static root = Cutscene01.root;
    static assets = Cutscene01.assets;

    enter({ images }) {
        this.images = images;
        this.scrollSize = scaled(images.scroll, 2);
        this.maskSize = scaled(images.mask, 2);
    }

    draw() {
        this.images.scroll.draw(48, 300, this.scrollSize);
        this.images.mask.draw(48, 0, this.maskSize);
    }
}

class CutsceneChunk extends CutsceneAssets {
    async enter(assets) {
        super.enter(assets);
        const frames = {};
        for (let i = 0; i < 6; i++) frames[`f${i}`] = `images/cutscenes/c01/${i}.png`;
        checkpoint("before acquire frames 0-5");
        this.chunk = this.acquire({ images: frames });
        checkpoint("after acquire frames 0-5; waiting");
        await this.chunk.ready;
        checkpoint("frames 0-5 ready");
        this.frame = this.chunk.assets.images.f0;
        this.frameSize = scaled(this.frame, 2);
    }

    draw() {
        super.draw();
        this.frame.draw(48, 16, this.frameSize);
    }
}

class CutsceneTraced extends Cutscene01 {
    _load(chunk) {
        checkpoint(`before Cutscene01._load(${chunk})`);
        super._load(chunk);
        checkpoint(`after Cutscene01._load(${chunk})`);
    }
}

export function runCutscene(kind) {
    switch (kind) {
        case "assets": runScene("07-cutscene-assets", CutsceneAssets, { seconds: 30 }); break;
        case "chunk": runScene("08-cutscene-chunk", CutsceneChunk, { seconds: 45 }); break;
        case "full": runScene("09-cutscene-full", CutsceneTraced, { seconds: 75 }); break;
        default: throw new Error(`Unknown cutscene probe: ${kind}`);
    }
}
