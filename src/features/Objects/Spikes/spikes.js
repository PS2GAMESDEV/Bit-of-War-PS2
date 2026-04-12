import Assets from "../../../shared/lib/assets.js";
import { ASSETS_PATH, GAME_SCALE } from "../../../shared/lib/constants.js";

function Spikes(options) {
    this.position = { x: options.x, y: options.y }

    this.scale = GAME_SCALE;
    this.sprite = Assets.image(ASSETS_PATH.OBJECTS + "/spriteSpikes.png")

    this._initSprite();
}

Spikes.prototype._initSprite = function () {
    this.sprite.startx = 0;
    this.sprite.endx = 16;
    this.sprite.starty = 0;
    this.sprite.endy = 16;

    this.sprite.width = 16 * this.scale;
    this.sprite.height = 16 * this.scale;
}

Spikes.prototype.draw = function (cameraX, cameraY) {
    this.sprite.draw(this.position.x - (cameraX || 0), this.position.y - (cameraY || 0));
}

Spikes.prototype.update = function(cameraX, cameraY, context = {}) {
    this.draw(cameraX, cameraY);
}

Spikes.prototype.destroy = function () {
    Assets.free(ASSETS_PATH.OBJECTS + "/spriteSpikes.png");
    this.sprite = null;
}

export default Spikes;