import { PLAYER_ONE } from "../../../shared/config/constants.js";
import { t } from "../../../shared/lang/lang.js";
import { Scene } from "../../../shared/lib/scene_manager.js";
import Selector from "../../../shared/lib/selector.js";

export class MenuFlowScene extends Scene {
    getPanels() {
        throw new Error("getPanels() precisa ser implementado");
    }

    getInitialPanel() {
        return Object.keys(this.getPanels())[0];
    }

    onEnter(assets) {
        this.assets = assets;
        this.font = assets.fonts["font/font.ttf"];
        this.gray = Color.new(72, 72, 72);
        this.red = Color.new(255, 0, 0);
        this.white = Color.new(255, 255, 255);
        this.selectorSFX = assets.sounds["sounds/sfx/selector.adp"];
        this.confirmSFX = assets.sounds["sounds/sfx/selected.adp"];

        this.panels = this.getPanels();
        this._openPanel(this.getInitialPanel());
    }

    _openPanel(panelKey) {
        const panelDef = this.panels[panelKey];
        this.activePanelKey = panelKey;
        this.selector = new Selector(panelDef.getOptions(this), {
            selectorSFX: this.selectorSFX,
            confirmSFX: this.confirmSFX,
            onConfirm: (option) => option.action(this),
        });
    }

    goToPanel(panelKey) {
        this._openPanel(panelKey);
    }

    onUpdate(dt) {
        this.selector.update(PLAYER_ONE);
    }

    _drawText(x, y, text, color, scale = 0.7) {
        this.font.color = color;
        this.font.scale = scale;
        const textX = x === 0 ? 320 - this.font.getTextSize(text).width / 2 : x;
        this.font.print(textX, y, text);
    }

    handleOptionText(key, customText) {
        const value = typeof customText === "function" ? customText() : customText;
        return value !== undefined && value !== null ? `${t(key)} ${value}` : t(key);
    }

    drawTitledPanel(titleKey, optionsStartY = 245) {
        this.bgLogo.draw(0, 0);
        this._drawText(0, 205, t(titleKey), this.gray, 0.8);
        this.drawOptions(optionsStartY);
    }

    drawOptions(startY, lineHeight = 20) {
        this.selector.items.forEach((option, index) => {
            const color = this.selector.index === index ? this.red : this.white;
            this._drawText(0, startY + index * lineHeight, this.handleOptionText(option.key, option.customText), color);
        });
    }

    onDraw() {
        const panelDef = this.panels[this.activePanelKey];
        panelDef.draw(this);
    }
}