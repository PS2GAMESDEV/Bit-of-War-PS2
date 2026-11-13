// node --test tools/tests/player-powers.test.mjs (Node 24+)
import assert from "node:assert/strict";
import test from "node:test";

globalThis.Screen = { getMode: () => ({width:640,height:448}) };
globalThis.Color = { new: (...args) => args };
globalThis.Gamepad = { CROSS:1,SQUARE:2,L1:4,CIRCLE:8,L2:16,RIGHT:32,LEFT:64,UP:128,DOWN:256,TRIANGLE:512 };
globalThis.Sprite = { Instance: class {
    constructor(sheet, options) { Object.assign(this,options); this.sheet=sheet; }
    on() {} play(clip) { this.clip=clip; } stop() {} draw() {} pause() {} resume() {}
} };
const { Player } = await import("../../src/features/Player/player.js");
const { GAME_SCALE } = await import("../../src/shared/lib/constants.js");
const sheets=Object.fromEntries(["kratos","blade","playerGorgon","playerGorgonLeft","playerLightning","playerHammer","playerHammerLeft","playerSpin"].map(k=>[k,{}]));
const sound={play(){},stop(){}};
const sfx={jump:sound,blades:sound,hurt:sound};
const pad = { pressed:()=>false,justPressed:()=>false,anyPressed:()=>false };
function fixture(extraSfx = {}) {
    const world={bodies:[],add(opts){
        const b={vx:0,vy:0,onGround:false,gravityScale:1,...opts,
            get centerX(){return this.x+this.w/2},get bottom(){return this.y+this.h},
            setPosition(x,y){this.x=x;this.y=y}};
        this.bodies.push(b);return b;
    },query(){return[]},step(dt){for(const b of this.bodies)if(b.type==='dynamic') {b.x+=b.vx*dt;b.y+=b.vy*dt;}}};
    const player=new Player({sheets,sfx:{...sfx,...extraSfx}});player.attach(world,100,100);player.unlockedPowers=4;
    return player;
}

test("locked and unaffordable powers do not spend magic or create projectiles",()=>{
    const p=fixture();p.unlockedPowers=1;
    assert.equal(p.powers.cast(1),false);assert.equal(p.magic,5);
    p.unlockedPowers=4;p.magic=.49;
    assert.equal(p.powers.cast(1),false);assert.equal(p.powers.projectiles.length,0);
    p.magic=.5;assert.equal(p.powers.cast(1),true);assert.equal(p.magic,0);
    assert.equal(p.attackHitboxes[0].kind,'lightning');
});

test("gorgon spends 25 initially, drains 20 original points/s, follows direction, and stops on release or switching",()=>{
    const p=fixture();assert.equal(p.powers.cast(0),true);assert.equal(p.magic,3.75);
    p.powers.update(.5,true,0);assert.equal(p.magic,3.25);
    assert.equal(p.attackHitboxes[0].box.x,p.origin.x+12*GAME_SCALE);
    p.facingLeft=true;p.powers.update(.25,true,0);
    assert.equal(p.attackHitboxes[0].box.x,p.origin.x-44*GAME_SCALE);
    assert.equal(p.powers.aura.sprite.sheet,sheets.playerGorgonLeft);
    p.powers.update(0,false,0);assert.equal(p.powers.aura,null);assert.equal(p.magic,3);
    assert.equal(p.powers.cast(0),true);p.powers.update(0,true,1);assert.equal(p.powers.aura,null);
});

test("spin lasts one second, guards damage and retains one struck set per cast",()=>{
    const p=fixture();p.magic=1.25;
    assert.equal(p.powers.cast(3),true);assert.equal(p.magic,0);assert.equal(p.vulnerable,false);
    const attack=p.attackHitboxes[0];attack.struck.add('boss');
    p.hurt(0,2);assert.equal(p.health,5);
    p.powers.update(.999,false,3);assert.equal(p.powers.spinning,true);
    assert.equal(p.attackHitboxes[0].struck,attack.struck);
    assert.equal(attack.box.w,80*GAME_SCALE);
    p.powers.update(.001,false,3);assert.equal(p.powers.spinning,false);assert.equal(p.vulnerable,true);
    p.hurt(0,2);assert.equal(p.health,3);
});

