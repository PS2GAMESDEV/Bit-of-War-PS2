import { animationSprite, setAnimation } from "../../shared/lib/animation.js";
import Assets from "../../shared/lib/assets.js";
import Collision from "../../shared/lib/collision.js";
import { ASSETS_PATH, PLAYER_ANIMATIONS, PLAYER_ONE_PORT } from "../../shared/lib/constants.js";
import Movement2D from "./movement.js";

function Player(options) {
    options = options || {};

    this.PLAYER_PORT = options.PLAYER_PORT || PLAYER_ONE_PORT;
    this._bounds = { left: 0, top: 0, right: 0, bottom: 0 };
    this.HITBOX_WIDTH = 16;
    this.movement = new Movement2D({
        initialX: options.initialX || 0,
        initialY: options.initialY || 0,
        playerPort: this.PLAYER_PORT
    });

    this.colliderId = null;
    this.isAttacking = false;
    this.isOpeningChest = false;

    this.spritesheet = Assets.image(ASSETS_PATH.SPRITES + "/kratos/spritesheet.png")
    this.bladeSpritesheet = Assets.image(ASSETS_PATH.SPRITES + "/kratos/blade.png")

    this.hud = Assets.image(ASSETS_PATH.SPRITES + "/kratos/hud.png");
    this.powerupSpace = Assets.image(ASSETS_PATH.SPRITES + "/kratos/powerup.png")

    this.sfxBlades = Assets.sound(ASSETS_PATH.SOUNDS + "/sfx/blades.adp");

    this.debugColor = Color.new(255, 0, 0, 100);

    this._initAnimations();
    this._initBladeAnimation();
    this._initCollider();
}
Player.prototype.shouldRemove = () => false;

