/* 저장: 설정 + 캐릭터별 최고 기록 + 지갑(보수) + 훈련소 레벨 (localStorage) */
/* ---------- 저장 (설정 + 최고 기록) ---------- */
export const STORE_KEY = 'usagiSurvivor.v1';
export const store = {
  data: { settings:{ vol:.6, musicVol:.5, dmgNum:true, statPanel:true, statOpen:true, hpBar:true, autoAim:true, shake:true, debug:false, stress:1, speed:1 }, best:{}, wallet:0, train:{} },
  load() { try { const d = JSON.parse(localStorage.getItem(STORE_KEY)); if (d) { Object.assign(this.data.settings, d.settings); Object.assign(this.data.best, d.best); this.data.wallet = d.wallet || 0; Object.assign(this.data.train, d.train); } } catch (e) {} },
  save() { try { localStorage.setItem(STORE_KEY, JSON.stringify(this.data)); } catch (e) {} }
};
store.load();
export const SET = store.data.settings;
