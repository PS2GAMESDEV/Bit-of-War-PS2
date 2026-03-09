import { animationSprite, setAnimation } from "../../../shared/lib/animation.js";
import Assets from "../../../shared/lib/assets.js";
import { ASSETS_PATH, ENEMIES_ANIMATIONS, GAME_SCALE } from "../../../shared/lib/constants.js";

function UndeadEnemy(options) {
    this.scale = GAME_SCALE
    this.spritesheet = Assets.image(ASSETS_PATH.ENEMIES + "/enUndead.png");

    this.position = { x: options.x ?? options.initialX ?? 0, y: options.y ?? options.initialY ?? 0 };

    this._initAnimations();
}

UndeadEnemy.prototype._initAnimations = function () {
    this.spritesheet.startx = 0;
    this.spritesheet.endx = 16;
    this.spritesheet.starty = 0;
    this.spritesheet.endy = 16;

    this.spritesheet.framesPerRow = 3;
    this.spritesheet.totalFrames = 3;
    this.spritesheet.frameWidth = 16;
    this.spritesheet.frameHeight = 16;

    this.spritesheet.fps = 6;
    this.spritesheet.scale = this.scale;

    this.spritesheet.animations = {
        [ENEMIES_ANIMATIONS.WALK]: {
            start: 0,
            end: 1
        },
        [ENEMIES_ANIMATIONS.IDLE]: {
            start: 0,
            end: 0
        }
    }

    setAnimation(this.spritesheet, ENEMIES_ANIMATIONS.IDLE);
}

UndeadEnemy.prototype.update = function (player, deltaTime, cameraX, cameraY) {
    this.draw(cameraX, cameraY);
}

UndeadEnemy.prototype.draw = function (cameraX, cameraY) {
    animationSprite(this.spritesheet);
    this.spritesheet.draw(this.position.x - (cameraX || 0), this.position.y - (cameraY || 0));
}

export default UndeadEnemy;