Player.prototype._initCollider = function () {
    this.colliderId = Collision.register({
        type: 'rect',
        x: this.movement.position.x,
        y: this.movement.position.y,
        w: this.spritesheet.frameWidth,
        h: this.spritesheet.frameHeight,
        layer: 'player',
        mask: ['enemy', 'ground', 'wall', 'platform', 'chest'],
        tags: ['player', 'damageable'],
        data: { entity: this }
    });
}
Player.prototype._initAnimations = function () {
    this.spritesheet.startx = 0;
    this.spritesheet.endx = 16;
    this.spritesheet.starty = 0;
    this.spritesheet.endy = 16;

    this.spritesheet.framesPerRow = 6;
    this.spritesheet.totalFrames = 12;
    this.spritesheet.frameWidth = 16;
    this.spritesheet.frameHeight = 16;

    this.spritesheet.fps = 6;
    this.spritesheet.animations = {
        [PLAYER_ANIMATIONS.CLIMB]: {
            start: 0,
            end: 1
        },
        [PLAYER_ANIMATIONS.ATK_L]: {
            start: 2,
            end: 2
        },
        [PLAYER_ANIMATIONS.ATK_R]: {
            start: 3,
            end: 3
        },
        [PLAYER_ANIMATIONS.BLOCK_L]: {
            start: 4,
            end: 4
        },
        [PLAYER_ANIMATIONS.BLOCK_R]: {
            start: 5,
            end: 5
        },
        [PLAYER_ANIMATIONS.JUMP_L]: {
            start: 6,
            end: 6
        },
        [PLAYER_ANIMATIONS.JUMP_R]: {
            start: 7,
            end: 7
        },
        [PLAYER_ANIMATIONS.WALK_L]: {
            start: 8,
            end: 9
        },
        [PLAYER_ANIMATIONS.WALK_R]: {
            start: 10,
            end: 11
        },
        [PLAYER_ANIMATIONS.IDLE_L]: {
            start: 8,
            end: 8
        },
        [PLAYER_ANIMATIONS.IDLE_R]: {
            start: 10,
            end: 10
        }
    }

    setAnimation(this.spritesheet, this.animationState, false);
}
Player.prototype._initBladeAnimation = function () {
    var self = this;

    this.bladeSpritesheet.totalFrames = 7;
    this.bladeSpritesheet.frameWidth = 48;
    this.bladeSpritesheet.frameHeight = 16;
    this.bladeSpritesheet.framesPerRow = 7;
    this.bladeSpritesheet.fps = 16;
    this.bladeSpritesheet.loop = false;
    this.bladeSpritesheet.startFrame = 0;
    this.bladeSpritesheet.endFrame = 6;
    this.bladeSpritesheet.currentFrame = 0;
    this.bladeSpritesheet.playing = false;

    this.bladeSpritesheet.onAnimationEnd = function () {
        self.bladeSpritesheet.playing = false;
        self.isAttacking = false;
    };
};
Player.prototype.startAttack = function () {
    if (this.isAttacking) return;

    this.isAttacking = true;
    this.bladeSpritesheet.playing = true;
    this.bladeSpritesheet.currentFrame = 0;
    this.bladeSpritesheet.frameTimer = 0;

    if (!this.sfxBlades.playing()) this.sfxBlades.play();
};
Player.prototype.getBounds = function () {
    const halfWidth = this.spritesheet.frameWidth / 2;

    this._bounds.left = this.movement.position.x - halfWidth;
    this._bounds.top = this.movement.position.y;
    this._bounds.right = this.movement.position.x + halfWidth;
    this._bounds.bottom = this.movement.position.y + this.spritesheet.frameHeight;

    return this._bounds;
}
Player.prototype.updateAnimation = function (deltaTime) {
    this.spritesheet.deltaTime = deltaTime;
    animationSprite(this.spritesheet);

    if (this.bladeSpritesheet.playing) {
        this.bladeSpritesheet.deltaTime = deltaTime;
        animationSprite(this.bladeSpritesheet);
    }
}
Player.prototype.handleAnimation = function () {
    if (this.isOpeningChest) {
        setAnimation(this.spritesheet, PLAYER_ANIMATIONS.CLIMB, false);
        this.spritesheet.currentFrame = this.spritesheet.startFrame;
        this.spritesheet.frameTimer = 0;
        return;
    }

    if ((this.movement.isJumping() || this.movement.isDoubleJumping()) && this.movement.facingLeft) setAnimation(this.spritesheet, PLAYER_ANIMATIONS.JUMP_L);
    else if ((this.movement.isJumping() || this.movement.isDoubleJumping()) && !this.movement.facingLeft) setAnimation(this.spritesheet, PLAYER_ANIMATIONS.JUMP_R);
    else if (this.movement.isDefending() && this.movement.facingLeft) setAnimation(this.spritesheet, PLAYER_ANIMATIONS.BLOCK_L);
    else if (this.movement.isDefending() && !this.movement.facingLeft) setAnimation(this.spritesheet, PLAYER_ANIMATIONS.BLOCK_R);
    else if (this.movement.isMoving() && this.movement.facingLeft) setAnimation(this.spritesheet, PLAYER_ANIMATIONS.WALK_L);
    else if (this.movement.isMoving() && !this.movement.facingLeft) setAnimation(this.spritesheet, PLAYER_ANIMATIONS.WALK_R);
    else if (this.movement.isIdle() && this.movement.facingLeft) setAnimation(this.spritesheet, PLAYER_ANIMATIONS.IDLE_L);
    else if (this.movement.isIdle() && !this.movement.facingLeft) setAnimation(this.spritesheet, PLAYER_ANIMATIONS.IDLE_R);

    if (this.isAttacking && this.movement.facingLeft) setAnimation(this.spritesheet, PLAYER_ANIMATIONS.ATK_L);
    else if (this.isAttacking && !this.movement.facingLeft) setAnimation(this.spritesheet, PLAYER_ANIMATIONS.ATK_R);
}
Player.prototype.updateCollider = function (bounds) {
    if (!this.colliderId) return;

    Collision.update(this.colliderId, {
        x: bounds.left,
        y: bounds.top,
        w: this.HITBOX_WIDTH,
        h: bounds.bottom - bounds.top
    });
}
Player.prototype.drawCollisionBox = function () {
    const bounds = this.getBounds();

    Draw.quad(
        bounds.left, bounds.top,
        bounds.right, bounds.top,
        bounds.right, bounds.bottom,
        bounds.left, bounds.bottom,
        this.debugColor
    );
}
Player.prototype.draw = function () {
    if (this.shouldRemove()) return;

    if (this.bladeSpritesheet.playing) {
        var bladeX, bladeY;

        bladeY = this.movement.position.y + (this.spritesheet.frameHeight / 2) - 2;

        if (this.movement.facingLeft) {
            bladeX = this.movement.position.x - (this.spritesheet.frameWidth / 2) - this.bladeSpritesheet.frameWidth + 2;
            this.bladeSpritesheet.facingLeft = false;
        } else {
            bladeX = this.movement.position.x + (this.spritesheet.frameWidth / 2) - 2;
            this.bladeSpritesheet.facingLeft = true;
        }

        this.bladeSpritesheet.draw(bladeX, bladeY);
    }

    this.spritesheet.draw(
        this.movement.position.x - (this.spritesheet.frameWidth / 2),
        this.movement.position.y
    );

    this.hud.draw(16, 0);
    this.powerupSpace.draw(30, this.hud.height / 2 + this.powerupSpace.height / 4);
};
Player.prototype.update = function (deltaTime) {
    this.movement.update(deltaTime);
    const bounds = this.getBounds();

    if (this.movement.canMove) {
        // this.movement.checkWallCollision(this.colliderId, bounds);
        this.movement.checkGroundCollision(this.colliderId, bounds);
    }

    if (this.movement.isAttacking() && !this.isAttacking) {
        this.startAttack();
    }

    if (this.isOpeningChest && (!this.movement.isIdle() || this.isAttacking)) {
        this.isOpeningChest = false;
    }

    this.updateAnimation(deltaTime);
    this.updateCollider(bounds);
    this.handleAnimation();
}
Player.prototype.destroy = function () {
    if (this.colliderId !== null) {
        Collision.unregister(this.colliderId);
        this.colliderId = null;
    }

    this.spritesheet = null;
    this.bladeSpritesheet = null;
    this.movement.destroy();
    this.movement = null;
    this.debugColor = null;

    Assets.free(ASSETS_PATH.SPRITES + "/" + "kratos/spritesheet.png");
    Assets.free(ASSETS_PATH.SPRITES + "/kratos/blade.png");
    Assets.free(ASSETS_PATH.SOUNDS + "/sfx/blades.adp");
}

export default Player;