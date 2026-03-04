import { PLAYER_CONTROLS } from "../../shared/config/controls.js";
import { animationSprite, setAnimation } from "../../shared/lib/animation.js";
import Assets from "../../shared/lib/assets.js"
import Collision from "../../shared/lib/collision.js";
import { ASSETS_PATH, CHEST_ANIMATIONS } from "../../shared/lib/constants.js"
import Gamepad from "../../shared/lib/gamepad.js";

function Chest(options) {
    this.position = { x: options.x, y: options.y }
    this.type = options.type

    this.isOpen = false;
    this.colliderId = null;

    this.spritesheet = Assets.image(ASSETS_PATH.OBJECTS + "/ob" + this.type + "Chest.png")

    this._initAnimations();
    this._initCollider();
}

Chest.prototype._initAnimations = function () {
    this.spritesheet.startx = 0;
    this.spritesheet.endx = 16;
    this.spritesheet.starty = 0;
    this.spritesheet.endy = 16;

    this.spritesheet.framesPerRow = 2;
    this.spritesheet.totalFrames = 2;
    this.spritesheet.frameWidth = 16;
    this.spritesheet.frameHeight = 16;

    this.spritesheet.animations = {
        [CHEST_ANIMATIONS.CLOSED]: {
            start: 0,
            end: 0
        },
        [CHEST_ANIMATIONS.OPEN]: {
            start: 1,
            end: 1
        }
    }
}

Chest.prototype._initCollider = function () {
    this.colliderId = Collision.register({
        type: 'rect',
        x: this.position.x,
        y: this.position.y,
        w: this.spritesheet.frameWidth,
        h: this.spritesheet.frameHeight,
        static: true,
        layer: 'chest',
        mask: ['player'],
        tags: ['chest'],
        data: { entity: this }
    });
}

Chest.prototype.handleAnimation = function () {
    if(this.isOpen) setAnimation(this.spritesheet, CHEST_ANIMATIONS.OPEN);
    else setAnimation(this.spritesheet, CHEST_ANIMATIONS.CLOSED);
}

Chest.prototype.handleInteraction = function (playerColliderId, playerPort) {
    if (this.isOpen) return;

    const hits = Collision.checkOne(playerColliderId, ['chest']);

    const isTouching = hits.some(hit => hit.id === this.colliderId);

    if (isTouching && Gamepad.player(playerPort).justPressed(PLAYER_CONTROLS.OPEN_CHEST)) {
        this.open();
    }
}

Chest.prototype.open = function () {
    this.isOpen = true;
}

Chest.prototype.draw = function() {
    animationSprite(this.spritesheet)
    this.spritesheet.draw(this.position.x, this.position.y)
}

Chest.prototype.update = function(playerColliderId, playerPort){
    this.handleInteraction(playerColliderId, playerPort);
    this.handleAnimation();
    this.draw();
}

Chest.prototype.destroy = function () {
    if (this.colliderId !== null) {
        Collision.unregister(this.colliderId);
        this.colliderId = null;
    }
}

export default Chest;