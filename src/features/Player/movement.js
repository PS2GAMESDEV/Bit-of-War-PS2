import Collision from "../../shared/lib/collision.js";
import Gamepad from "../../shared/lib/gamepad.js";
import { ASSETS_PATH, PLAYER_MOVEMENT } from "../../shared/lib/constants.js";
import Assets from "../../shared/lib/assets.js";
import { PLAYER_CONTROLS } from "../../shared/config/controls.js";

function Movement2D(options) {
    this.position = { x: options.initialX, y: options.initialY };
    this.velocity = { x: 0, y: 0 };

    this.facingLeft = false;
    this.canMove = true;
    this.onGround = false;
    this.jumpsRemaining = PLAYER_MOVEMENT.DEFAULT_JUMPS || 2;

    this.isClimbing = false;
    this.canClimb = false;
    this.onLadder = false;
    this.ladderX = 0;

    this.sfxJump = Assets.sound(ASSETS_PATH.SOUNDS + "/sfx/jump.adp");

    this.PLAYER_PORT = options.playerPort;
}

Movement2D.prototype.isClimbingState = function () {
    return this.isClimbing;
};

Movement2D.prototype.canStartClimbing = function () {
    return this.canClimb && !this.isClimbing;
};

Movement2D.prototype.isFalling = function () {
    return this.velocity.y > 0;
};

Movement2D.prototype.isGrounded = function () {
    return this.onGround;
};

Movement2D.prototype.isJumping = function () {
    return this.velocity.y < 0 && this.jumpsRemaining > 0;
};

Movement2D.prototype.isDoubleJumping = function () {
    return this.velocity.y < 0 && this.jumpsRemaining === 0;
}

Movement2D.prototype.isMoving = function () {
    return this.velocity.x !== 0 && this.isGrounded();
};

Movement2D.prototype.isIdle = function () {
    return !this.isMoving() && !this.isJumping() && !this.isDefending() && !this.isFalling() && this.isGrounded();
};

Movement2D.prototype.isDefending = function () {
    return Gamepad.player(this.PLAYER_PORT).pressed(PLAYER_CONTROLS.BLOCK) && this.isGrounded();
};

Movement2D.prototype.isAttacking = function () {
    return Gamepad.player(this.PLAYER_PORT).justPressed(PLAYER_CONTROLS.ATK);
}

Movement2D.prototype.isInMaxYVelocity = function () {
    return this.velocity.y <= PLAYER_MOVEMENT.MAX_Y_VELOCITY;
};

Movement2D.prototype.applyGravity = function () {
    this.velocity.y += PLAYER_MOVEMENT.DEFAULT_GRAVITY;
};

Movement2D.prototype.moveHorizontally = function (direction) {
    this.facingLeft = direction.forLeft;
    this.velocity.x = PLAYER_MOVEMENT.DEFAULT_SPEED * (direction.forLeft ? -1 : 1);
};

Movement2D.prototype.startClimbing = function (ladderX) {
    this.isClimbing = true;
    this.onGround = false;
    this.velocity.x = 0;
    this.velocity.y = 0;
    this.ladderX = ladderX;

    this.position.x = ladderX;
};

Movement2D.prototype.stopClimbing = function () {
    this.isClimbing = false;
    this.velocity.y = 0;
};

Movement2D.prototype.climb = function (direction) {
    if (!this.isClimbing) return;

    this.velocity.y = direction * (PLAYER_MOVEMENT.DEFAULT_SPEED * 0.6);
};

Movement2D.prototype.jump = function () {
    if (this.jumpsRemaining === 0) return;

    if (!this.sfxJump.playing()) this.sfxJump.play();

    this.velocity.y = PLAYER_MOVEMENT.DEFAULT_JUMP_STRENGTH;
    this.jumpsRemaining--;
};

Movement2D.prototype.handleInput = function () {
    if (this.isClimbing) {
        const gamepad = Gamepad.player(this.PLAYER_PORT);

        if (gamepad.pressed(Pads.UP) || gamepad.pressed(Pads.TRIANGLE)) {
            this.climb(-1);
        }
        else if (gamepad.pressed(Pads.DOWN) || gamepad.pressed(Pads.CROSS)) {
            this.climb(1);
        }
        else {
            this.climb(0);
        }

        if (gamepad.justPressed(PLAYER_CONTROLS.JUMP) ||
            gamepad.pressed(Pads.LEFT) ||
            gamepad.pressed(Pads.RIGHT)) {
            this.stopClimbing();

            if (gamepad.justPressed(PLAYER_CONTROLS.JUMP)) {
                this.jump();
            }
        }

        return;
    }

    if (Gamepad.player(this.PLAYER_PORT).pressed(Pads.RIGHT)) {
        this.moveHorizontally({ forLeft: false });
    } else if (Gamepad.player(this.PLAYER_PORT).pressed(Pads.LEFT)) {
        this.moveHorizontally({ forLeft: true });
    } else {
        this.velocity.x = 0;
    }

    if (Gamepad.player(this.PLAYER_PORT).justPressed(PLAYER_CONTROLS.JUMP) && !this.isDefending()) {
        this.jump();
    }
};

