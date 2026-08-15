import { animationSprite } from "../../../shared/lib/animation.js";
import Assets from "../../../shared/lib/assets.js";
import { ASSETS_PATH, GAME_SCALE } from "../../../shared/config/constants.js";

function Torch(options) {
    this.position = { x: options.x, y: options.y }

    this.scale = GAME_SCALE;
    this.spritesheet = Assets.image(ASSETS_PATH.OBJECTS + "/spriteTorch.png")

    this._initAnimations();
}

Torch.prototype._initAnimations = function () {
    this.spritesheet.startx = 0;
    this.spritesheet.endx = 16;
    this.spritesheet.starty = 0;
    this.spritesheet.endy = 16;

    this.spritesheet.framesPerRow = 6;
    this.spritesheet.totalFrames = 6;
    this.spritesheet.frameWidth = 16;
    this.spritesheet.frameHeight = 16;
    this.spritesheet.fps = 12;
    this.spritesheet.loop = true;

    this.spritesheet.scale = this.scale;
}

Torch.prototype.draw = function (cameraX, cameraY, deltatime) {
    this.spritesheet.deltatime = deltatime;
    animationSprite(this.spritesheet)
    this.spritesheet.draw(this.position.x - (cameraX || 0), this.position.y - (cameraY || 0));
}

Torch.prototype.update = function(cameraX, cameraY, context = {}) {
    const {deltatime} = context;
    this.draw(cameraX, cameraY, deltatime);
}

Torch.prototype.destroy = function () {
    Assets.free(ASSETS_PATH.OBJECTS + "/spriteTorch.png");
    this.spritesheet = null;
}

export default Torch;