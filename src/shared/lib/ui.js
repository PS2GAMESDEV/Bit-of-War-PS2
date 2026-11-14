import { SCREEN_WIDTH } from "./constants.js";

export const scaled = (image, factor) => ({
    width: image.width * factor,
    height: image.height * factor
});

export function formatTime(seconds) {
    const total = Math.floor(seconds);
    const pad = n => (n < 10 ? "0" : "") + n;
    return `${Math.floor(total / 3600)}:${pad(Math.floor(total / 60) % 60)}:${pad(total % 60)}`;
}

const widths = new Map();

export function centeredX(font, text) {
    const key = font.size + text;
    let width = widths.get(key);
    if (width === undefined) {
        width = font.getTextSize(text).width;
        widths.set(key, width);
    }
    return (SCREEN_WIDTH - width) / 2;
}
