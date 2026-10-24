import { SFX } from '../audio/audio.js';
import { BASE_BANISH, BASE_REROLL, CELL, S, VIEW_H, VIEW_W, XP_NEED, ZOOM } from '../core/config.js';
import { SET, store } from '../core/store.js';
import { ASSETS } from '../data/assets.js';
import { CHAR_IDS, PRESETS } from '../data/characters.js';
import { TUNE } from '../data/tuning.js';
import { AnimPlayer } from '../engine/anim.js';
import { Grid } from '../engine/grid.js';
import { Rig } from '../engine/rig.js';
import { ensureWeaponTexture, makeGameTextures, texInfo } from '../engine/textures.js';
import { renderCharCards, syncSettingsUI } from '../ui/menu.js';
import { $, SCREEN, UI, btn, joy } from '../ui/state.js';

/* 씬 1/9: 화면 흐름 · 게임 상태 초기화 · 오브젝트 생성 */
export class SceneBase extends Phaser.Scene {
  constructor() { super('main'); }

  preload() {
    for (const P of Object.values(PRESETS)) {
      for (const cfg of Object.values(P.poses)) if (!this.textures.exists(cfg.key)) this.load.image(cfg.key, cfg.src);
      if (P.weapon.src) this.load.image(P.weapon.key, P.weapon.src);
    }
    for (const group of [ASSETS.enemies, ASSETS.items])
      for (const [key, a] of Object.entries(group)) if (a && a.src) this.load.image(key, a.src);
  }

  create() {
    makeGameTextures(this);
    for (const P of Object.values(PRESETS)) ensureWeaponTexture(this, P.weapon);
    this.cameras.main.setZoom(ZOOM);
    this.bg = this.add.tileSprite(0, 0, VIEW_W + 256, VIEW_H + 256, 'grass').setOrigin(0).setDepth(-1e6);
    this.groundFx = this.add.graphics().setDepth(-1e5);
    this.overFx = this.add.graphics().setDepth(5e6);
    this.dbg = this.add.graphics().setDepth(1e7);
    this.shadow = this.add.ellipse(0, 0, 40, 10, 0x000000, .22);
    this.actor = this.add.container(0, 0);
    this.rig = new Rig(this, this.actor);

    // 오브젝트 풀
    this.MAX_ENEMIES = 1000; this.MAX_GEMS = 400;
    this.enemyPool = []; this.enemies = [];
    for (let i = 0; i < this.MAX_ENEMIES; i++) this.enemyPool.push({ img:this.add.image(0, 0, 'e_slime').setVisible(false), active:false, id:0, idx:-1 });
    this.gemPool = []; this.gems = [];
    for (let i = 0; i < this.MAX_GEMS; i++) this.gemPool.push({ img:this.add.image(0, 0, 'gem').setScale(texInfo('gem').scale).setOrigin(...texInfo('gem').origin).setVisible(false).setDepth(-5e4), active:false, idx:-1 });
    this.puffs = [];
    for (let i = 0; i < 48; i++) this.puffs.push({ img:this.add.image(0, 0, 'puff').setVisible(false), t:-1, size:1, tint:0xffffff });
    this.puffNext = 0;
    this.items = [];                                   // 음식·보물상자 (수가 적어 풀 없이 관리)
    this.texts = [];
    for (let i = 0; i < 16; i++) this.texts.push({ obj:this.add.text(0, 0, '', { fontFamily:'system-ui,sans-serif', fontSize:'15px', fontStyle:'bold', color:'#fff', stroke:'#2a2230', strokeThickness:4 }).setOrigin(.5).setDepth(6e6).setVisible(false), t:-1 });
    this.textNext = 0;
    this.nums = [];                                    // 피해 숫자 풀 (설정에서 켜고 끔)
    for (let i = 0; i < 40; i++) this.nums.push({ obj:this.add.text(0, 0, '', { fontFamily:'system-ui,sans-serif', fontSize:'13px', fontStyle:'bold', color:'#fff', stroke:'#2a2230', strokeThickness:3 }).setOrigin(.5).setDepth(6e6 - 1).setVisible(false), t:-1 });
    this.numNext = 0;
    this.eliteTexts = [0, 1, 2, 3].map(() => this.add.text(0, 0, '', { fontFamily:'system-ui,sans-serif', fontSize:'11px', fontStyle:'bold', color:'#ffe0d8', stroke:'#2a2230', strokeThickness:3 }).setOrigin(.5).setDepth(5e6 + 1).setVisible(false));
    this.friendImgs = CHAR_IDS.map(id => {
      const cfg = PRESETS[id].poses.idle, im = this.add.image(0, 0, cfg.key).setVisible(false);
      im.setOrigin(cfg.ax / im.width, cfg.ay / im.height); im.baseScale = cfg.scale * S; im.cid = id;
      return im;
    });

    this.grid = new Grid(CELL);
    this.anim = new AnimPlayer();
    this.slashes = []; this.rings = []; this.waves = []; this.trails = [];
    this.keys = this.input.keyboard.addKeys('LEFT,RIGHT,UP,DOWN,A,D,W,S,SPACE,SHIFT,U,R,P,ESC,ENTER,ONE,TWO,THREE,FOUR,FIVE,B,X');
    this.hudT = 0; this.fpsT = 0;
    this.mode = 'menu';
    this.reset();
    this.setMode('menu');
  }

