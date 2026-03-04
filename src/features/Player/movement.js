import Collision from "../../shared/lib/collision.js";
import Gamepad from "../../shared/lib/gamepad.js";
import { PLAYER_MOVEMENT } from "../../shared/lib/constants.js";

function Movement2D(options) {
    this.position = { x: options.initialX, y: options.initialY };
    this.velocity = { x: 0, y: 0 };

    this.facingLeft = false;
    this.canMove = true;
    this.onGround = false;
    this.jumpsRemaining = PLAYER_MOVEMENT.DEFAULT_JUMPS || 2;

    this.PLAYER_PORT = options.playerPort;
}

Movement2D.prototype.isFalling = function() {
    return this.velocity.y > 0;
};

Movement2D.prototype.isGrounded = function() {
    return this.onGround;
};

Movement2D.prototype.isJumping = function() {
    return this.velocity.y < 0 && this.jumpsRemaining > 0;
};

Movement2D.prototype.isDoubleJumping = function(){
    return this.velocity.y < 0 && this.jumpsRemaining === 0;
}

Movement2D.prototype.isMoving = function() {
    return this.velocity.x !== 0 && this.isGrounded();
};

Movement2D.prototype.isIdle = function() {
    return !this.isMoving() && !this.isJumping() && !this.isDefending() && !this.isFalling() && this.isGrounded();
};

Movement2D.prototype.isDefending = function() {
    return Gamepad.player(this.PLAYER_PORT).pressed(Pads.R1) && this.isGrounded();
};

Movement2D.prototype.isInMaxYVelocity = function() {
    return this.velocity.y <= PLAYER_MOVEMENT.MAX_Y_VELOCITY;
};

Movement2D.prototype.applyGravity = function() {
    this.velocity.y += PLAYER_MOVEMENT.DEFAULT_GRAVITY;
};

Movement2D.prototype.moveHorizontally = function(direction) {
    this.facingLeft = direction.forLeft;
    this.velocity.x = PLAYER_MOVEMENT.DEFAULT_SPEED * (direction.forLeft ? -1 : 1);
};

Movement2D.prototype.jump = function() {
    if (this.jumpsRemaining === 0) return;

    this.velocity.y = PLAYER_MOVEMENT.DEFAULT_JUMP_STRENGTH;
    this.jumpsRemaining--;
};

Movement2D.prototype.handleInput = function() {
    if (Gamepad.player(this.PLAYER_PORT).pressed(Pads.RIGHT)) {
        this.moveHorizontally({ forLeft: false });
    } else if (Gamepad.player(this.PLAYER_PORT).pressed(Pads.LEFT)) {
        this.moveHorizontally({ forLeft: true });
    } else {
        this.velocity.x = 0;
    }

    if (Gamepad.player(this.PLAYER_PORT).justPressed(Pads.CROSS) && !this.isDefending()) {
        this.jump();
    }
};

Movement2D.prototype.checkGroundCollision = function(colliderId, bounds) {
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

Movement2D.prototype.updatePosition = function() {
    if (this.isDefending()) return;
    if (this.isInMaxYVelocity()) this.applyGravity();

    this.position.x += this.velocity.x;
    this.position.y += this.velocity.y;
};

Movement2D.prototype.update = function(deltaTime) {
    if (this.canMove) this.handleInput();
    this.updatePosition(deltaTime);
};

export default Movement2D;