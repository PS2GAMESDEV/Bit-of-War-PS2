import { SCREEN_WIDTH } from "./constants.js";

// Draw options that stretch an image without touching it (scene assets are
// shared, so resizing the Image itself would leak into other scenes).
// Build it once and reuse it: image.draw(x, y, size).
export const scaled = (image, factor) => ({
    width: image.width * factor,
    height: image.height * factor
});

// Seconds as H:MM:SS.
export function formatTime(seconds) {
    const total = Math.floor(seconds);
    const pad = n => (n < 10 ? "0" : "") + n;
    return `${Math.floor(total / 3600)}:${pad(Math.floor(total / 60) % 60)}:${pad(total % 60)}`;
}

const widths = new Map();

// X that horizontally centers `text` on screen; measured once per font/text.
export function centeredX(font, text) {
    const key = font.size + text;
    let width = widths.get(key);
    if (width === undefined) {
        width = font.getTextSize(text).width;
        widths.set(key, width);
    }
    return (SCREEN_WIDTH - width) / 2;
}
