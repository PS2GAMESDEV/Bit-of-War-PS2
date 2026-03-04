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

    this.spritesheet = Assets.image(ASSETS_PATH.SPRITES + "/" + "kratos/spritesheet.png")
    this.debugColor = Color.new(255, 0, 0, 100);

    this._initAnimations();
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
        mask: ['enemy', 'ground', 'wall', 'platform', 'fruit'],
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
}
Player.prototype.handleAnimation = function () {
    if ((this.movement.isJumping() || this.movement.isDoubleJumping()) && this.movement.facingLeft) setAnimation(this.spritesheet, PLAYER_ANIMATIONS.JUMP_L);
    else if ((this.movement.isJumping() || this.movement.isDoubleJumping()) && !this.movement.facingLeft) setAnimation(this.spritesheet, PLAYER_ANIMATIONS.JUMP_R);
    else if (this.movement.isDefending() && this.movement.facingLeft) setAnimation(this.spritesheet, PLAYER_ANIMATIONS.BLOCK_L);
    else if (this.movement.isDefending() && !this.movement.facingLeft) setAnimation(this.spritesheet, PLAYER_ANIMATIONS.BLOCK_R);
    else if (this.movement.isMoving() && this.movement.facingLeft) setAnimation(this.spritesheet, PLAYER_ANIMATIONS.WALK_L);
    else if (this.movement.isMoving() && !this.movement.facingLeft) setAnimation(this.spritesheet, PLAYER_ANIMATIONS.WALK_R);
    else if (this.movement.isIdle() && this.movement.facingLeft) setAnimation(this.spritesheet, PLAYER_ANIMATIONS.IDLE_L);
    else if (this.movement.isIdle() && !this.movement.facingLeft) setAnimation(this.spritesheet, PLAYER_ANIMATIONS.IDLE_R);
}
Player.prototype.updateCollider = function () {
    if (!this.colliderId) return;

    const bounds = this.getBounds();

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

    this.spritesheet.draw(
        this.movement.position.x,
        this.movement.position.y
    );
}
Player.prototype.update = function (deltaTime) {
    this.movement.update(deltaTime);
    const bounds = this.getBounds();

    if (this.movement.canMove) {
        // this.movement.checkWallCollision(this.colliderId, bounds);
        this.movement.checkGroundCollision(this.colliderId, bounds);
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
    this.movement = null;
    this.debugColor = null;

    Assets.free(ASSETS_PATH.SPRITES + "/" + "kratos/spritesheet.png");
}

export default Player;