import { BOX2D_SCALE, GAME_SCALE } from "../../shared/config/constants.js";
import { X_SPEED, JUMP_FORCE } from "./constants.js";

export default class PlayerPhysics {
    constructor(world, options = {}) {
        this.body = world.createBody({
            type: Box2D.DYNAMIC_BODY,
            position: {
                x: options.x / BOX2D_SCALE,
                y: options.y / BOX2D_SCALE
            },
            fixedRotation: true
        });

        this.body.createBoxShape({
            halfWidth: (8 * GAME_SCALE) / BOX2D_SCALE,
            halfHeight: (8 * GAME_SCALE) / BOX2D_SCALE,
            friction: 0.0
        });
        
    }

    moveHorizontally(dirX) {
        const currentVel = this.body.getLinearVelocity();
        this.body.setLinearVelocity(dirX * X_SPEED, currentVel.y);
    }

    jump() {
        const currentVel = this.body.getLinearVelocity();
        this.body.setLinearVelocity(currentVel.x, -JUMP_FORCE);
    }

    getVerticalVelocity() {
        return this.body.getLinearVelocity().y;
    }

    getPosition(){
        return this.body.getPosition();
    }
}