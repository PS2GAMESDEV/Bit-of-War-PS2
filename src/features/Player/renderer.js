import { ASSETS_PATH, GAME_SCALE } from "../../shared/config/constants.js";
import { animationSprite, setAnimation } from "../../shared/lib/animation.js";
import Assets from "../../shared/lib/assets.js";
import { PLAYER_ANIMATIONS } from "./constants.js";
import PlayerHUD from "./hud.js";

export default class PlayerRenderer {
    constructor(options) {
        this.hud = new PlayerHUD();
        this.facingLeft = options?.facingLeft ?? false;

        this.animation = {
            currentAnimation: null,
            currentFrame: 0,
            startFrame: 0,
            endFrame: 0,
            frameTimer: 0,
            lastUpdate: Date.now(),
            loop: true
        };

        this.bladeAnimation = {
            currentFrame: 0,
            startFrame: 0,
            endFrame: 6,
            frameTimer: 0,
            lastUpdate: Date.now(),
            loop: false,
            playing: false,
            onAnimationEnd: null
        };

        this.initAnimations();
        this.initBladeSprite();
    }

    initAnimations() {
        this.spritesheet = Assets.image(
            ASSETS_PATH.SPRITES + "/kratos/spritesheet.png",
            {
                animConfig: {
                    totalFrames: 12,
                    frames: [
                        { x: 0, y: 0, width: 16, height: 16 },
                        { x: 16, y: 0, width: 16, height: 16 },
                        { x: 32, y: 0, width: 16, height: 16 },
                        { x: 48, y: 0, width: 16, height: 16 },
                        { x: 64, y: 0, width: 16, height: 16 },
                        { x: 80, y: 0, width: 16, height: 16 },
                        { x: 0, y: 16, width: 16, height: 16 },
                        { x: 16, y: 16, width: 16, height: 16 },
                        { x: 32, y: 16, width: 16, height: 16 },
                        { x: 48, y: 16, width: 16, height: 16 },
                        { x: 64, y: 16, width: 16, height: 16 },
                        { x: 80, y: 16, width: 16, height: 16 },
                    ]
                }
            }
        );

        this.animations = {
            [PLAYER_ANIMATIONS.CLIMB]: { start: 0, end: 1 },
            [PLAYER_ANIMATIONS.ATK_L]: { start: 2, end: 2 },
            [PLAYER_ANIMATIONS.ATK_R]: { start: 3, end: 3 },
            [PLAYER_ANIMATIONS.BLOCK_L]: { start: 4, end: 4 },
            [PLAYER_ANIMATIONS.BLOCK_R]: { start: 5, end: 5 },
            [PLAYER_ANIMATIONS.JUMP_L]: { start: 6, end: 6 },
            [PLAYER_ANIMATIONS.JUMP_R]: { start: 7, end: 7 },
            [PLAYER_ANIMATIONS.WALK_L]: { start: 8, end: 9 },
            [PLAYER_ANIMATIONS.WALK_R]: { start: 10, end: 11 },
            [PLAYER_ANIMATIONS.IDLE_L]: { start: 8, end: 8 },
            [PLAYER_ANIMATIONS.IDLE_R]: { start: 10, end: 10 }
        };

        setAnimation(this.animation, this.animations, !this.facingLeft ? PLAYER_ANIMATIONS.IDLE_R : PLAYER_ANIMATIONS.IDLE_L, true);
    }

    initBladeSprite() {
        this.bladeSpritesheet = Assets.image(
            ASSETS_PATH.SPRITES + "/kratos/blade.png",
            {
                animConfig: {
                    totalFrames: 7,
                    frames: [
                        { x: 0, y: 0, width: 48, height: 16 },
                        { x: 48, y: 0, width: 48, height: 16 },
                        { x: 96, y: 0, width: 48, height: 16 },
                        { x: 144, y: 0, width: 48, height: 16 },
                        { x: 192, y: 0, width: 48, height: 16 },
                        { x: 240, y: 0, width: 48, height: 16 },
                        { x: 288, y: 0, width: 48, height: 16 },
                    ]
                }
            }
        );
    }

    startAttack(onComplete) {
        this.bladeAnimation.playing = true;
        this.bladeAnimation.currentFrame = 0;
        this.bladeAnimation.frameTimer = 0;
        this.bladeAnimation.lastUpdate = Date.now();
        this.bladeAnimation.onAnimationEnd = () => {
            this.bladeAnimation.playing = false;
            this.isAttacking = false;
            if (typeof onComplete === "function") onComplete();
        };

        setAnimation(
            this.animation,
            this.animations,
            this.facingLeft ? PLAYER_ANIMATIONS.ATK_L : PLAYER_ANIMATIONS.ATK_R
        );
    }

    onMoveLeft() {
        if (this.bladeAnimation.playing) return;

        this.facingLeft = true;
        setAnimation(this.animation, this.animations, PLAYER_ANIMATIONS.WALK_L);
    }

    onMoveRight() {
        if (this.bladeAnimation.playing) return;


        this.facingLeft = false;
        setAnimation(this.animation, this.animations, PLAYER_ANIMATIONS.WALK_R);
    }

    onBlock() {
        if (this.bladeAnimation.playing) return;

        setAnimation(
            this.animation,
            this.animations,
            this.facingLeft ? PLAYER_ANIMATIONS.BLOCK_L : PLAYER_ANIMATIONS.BLOCK_R
        );
    }

    idle() {
        if (this.bladeAnimation.playing) return;

        setAnimation(
            this.animation,
            this.animations,
            this.facingLeft ? PLAYER_ANIMATIONS.IDLE_L : PLAYER_ANIMATIONS.IDLE_R
        );
    }

    draw(x, y) {
        const renderPlayer = animationSprite(
            this.spritesheet,
            this.animation,
            {
                scale: GAME_SCALE,
                fps: 8
            }
        );

        if (renderPlayer) {
            this.spritesheet.draw(x, y, {
                width: renderPlayer.width,
                height: renderPlayer.height,
                startx: renderPlayer.startx,
                starty: renderPlayer.starty,
                endx: renderPlayer.endx,
                endy: renderPlayer.endy
            });
        }

        if (this.bladeAnimation.playing) {
            const renderBlade = animationSprite(this.bladeSpritesheet, this.bladeAnimation, {
                scale: GAME_SCALE,
                facingLeft: !this.facingLeft,
                fps: 16
            });
            if (renderBlade) {
                const pixelOffset = 2 * GAME_SCALE;
                const scaledPlayerWidth = 16 * GAME_SCALE;
                const scaledPlayerHeight = 16 * GAME_SCALE;
                const scaledBladeWidth = 48 * GAME_SCALE;

                let bladeX = this.facingLeft
                    ? x - scaledBladeWidth + pixelOffset
                    : x + scaledPlayerWidth - pixelOffset;
                let bladeY = y + (scaledPlayerHeight / 2) - pixelOffset;

                this.bladeSpritesheet.draw(bladeX, bladeY, {
                    width: renderBlade.width,
                    height: renderBlade.height,
                    startx: renderBlade.startx,
                    starty: renderBlade.starty,
                    endx: renderBlade.endx,
                    endy: renderBlade.endy
                });
            }
        }


        this.hud.draw();
    }
}