/* =====================================================================
 *  오디오 엔진 (WebAudio)
 *   - 효과음: SOUNDS[name].file 이 있으면 파일 재생, 없거나 실패하면 synth 합성음
 *   - 배경음악: MUSIC[name].file 반복 재생, 장면 전환 시 페이드
 *   - 볼륨: 효과음 / 음악 별도 (설정 화면)
 *   - 브라우저 정책상 첫 클릭·키 입력 때 init() 이 불려야 소리가 남 (src/ui/menu.js 에서 처리)
 * ===================================================================== */
import { SOUNDS, MUSIC } from '../data/sounds.js';
import { SET } from '../core/store.js';

export const SFX = {
  ctx:null, master:null, sfxGain:null, musicGain:null, noiseBuf:null,
  last:{}, buffers:{}, loading:{}, cur:null, wantMusic:null,

  init() {
    try {
      if (!this.ctx) {
        const C = window.AudioContext || window.webkitAudioContext;
        if (!C) return;
        this.ctx = new C();
        this.master = this.ctx.createGain(); this.master.connect(this.ctx.destination);
        this.sfxGain = this.ctx.createGain(); this.sfxGain.connect(this.master);
        this.musicGain = this.ctx.createGain(); this.musicGain.connect(this.master);
        const b = this.ctx.createBuffer(1, this.ctx.sampleRate * .5, this.ctx.sampleRate), d = b.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        this.noiseBuf = b;
        for (const def of Object.values(SOUNDS)) if (def.file) this.load(def.file);   // 효과음 파일 미리 읽기
        if (this.wantMusic) { const w = this.wantMusic; this.wantMusic = null; this.playMusic(w); }
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
      this.setVol(SET.vol); this.setMusicVol(SET.musicVol);
    } catch (e) {}
  },
  /* 파일 → AudioBuffer (실패하면 null 로 기록해 다시 시도하지 않음) */
  load(path) {
    if (path in this.buffers) return Promise.resolve(this.buffers[path]);
    if (this.loading[path]) return this.loading[path];
    this.loading[path] = fetch(path)
      .then(r => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
      .then(a => this.ctx.decodeAudioData(a))
      .then(buf => (this.buffers[path] = buf))
      .catch(() => (this.buffers[path] = null));
    return this.loading[path];
  },
  setVol(v) { if (this.sfxGain) this.sfxGain.gain.value = v * .5; },
  setMusicVol(v) { if (this.musicGain) this.musicGain.gain.value = v * .5; },

  /* ---- 합성음 도구 (SOUNDS[].synth 에서 사용) ---- */
  tone(t, { type = 'sine', f0, f1 = f0, dur = .1, g = .3, delay = 0 }) {
    const c = this.ctx, o = c.createOscillator(), a = c.createGain();
    t += delay;
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    a.gain.setValueAtTime(g, t); a.gain.exponentialRampToValueAtTime(.001, t + dur);
    o.connect(a); a.connect(this.out); o.start(t); o.stop(t + dur + .02);
  },
  noise(t, { dur = .1, g = .2, f = 1200, f1, q = 1 }) {
    const c = this.ctx, s = c.createBufferSource(), bf = c.createBiquadFilter(), a = c.createGain();
    s.buffer = this.noiseBuf; bf.type = 'bandpass'; bf.Q.value = q;
    bf.frequency.setValueAtTime(f, t); if (f1) bf.frequency.exponentialRampToValueAtTime(f1, t + dur);
    a.gain.setValueAtTime(g, t); a.gain.exponentialRampToValueAtTime(.001, t + dur);
    s.connect(bf); bf.connect(a); a.connect(this.out); s.start(t); s.stop(t + dur + .02);
  },

  /* ---- 효과음 재생 ---- */
  play(name) {
    const d = SOUNDS[name];
    if (!d || !this.ctx || SET.vol <= 0 || this.ctx.state !== 'running') return;
    const t = this.ctx.currentTime;
    if (t - (this.last[name] ?? -9) < d.gap) return;
    this.last[name] = t;
    try {
      const v = this.ctx.createGain(); v.gain.value = d.vol ?? 1; v.connect(this.sfxGain);
      this.out = v;
      const buf = d.file ? this.buffers[d.file] : null;
      if (buf) {
        const src = this.ctx.createBufferSource();
        src.buffer = buf; src.playbackRate.value = 1 + (Math.random() * 2 - 1) * (d.pitch || 0);
        src.connect(v); src.start(t);
      } else if (d.synth) d.synth(this, t);
    } catch (e) {}
  },

  /* ---- 배경음악 ---- */
  playMusic(name) {
    const def = MUSIC[name];
    if (!this.ctx) { this.wantMusic = name; return; }       // 아직 사용자 입력 전: 나중에 재생
    if (this.cur && this.cur.name === name) return;
    this.stopMusic(.6);
    if (!def || !def.file) return;
    const token = this.cur = { name, src:null, gain:null };
    this.load(def.file).then(buf => {
      if (!buf || this.cur !== token) return;
      const g = this.ctx.createGain(), s = this.ctx.createBufferSource(), t = this.ctx.currentTime;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(def.vol ?? 1, t + .8);
      s.buffer = buf; s.loop = true; s.connect(g); g.connect(this.musicGain); s.start(t);
      token.src = s; token.gain = g;
    });
  },
  stopMusic(fade = .4) {
    const c = this.cur; this.cur = null;
    if (!c || !c.src || !this.ctx) return;
    const t = this.ctx.currentTime;
    try { c.gain.gain.cancelScheduledValues(t); c.gain.gain.setValueAtTime(c.gain.gain.value, t); c.gain.gain.linearRampToValueAtTime(0, t + fade); c.src.stop(t + fade + .05); } catch (e) {}
  },
  /* 일시정지·레벨업 중 음악을 작게 */
  duck(on) { if (this.musicGain && this.ctx) this.musicGain.gain.setTargetAtTime(SET.musicVol * .5 * (on ? .35 : 1), this.ctx.currentTime, .1); }
};
