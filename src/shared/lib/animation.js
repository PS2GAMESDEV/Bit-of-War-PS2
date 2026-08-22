function animationSprite(image, state, options = {}) {
    const {
        frames
    } = image;

    const {
        scale = 1,
        facingLeft = false,
        facingUp = false,
        fps = 12,
        onAnimationEnd = state?.onAnimationEnd || null
    } = options;

    if (!frames || frames.length === 0) return null;

    if (state.lastUpdate === undefined) state.lastUpdate = Date.now();

    const now = Date.now();

    let deltaTime;

    if (image.deltaTime !== undefined) {
        deltaTime = image.deltaTime * 1000;
    } else {
        deltaTime = now - state.lastUpdate;
    }

    state.lastUpdate = now;
    const frameTime = 1000 / fps;
    state.frameTimer += deltaTime;

    if (state.frameTimer >= frameTime) {
        const framesToAdvance = Math.floor(state.frameTimer / frameTime);

        state.currentFrame += framesToAdvance;
        state.frameTimer -= framesToAdvance * frameTime;

        if (state.currentFrame > state.endFrame) {
            if (state.loop) {
                const animationLength = state.endFrame - state.startFrame + 1;
                state.currentFrame = state.startFrame + ((state.currentFrame - state.startFrame) % animationLength);
            } else {
                state.currentFrame = state.endFrame;
                if (onAnimationEnd) onAnimationEnd();
            }
        }
    }

    const frame = frames[state.currentFrame];

    if (!frame) return null;

    const render = {
        width: frame.width * scale,
        height: frame.height * scale,
        startx: 0,
        endx: 0,
        starty: 0,
        endy: 0
    };


    if (facingLeft) {
        render.startx = frame.x + frame.width;
        render.endx = frame.x;
    } else {
        render.startx = frame.x;
        render.endx = frame.x + frame.width;
    }

    if (facingUp) {
        render.starty = frame.y + frame.height;
        render.endy = frame.y;
    } else {
        render.starty = frame.y;
        render.endy = frame.y + frame.height;
    }

    return render;
}

function setAnimation(
    state,
    animations,
    name,
    loop = true
) {
    const anim = animations[name];

    if (!anim) return;
    if (state.currentAnimation === name) return;

    state.currentAnimation = name;
    state.startFrame = anim.start;
    state.endFrame = anim.end;
    state.currentFrame = anim.start;
    state.loop = loop;
    state.frameTimer = 0;
}

export {
    animationSprite,
    setAnimation
};