test("lightning advances at the original ten pixels/20Hz step, and hammer arcs mirror",()=>{
    const p=fixture();assert.equal(p.powers.cast(1),true);
    const x=p.powers.projectiles[0].x;p.powers.update(.05,false,1);
    assert.equal(p.powers.projectiles[0].x,x+10*GAME_SCALE);
    const right=fixture(),left=fixture();left.facingLeft=true;
    right.powers.cast(2);left.powers.cast(2);
    right.powers.update(.3,false,2);left.powers.update(.3,false,2);
    const r=right.powers.projectiles[0],l=left.powers.projectiles[0];
    assert.ok(r.y<right.origin.y);assert.equal(r.y,l.y);
    assert.ok(Math.abs((r.x-right.origin.x)+(l.x-left.origin.x))<1e-8);
    right.powers.update(5,false,2);assert.equal(right.powers.projectiles.length,0);
});

test("falling beyond the room always kills, including during spin, and reaches game over offscreen",()=>{
    const p=fixture();p.setBounds(1000,200);p.powers.cast(3);p.body.y=300;p.invulnerable=99;
    p.update(0,pad);assert.equal(p.dead,true);assert.equal(p.health,0);
    assert.equal(p.attackHitboxes.length,0);assert.equal(p.deathDone,false);
    p.update(1.35,pad);assert.equal(p.deathDone,true);
    p.revive();p.attach(p.world,100,100);assert.equal(p.dead,false);assert.equal(p.magic,5);
});

test("L2 casts through Player.update; climbing and damage stun do not allow new casts",()=>{
    const p=fixture();p.selectedPower=1;
    const magicPad={...pad,justPressed:key=>key===Gamepad.L2,pressed:key=>key===Gamepad.L2};
    p.update(0,magicPad);assert.equal(p.magic,4.5);assert.equal(p.powers.projectiles.length,1);
    p.powers.clear();p.climbing=true;assert.equal(p.powers.cast(0),false);
    p.climbing=false;p.stun=.3;assert.equal(p.powers.cast(0),false);
});

test("canonical scene SFX keys play once per cast and looping spin stops on expiry or death",()=>{
    let plays=0,stops=0;
    const p=fixture({spin:{play(){plays++},stop(){stops++}}});
    p.powers.cast(3);assert.equal(plays,1);
    p.powers.update(1,false,3);assert.equal(stops,1);
    p.powers.cast(3);assert.equal(plays,2);
    p._die();assert.equal(stops,2);
    assert.equal(p.attackHitboxes.length,0);
});

test("falling below the room's bottom edge kills the player (limbo)",()=>{
    const p=fixture();p.setBounds(1000,500);
    p.update(0,pad);assert.equal(p.dead,false);
    p.body.y=500+200;p.update(0,pad);
    assert.equal(p.dead,true);
    assert.equal(p.health,0);
});

test("the hammer's path advances with 32-bit float arithmetic (Athena) without ever hanging",()=>{
    const p=fixture();p.unlockedPowers=4;
    const real=Math.hypot,fr=Math.fround;
    // Model float32: every length and offset the loop sees is rounded like the console does.
    Math.hypot=(...a)=>fr(real(...a));
    try{
        for(const dt of [1/60,1/30,1/20,.0166667,.0333333,.05]){
            p.magic=5;p.powers.clear();
            assert.equal(p.powers.cast(2),true);
            const hammer=p.powers.projectiles[0];
            const original=Object.getOwnPropertyDescriptor(hammer,"pathOffset");
            let offset=fr(0);
            Object.defineProperty(hammer,"pathOffset",{get:()=>offset,set:v=>{offset=fr(v);},configurable:true});
            let steps=0;
            while(p.powers.projectiles.length&&steps<2000){p.powers.update(dt,false,2);steps++;}
            assert.equal(p.powers.projectiles.length,0,`finished at dt=${dt}`);
            assert.ok(steps<2000,`dt=${dt}`);
            void original;
        }
    }finally{Math.hypot=real;}
});
