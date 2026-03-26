import { ASSETS_PATH } from "../shared/lib/constants.js";
import Assets from "../shared/lib/assets.js";
import Gamepad from "src/shared/lib/gamepad.js";

import { Cutscene01 } from "./Cutscene01.js"

let font = Assets.font("assets/font/font.ttf");

export function Menu(Scene) {
    
    const gray = Color.new(72, 72, 72);
    const red = Color.new(255, 0, 0);
    const white = Color.new(255, 255, 255);
    
    let musicMenu = Assets.sound(ASSETS_PATH.SOUNDS + "/music/menu.wav");
    let selectedSFX = Assets.sound(ASSETS_PATH.SOUNDS + "/sfx/selected.adp");
    let selectorSFX = Assets.sound(ASSETS_PATH.SOUNDS + "/sfx/selector.adp");
    
    let bgMain = Assets.image(ASSETS_PATH.IMAGES + "/ui/main.png").scale(2);
    let bgLogo = Assets.image(ASSETS_PATH.IMAGES + "/ui/logo.png").scale(2);
    
    let selected = 0;
    let currentScreen;
    
    let music = 10;
    let sfx = 10;
    let vibration = true;
    
    musicMenu.loop = true;
    musicMenu.play();
    
    
    const drawText = (x, y, text, color, scale = 0.7) => {
        font.color = color;
        font.scale = scale;
        
        let textX = x === 0 ? 320 - font.getTextSize(text).width / 2 : x;
        font.print(textX, y, text);
    }
    
    const updateSelection = (max) => {
        const old = selected;
        
        if(Gamepad.player(0).justPressed(Pads.UP)) selected--;
        if(Gamepad.player(0).justPressed(Pads.DOWN)) selected++;
        
        selected = Math.min(Math.max(selected, 0), max);
        
        if(old !== selected) {
            selectorSFX.play();
        }
        
    }
    
    const changeScreen = (name, newSelected = 0) => {
        currentScreen = screens[name];
        selected = newSelected;
    }
    
    
    const screens = {
        main: {
            update() {
                updateSelection(3);
                
                if(Gamepad.player(0).justPressed(Pads.CROSS)) {
                    if(selected === 0) Scene.changeScene(Cutscene01);
                    if(selected === 1) changeScreen("load");
                    if(selected === 2) changeScreen("options");
                    if(selected === 3) changeScreen("extras");
                }
            },
            
            draw() {
                bgMain.draw(48, 16);
                
                drawText(0, 245, "NEW GAME", selected === 0? red : white, 0.7);
                drawText(0, 265, "LOAD", selected === 1? red : white, 0.7);
                drawText(0, 285, "OPTIONS", selected === 2? red : white, 0.7);
                drawText(0, 305, "EXTRAS", selected === 3? red : white, 0.7);
            }   
        },
        
        load: {
            update() {
                if(Gamepad.player(0).justPressed(Pads.CROSS)) {
                    changeScreen("main", 1);
                }
            },
            
            draw() {
                bgLogo.draw(0, 0);
                drawText(0, 205, "LOAD GAME", gray, 0.8);
            }
        },
        
        options: {
            update() {
                updateSelection(4);
                
                if(Gamepad.player(0).justPressed(Pads.LEFT)) {
                    if(selected === 0 && music > 0) music--;
                    if(selected === 1 && sfx > 0) sfx--;
                    Sound.setVolume(music * 10);
                    selectorSFX.volume = sfx *10;
                }
                
                if(Gamepad.player(0).justPressed(Pads.RIGHT)) {
                    if(selected === 0 & music < 10) music++;
                    if(selected === 1 && sfx < 10) sfx++;
                    Sound.setVolume(music * 10);
                    selectorSFX.volume = sfx *10;
                }
                
                if(Gamepad.player(0).justPressed(Pads.CROSS)) {
                    if(selected === 2) changeScreen("controls");
                    if(selected === 3) vibration = !vibration;
                    if(selected === 4) changeScreen("main", 2);
                }
            },
            
            draw() {
                bgLogo.draw(0, 0);
                
                drawText(0, 205, "OPTIONS", gray, 0.8);
                
                drawText(240, 245, "MUSIC: " + music, selected === 0? red : white, 0.7);
                drawText(240, 265, "SFX:   " + sfx, selected === 1? red : white, 0.7);
                drawText(240, 285, "CONTROLS", selected === 2? red : white, 0.7);
                drawText(240, 305, "LANGUAGE", selected === 3? red : white, 0.7);
                //drawText(203, 305, "VIBRATION: " + (vibration ? "ON" : "OFF"), selected === 3? red : white, 0.7);
                
                drawText(0, 345, "BACK", selected === 4? red : white, 0.7);
            }
        },
        
        extras: {
            update() {
                updateSelection(3);
                
                if(Gamepad.player(0).justPressed(Pads.CROSS)) {
                    if(selected === 2) changeScreen("credits");
                    if(selected === 3) changeScreen("main", 3);
                }
            },
            
            draw() {
                bgLogo.draw(0, 0);
                
                drawText(0, 205, "EXTRAS", gray, 0.8);
                
                drawText(0, 245, "GAUNTLET", selected === 0? red : white, 0.7);
                drawText(0, 265, "CHALLENGES", selected === 1? red : white, 0.7);
                drawText(0, 285, "CREDITS", selected === 2? red : white, 0.7);
                
                drawText(0, 325, "BACK", selected === 3? red : white, 0.7);
            }
        },
        
        controls: {
            update() {
                if(Gamepad.player(0).justPressed(Pads.CROSS)) {
                    if(selected === 0) changeScreen("options", 2);
                }
            },
            
            draw() {
                bgLogo.draw(0, 0);
                drawText(0, 205, "CONTROLS", gray, 0.8);
            }
        },
        
        credits: {
            update() {
                if(Gamepad.player(0).justPressed(Pads.CROSS)) {
                    if(selected === 0) changeScreen("extras", 2);
                }
            },
            
            draw() {
                bgLogo.draw(0, 0);
                drawText(0, 205, "PROGRAMMING", red, 0.8);
                
                drawText(0, 245, "GIBRAN KHALIL", Color.new(254, 150, 11), 0.7);
                drawText(0, 265, "EDUARDO SOUSA", Color.new(254, 150, 11), 0.7);
                drawText(0, 285, "DEV NOOB", Color.new(254, 150, 11), 0.7);
            }
        },
        
    };
    
    changeScreen("main");
    
    
    return {
        update() {
            currentScreen.update();
        },
        
        draw() {
            currentScreen.draw();
        },
        
        unload() {
            musicMenu.pause();
            musicMenu.free();
            bgMain.free();
            bgLogo.free();
        }
    }
}
