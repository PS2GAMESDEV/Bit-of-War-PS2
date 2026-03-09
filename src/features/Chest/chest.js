import { PLAYER_CONTROLS } from "../../shared/config/controls.js";
import { animationSprite, setAnimation } from "../../shared/lib/animation.js";
import Assets from "../../shared/lib/assets.js"
import Collision from "../../shared/lib/collision.js";
import { ASSETS_PATH, CHEST_ANIMATIONS, GAME_SCALE, SCREEN_HEIGHT, SCREEN_WIDTH, VFX_SCREEN_COLOR } from "../../shared/lib/constants.js"
import Gamepad from "../../shared/lib/gamepad.js";

export const ScreenFlash = {
    active: false,
    color: null,
    timer: 0,
    duration: 0.1f,
    
    trigger(type) {
        this.active = true;
        this.timer = this.duration;
        const colorKey = type.toUpperCase();
        this.color = VFX_SCREEN_COLOR[colorKey] || VFX_SCREEN_COLOR.MAGIC;
    },
    
    update(deltaTime) {
        if (!this.active) return;
        this.timer -= deltaTime;
        if (this.timer <= 0) this.active = false;
    },
    
    draw() {
        if (this.active) {
            Draw.rect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT, this.color);
        }
    }
};

function Chest(options) {
    this.position = { x: options.x, y: options.y }
    this.type = options.type

    this.isOpen = false;
    this.colliderId = null;

    this.scale = GAME_SCALE;

    this.spritesheet = Assets.image(ASSETS_PATH.OBJECTS + "/ob" + this.type + "Chest.png")
    this.sfxChests = Assets.sound(ASSETS_PATH.SOUNDS + "/sfx/chests.adp");

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

    this.spritesheet.scale = this.scale;
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
        w: this.spritesheet.frameWidth * this.scale,
        h: this.spritesheet.frameHeight * this.scale,
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

Chest.prototype.handleInteraction = function (player) {
    if (this.isOpen) return;

    const hits = Collision.checkOne(player.colliderId, ['chest']);

    const isTouching = hits.some(hit => hit.id === this.colliderId);

    if (isTouching && Gamepad.player(player.PLAYER_PORT).justPressed(PLAYER_CONTROLS.OPEN_CHEST)) {
        this.open();
        player.isOpeningChest = true;
    }
}

Chest.prototype.open = function () {
    this.isOpen = true;
    if(!this.sfxChests.playing()) this.sfxChests.play();
    ScreenFlash.trigger(this.type);
}

Chest.prototype.draw = function(cameraX, cameraY) {
    animationSprite(this.spritesheet)
    this.spritesheet.draw(this.position.x - (cameraX || 0), this.position.y - (cameraY || 0));
}

Chest.prototype.update = function(player, deltaTime, cameraX, cameraY){
    this.handleInteraction(player);
    this.handleAnimation();
    this.draw(cameraX, cameraY);
}

Chest.prototype.destroy = function () {
    if (this.colliderId !== null) {
        Collision.unregister(this.colliderId);
        this.colliderId = null;
    }
}

export default Chest;