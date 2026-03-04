import Assets from "../../shared/lib/assets.js";
import { ASSETS_PATH } from "../../shared/lib/constants.js";

var PlayerSfx = (function() {
    var instance = null;
    
    function SfxManager() {
        this.sfxJump = Assets.sound(ASSETS_PATH.SOUNDS + "/sfx/kratos/jump.adp");
        this.sfxBlades = Assets.sound(ASSETS_PATH.SOUNDS + "/sfx/kratos/blades.adp");
        this.sfxChests = Assets.sound(ASSETS_PATH.SOUNDS + "/sfx/kratos/chests.adp");
    }
    
    SfxManager.prototype.playJump = function() {
        if (this.sfxJump) this.sfxJump.play();
    };
    
    SfxManager.prototype.playBlades = function() {
        if (this.sfxBlades) this.sfxBlades.play();
    };
    
    SfxManager.prototype.playChests = function() {
        if (this.sfxChests) this.sfxChests.play();
    };
    
    SfxManager.prototype.destroy = function() {
        Assets.free(ASSETS_PATH.SOUNDS + "/sfx/kratos/jump.adp");
        Assets.free(ASSETS_PATH.SOUNDS + "/sfx/kratos/blades.adp");
        Assets.free(ASSETS_PATH.SOUNDS + "/sfx/kratos/chests.adp");
        
        this.sfxJump = null;
        this.sfxBlades = null;
        this.sfxChests = null;
        
        instance = null;
    };
    
    return {
        getInstance: function() {
            if (!instance) {
                instance = new SfxManager();
            }
            return instance;
        }
    };
})();

export default PlayerSfx;