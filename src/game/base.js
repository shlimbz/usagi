import { SFX } from '../audio/audio.js';
import { BASE_BANISH, BASE_REROLL, CELL, S, VIEW_H, VIEW_W, XP_NEED, ZOOM } from '../core/config.js';
import { SET, store } from '../core/store.js';
import { ASSETS } from '../data/assets.js';
import { CHAR_IDS, PRESETS } from '../data/characters.js';
import { TUNE } from '../data/tuning.js';
import { TRAINING } from '../data/training.js';
import { ORBIT } from '../data/neutrals.js';
import { SHOT_RULES } from '../data/enemies.js';
import { AnimPlayer } from '../engine/anim.js';
import { Grid } from '../engine/grid.js';
import { Rig } from '../engine/rig.js';
import { ensureWeaponTexture, makeGameTextures, texInfo } from '../engine/textures.js';
import { renderCharCards, renderTraining, syncSettingsUI } from '../ui/menu.js';
import { $, SCREEN, UI, btn, joy } from '../ui/state.js';

/* 씬 1/9: 화면 흐름 · 게임 상태 초기화 · 오브젝트 생성 */
export class SceneBase extends Phaser.Scene {
  constructor() { super('main'); }

  preload() {
    for (const P of Object.values(PRESETS)) {
      for (const cfg of Object.values(P.poses)) if (!this.textures.exists(cfg.key)) this.load.image(cfg.key, cfg.src);
      if (P.weapon.src) this.load.image(P.weapon.key, P.weapon.src);
    }
    for (const group of [ASSETS.enemies, ASSETS.items, ASSETS.neutrals])
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
    this.items = [];                                   // 맵 아이템·보물상자 (수가 적어 풀 없이 관리, src/data/items.js)
    this.shotPool = []; this.shots = [];               // 적 투사체 풀
    for (let i = 0; i < SHOT_RULES.max; i++) this.shotPool.push({ img:this.add.image(0, 0, 'e_shot').setScale(texInfo('e_shot').scale).setOrigin(...texInfo('e_shot').origin).setVisible(false), active:false, idx:-1 });
    this.orbImgs = [];                                 // 궤도 별 (노란별 동료는 노란별 그림)
    for (let i = 0; i < ORBIT.max; i++) this.orbImgs.push(this.add.image(0, 0, 'orb_star').setVisible(false));
    this.neutralText = this.add.text(0, 0, '', { fontFamily:'system-ui,sans-serif', fontSize:'11px', fontStyle:'bold', color:'#fff', stroke:'#2a2230', strokeThickness:3, align:'center' }).setOrigin(.5, 1).setDepth(6e6).setVisible(false);
    this.bolts = [];                                   // 번개 연쇄 이펙트
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
    const inRun = m === 'play' || m === 'pause' || m === 'levelup' || m === 'shop' || (m === 'settings' && this.settingsBack === 'pause');
    document.body.classList.toggle('playing', inRun);
    document.body.classList.toggle('dev', !!SET.debug || SET.stress > 1);
    if (m !== 'play') { joy.x = joy.y = 0; $('knob').style.transform = ''; }
    if (m === 'pause') $('build').innerHTML = this.buildHtml();
    if (m === 'menu' || m === 'select' || m === 'training') SFX.playMusic('title');
    else if (m === 'play') SFX.playMusic(this.X && this.X.sing ? 'sing' : 'battle');   // 하치와레 '노래하기' 보유 시 혼잣말
    else if (m === 'result') SFX.playMusic('result');
    SFX.duck(m === 'pause' || m === 'levelup' || m === 'settings' || m === 'shop');
  }
  goSelect() { this.bankCoins(); this.reset(); this.setMode('select'); renderCharCards(); }
  goMenu()   { this.bankCoins(); this.reset(); this.setMode('menu'); }
  startRun() { SFX.init(); this.bankCoins(); this.reset(); this.setMode('play'); }
  /* 판에서 모은 보수를 지갑(훈련소용)에 저장 — 판이 끝나거나 중간에 나갈 때 한 번 */
  bankCoins() {
    if (this.banked || !this.P || !(this.t > 0)) return 0;
    this.banked = true;
    const v = Math.max(0, Math.floor(this.P.coins));
    store.data.wallet = (store.data.wallet || 0) + v; store.save();
    return v;
  }
  addCoins(v) { const n = Math.round(v * (1 + this.M.coin) * this.R.coinMul); this.P.coins += n; return n; }
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
    else if (a === 'training') { this.setMode('training'); renderTraining(); }
    else if (a === 'shopLeave') this.leaveShop();
    else if (a === 'fullscreen') { const d = document; if (d.fullscreenElement) d.exitFullscreen?.(); else d.documentElement.requestFullscreen?.().catch(() => {}); }
  }

  /* ================= 게임 상태 ================= */
  reset() {
    for (let i = this.enemies.length - 1; i >= 0; i--) this.releaseEnemy(this.enemies[i]);
    for (let i = this.gems.length - 1; i >= 0; i--) this.releaseGem(this.gems[i]);
    for (const p of this.puffs) { p.t = -1; p.img.setVisible(false); }
    for (const it of this.items) it.img.destroy();
    this.items.length = 0;
    for (let i = this.shots.length - 1; i >= 0; i--) this.releaseShot(this.shots[i]);
    if (this.neutral) { this.neutral.img.destroy(); this.neutral = null; }
    this.neutralText.setVisible(false);
    for (const im of this.orbImgs) im.setVisible(false);
    this.bolts.length = 0;
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
               boss:0, lsChance:0, lsAmt:0, heal:0, coin:0, luck:0, lowHp:0, gauge:0, streak:0, spDmg:0, orbs:0, orbDmg:0, drList:[] };
    // 특수 규칙: 거래(검은별)·상점·특이 유물이 바꾸는 값. 기본값이면 아무 효과 없음
    this.R = { hpDrain:0,      // 매초 최대 체력의 이 비율만큼 체력 감소 (1 아래로는 안 내려감)
               dmgTaken:0,     // 받는 피해 추가 (+0.2 = 20% 더 받음)
               healMul:1,      // 회복량 배율
               noHeal:false,   // true 면 흡혈 말고는 회복 안 됨
               coinMul:1,      // 보수 배율
               thorns:0,       // 맞을 때 원래 피해 × thorns 를 주변 적에게
               overflow:0,     // 체력이 가득할 때 넘친 회복량 × overflow 를 주변 피해로
               regen:0,        // 5초마다 최대 체력의 이 비율 회복
               shieldCd:0,     // 0보다 크면 이 간격(초)마다 피해 1번 막는 보호막
               berserk:0,      // 잃은 체력 비율 × berserk 만큼 공격력
               allinDmg:0,     // 올인으로 얻은 공격력
               chaos:false,    // 혼돈의 계약
               gemBomb:0,      // 경험치 구슬을 먹을 때 폭발 확률
               basicMul:1,     // 기본 공격 피해 배율
               widthMul:1,     // 창 폭·휘두름 각도 배율
               rareNext:0 };   // 다음 레벨업 N번은 희귀 이상만
    this.Wp = { lv:1, dmg:0, aspd:0, range:0, arc:0, width:0, kb:0, double:0, evo:false };   // 기본 무기
    this.lvC = {};        // 공용 성장형 Lv
    this.once = {};       // 1회성 보유
    this.X = {};          // 전용 선택지 Lv
    this.relics = [];     // 유물 id
    this.banned = new Set();
    this.rerolls = BASE_REROLL; this.banishes = BASE_BANISH;
    for (const tr of TRAINING) {                       // 훈련소 영구 강화
      const lv = Math.min(tr.cost.length, store.data.train[tr.id] || 0);
      if (!lv) continue;
      if (tr.key === 'reroll') this.rerolls += tr.per * lv; else this.M[tr.key] += tr.per * lv;
    }
    this.pals = 0; this.orbAng = 0; this.orbPos = []; this.neutral = null; this.neutralT = 0; this.fieldT = 0;
    this.tradesTaken = new Set(); this.shopBought = {}; this.shopOffer = []; this.banked = false; this.boss = null; this.schedIdx = 0;
    this.chainBudget = 0; this.bombBudget = 0;
    this.log = { boss:0, mid:0, neutrals:0, shop:0, trades:0 };   // 판 기록 (결과·시뮬레이션용)
    this.pity = 0; this.legends = 0; this.memo = null; this.miracle = 0; this.oldCharmUsed = false;
    this.st = { cry:0, fever:0, feverCd:0, courMax:0, hankyCd:0, candoCd:0, togetherCd:0, ramen:0, band:0, mfood:0, mfoodKind:'',
                streakT:0, pururuCd:0, regen:0, lunch:0, friends:30, friendsOn:0, friendHit:0, lsBudget:0, postInv:0,
                shield:0, shieldT:0, chaosT:20, chaosOn:0, chaosInv:0, chaosKind:'', freeze:0, starInv:0, rRegen:0, overflowAcc:0 };
    this.killTimes = []; this.spGained = 0; this.lostXp = 0; this.lostT = TUNE.lostGemEvery;
    this.t = 0; this.acc = 0; this.hitstop = 0; this.pendingLv = 0; this.pendingChest = 0;
    this.spawnAcc = 0; this.nextBurst = 45; this.enemyId = 0; this.atkId = 0;
    this.atkTimer = .3; this.swing = null; this.spin = null; this.dash = null; this.rush = null; this.extra = [];
    this.slashes.length = 0; this.rings.length = 0; this.waves.length = 0; this.trails.length = 0;
    btn.spin = false; btn.pick = -1; btn.tool = null;
    this.D = this.derive();
    if (this.M.maxhp) { this.P.maxHp = Math.round(C.hp * this.D.maxHpMul); this.P.hp = this.P.maxHp; }
    this.anim.play('idle', true);
    $('spinBtn').textContent = '필살!';                     // 필살기 이름은 목소리로 나오므로 버튼은 짧게
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