  /* ================= 화면 흐름 ================= */
  setMode(m) {
    this.mode = m;
    for (const id of new Set(Object.values(SCREEN))) if (id) $(id).classList.toggle('show', SCREEN[m] === id);
    const inRun = m === 'play' || m === 'pause' || m === 'levelup' || (m === 'settings' && this.settingsBack === 'pause');
    document.body.classList.toggle('playing', inRun);
    document.body.classList.toggle('dev', !!SET.debug || SET.stress > 1);
    if (m !== 'play') { joy.x = joy.y = 0; $('knob').style.transform = ''; }
    if (m === 'pause') $('build').innerHTML = this.buildHtml();
    if (m === 'menu' || m === 'select') SFX.playMusic('title');
    else if (m === 'play') SFX.playMusic('battle');
    else if (m === 'result') SFX.playMusic('result');
    SFX.duck(m === 'pause' || m === 'levelup' || m === 'settings');
  }
  goSelect() { this.reset(); this.setMode('select'); renderCharCards(); }
  goMenu()   { this.reset(); this.setMode('menu'); }
  startRun() { SFX.init(); this.reset(); this.setMode('play'); }
  pauseGame() { if (this.mode === 'play') this.setMode('pause'); }
  resume()   { if (this.mode === 'pause') this.setMode('play'); }
  openSettings(from) { this.settingsBack = from; syncSettingsUI(); this.setMode('settings'); }
  closeSettings() { store.save(); this.setMode(this.settingsBack || 'menu'); this.settingsBack = null; }
  act(a) { // 메뉴 버튼 공통 처리
    SFX.init(); SFX.play('click');
    if (a === 'toSelect') this.goSelect();
    else if (a === 'toMenu') this.goMenu();
    else if (a === 'start' || a === 'restart') this.startRun();
    else if (a === 'resume') this.resume();
    else if (a === 'settings') this.openSettings(this.mode);
    else if (a === 'back') this.closeSettings();
    else if (a === 'fullscreen') { const d = document; if (d.fullscreenElement) d.exitFullscreen?.(); else d.documentElement.requestFullscreen?.().catch(() => {}); }
  }

