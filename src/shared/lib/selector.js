export default class Selector {
    constructor(items, { onSelect, onConfirm, selectorSFX, confirmSFX, adjustSFX } = {}) {
        this.items = items;
        this.index = 0;
        this.onSelect = onSelect;
        this.onConfirm = onConfirm;
        this.selectorSFX = selectorSFX;
        this.confirmSFX = confirmSFX;
        this.adjustSFX = adjustSFX ?? selectorSFX;
    }

    update(pad) {
        const old = this.index;

        if (pad.justPressed(Pads.UP)) this.index--;
        if (pad.justPressed(Pads.DOWN)) this.index++;

        const total = this.items.length;
        this.index = (this.index + total) % total;

        if (old !== this.index) {
            this.selectorSFX?.play();
            this.onSelect?.(this.index);
        }

        const current = this.items[this.index];

        if (current.onAdjust) {
            if (pad.justPressed(Pads.LEFT)) {
                current.onAdjust(-1);
                this.adjustSFX?.play();
            }
            if (pad.justPressed(Pads.RIGHT)) {
                current.onAdjust(1);
                this.adjustSFX?.play();
            }
        }

        if (pad.justPressed(Pads.CROSS) && current.action) {
            this.confirmSFX?.play();
            this.onConfirm?.(current, this.index);
        }
    }

    get current() {
        return this.items[this.index];
    }
}