Movement2D.prototype.checkGroundCollision = function (colliderId, bounds) {
    const groundCheck = Collision.checkArea({
        type: 'rect',
        x: bounds.left + 4,
        y: bounds.bottom,
        w: (bounds.right - bounds.left) - 8,
        h: 4,
        mask: ['ground', 'platform'],
        excludeId: colliderId
    });

    this.onGround = groundCheck.length > 0 && this.velocity.y >= 0;

    if (this.onGround) {
        if (this.velocity.y > 0) {
            const ground = groundCheck[0].collider;
            this.position.y = ground.y - (bounds.bottom - this.position.y);
            this.velocity.y = 0;
        }

        this.jumpsRemaining = PLAYER_MOVEMENT.DEFAULT_JUMPS;
    }

    return this.onGround;
};

Movement2D.prototype.checkWallCollision = function (colliderId, bounds) {
    const leftCheck = Collision.checkArea({
        type: 'rect',
        x: bounds.left - 2,
        y: bounds.top + 4,
        w: 2,
        h: (bounds.bottom - bounds.top) - 8,
        mask: ['ground', 'wall', 'platform'],
        excludeId: colliderId
    });
    const rightCheck = Collision.checkArea({
        type: 'rect',
        x: bounds.right,
        y: bounds.top + 4,
        w: 2,
        h: (bounds.bottom - bounds.top) - 8,
        mask: ['ground', 'wall', 'platform'],
        excludeId: colliderId
    });

    this.touchingWall = false;
    this.wallDirection = 0;

    if (leftCheck.length > 0 && this.velocity.x < 0) {
        const validWalls = leftCheck.filter(hit =>
            hit.layer !== 'platform' && !hit.tags.includes('platform')
        );

        if (validWalls.length > 0) {
            const wall = validWalls[0].collider;
            this.position.x = wall.x + wall.w + (this.position.x - bounds.left);
            this.velocity.x = 0;
            this.touchingWall = true;
            this.wallDirection = -1;
        }
    }

    if (rightCheck.length > 0 && this.velocity.x > 0) {
        const validWalls = rightCheck.filter(hit =>
            hit.layer !== 'platform' && !hit.tags.includes('platform')
        );

        if (validWalls.length > 0) {
            const wall = validWalls[0].collider;
            this.position.x = wall.x - (bounds.right - this.position.x);
            this.velocity.x = 0;
            this.touchingWall = true;
            this.wallDirection = 1;
        }
    }

    return this.touchingWall;
}

Movement2D.prototype.checkLadderCollision = function (colliderId, bounds) {
    const ladderCheck = Collision.checkArea({
        type: 'rect',
        x: bounds.left + 4,
        y: bounds.top + 4,
        w: (bounds.right - bounds.left) - 8,
        h: (bounds.bottom - bounds.top) - 8,
        mask: ['ladder'],
        excludeId: colliderId
    });

    this.canClimb = ladderCheck.length > 0;

    if (this.canClimb && !this.isClimbing) {
        const ladder = ladderCheck[0].collider;
        this.ladderX = ladder.x + (ladder.w / 2);

        const gamepad = Gamepad.player(this.PLAYER_PORT);
        const atLadderTop = this.onGround && ladder.y < this.position.y;
        const atLadderBottom = this.position.y < ladder.y + ladder.h;

        if ((gamepad.pressed(Pads.UP) && atLadderTop) ||
            (gamepad.pressed(Pads.DOWN) && atLadderBottom && !this.onGround)) {
            this.startClimbing(this.ladderX);
        }
    }

    if (this.isClimbing && this.velocity.y > 0) {
        const groundCheck = Collision.checkArea({
            type: 'rect',
            x: bounds.left + 4,
            y: bounds.bottom,
            w: (bounds.right - bounds.left) - 8,
            h: 4,
            mask: ['ground', 'platform'],
            excludeId: colliderId
        });

        if (groundCheck.length > 0) {
            const ground = groundCheck[0].collider;
            this.stopClimbing();
            this.onGround = true;
            this.position.y = ground.y - (bounds.bottom - this.position.y);
            this.velocity.y = 0;
        }
    }

    if (this.isClimbing && ladderCheck.length === 0) {
        this.stopClimbing();
    }

    return this.canClimb;
};

Movement2D.prototype.updatePosition = function () {
    if (this.isDefending()) return;

    if (this.isClimbing) {
        this.position.y += this.velocity.y;
        return;
    }

    if (this.isInMaxYVelocity()) this.applyGravity();

    this.position.x += this.velocity.x;
    this.position.y += this.velocity.y;
};

Movement2D.prototype.update = function (deltaTime) {
    if (this.canMove) this.handleInput();
    this.updatePosition(deltaTime);
};

Movement2D.prototype.destroy = function () {
    this.sfxJump = null;

    Assets.free(ASSETS_PATH.SOUNDS + "/sfx/jump.adp");
}

export default Movement2D;