  /* ================= 게임 상태 ================= */
  reset() {
    for (let i = this.enemies.length - 1; i >= 0; i--) this.releaseEnemy(this.enemies[i]);
    for (let i = this.gems.length - 1; i >= 0; i--) this.releaseGem(this.gems[i]);
    for (const p of this.puffs) { p.t = -1; p.img.setVisible(false); }
    for (const it of this.items) it.img.destroy();
    this.items.length = 0;
    for (const t of this.texts) { t.t = -1; t.obj.setVisible(false); }
    for (const n of this.nums) { n.t = -1; n.obj.setVisible(false); }
    for (const t of this.eliteTexts) t.setVisible(false);
    for (const im of this.friendImgs) im.setVisible(false);
    if (this.rig.id !== UI.char) this.rig.build(UI.char);
    else this.rig.flashT = 0;
    const C = PRESETS[UI.char].base;
    this.P = { x:0, y:0, vx:0, vy:0, dir:1, aimX:1, aimY:0, hp:C.hp, maxHp:C.hp, inv:0,
               gauge:0, lvl:1, xp:0, need:XP_NEED(1), kills:0, coins:0, alive:true };
    // 수정치: 공용 선택지·유물·1회성이 더하는 값 (대부분 %를 소수로)
    this.M = { dmg:0, aspd:0, range:0, arcLv:0, arcDeg:0, spd:0, maxhp:0, magnet:0, xp:0, kb:0, crit:0, critDmg:0,
               boss:0, lsChance:0, lsAmt:0, heal:0, coin:0, luck:0, lowHp:0, gauge:0, streak:0, spDmg:0, drList:[] };
    this.Wp = { lv:1, dmg:0, aspd:0, range:0, arc:0, width:0, kb:0, double:0, evo:false };   // 기본 무기
    this.lvC = {};        // 공용 성장형 Lv
    this.once = {};       // 1회성 보유
    this.X = {};          // 전용 선택지 Lv
    this.relics = [];     // 유물 id
    this.banned = new Set();
    this.rerolls = BASE_REROLL; this.banishes = BASE_BANISH;
    this.pity = 0; this.legends = 0; this.memo = null; this.miracle = 0; this.oldCharmUsed = false;
    this.st = { cry:0, fever:0, feverCd:0, courMax:0, hankyCd:0, candoCd:0, togetherCd:0, ramen:0, band:0, mfood:0, mfoodKind:'',
                streakT:0, pururuCd:0, regen:0, lunch:0, friends:30, friendsOn:0, friendHit:0, lsBudget:0, postInv:0 };
    this.killTimes = []; this.spGained = 0; this.lostXp = 0; this.lostT = TUNE.lostGemEvery;
    this.t = 0; this.acc = 0; this.hitstop = 0; this.pendingLv = 0; this.pendingChest = 0;
    this.spawnAcc = 0; this.nextBurst = 45; this.enemyId = 0; this.eliteIdx = 0; this.atkId = 0;
    this.atkTimer = .3; this.swing = null; this.spin = null; this.dash = null; this.rush = null; this.extra = [];
    this.slashes.length = 0; this.rings.length = 0; this.waves.length = 0; this.trails.length = 0;
    btn.spin = false; btn.pick = -1; btn.tool = null;
    this.D = this.derive();
    this.anim.play('idle', true);
    $('spinBtn').textContent = PRESETS[UI.char].spName;
  }
  setChar(id) { UI.char = id; this.rig.build(id); }
  shake(ms, k) { if (SET.shake) this.cameras.main.shake(ms, k); }
  has(rid) { return this.relics.includes(rid); }
  xm() { return this.has('photo') ? 1.2 : 1; }          // 친구들의 사진: 전용 선택지 수치 +20%
  toast(msg) { const t = $('toast'); t.textContent = msg; t.classList.remove('on'); void t.offsetWidth; t.classList.add('on'); }
  dmgNumber(x, y, v, crit) {
    const n = this.nums[this.numNext]; this.numNext = (this.numNext + 1) % this.nums.length;
    n.t = 0; n.x = x; n.y = y;
    n.obj.setText(Math.round(v) + (crit ? '!' : '')).setColor(crit ? '#ffd54a' : '#ffffff').setFontSize(crit ? 17 : 13).setPosition(x, y).setAlpha(1).setVisible(true);
  }
  pop(x, y, str, color = '#ffffff') {
    const t = this.texts[this.textNext]; this.textNext = (this.textNext + 1) % this.texts.length;
    t.t = 0; t.x = x; t.y = y;
    t.obj.setText(str).setColor(color).setPosition(x, y).setAlpha(1).setVisible(true);
  }

}
