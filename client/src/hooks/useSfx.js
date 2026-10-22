/**
 * Web Audio API 효과음 생성기
 * 파일 없이 프로그래밍으로 사운드 생성
 */

let ctx = null;
function getCtx() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  return ctx;
}

// ── 기본 재생 헬퍼 ─────────────────────────────
function play({ type='sine', freq=440, freq2=null, duration=0.1,
                vol=0.4, attack=0.005, decay=0.05, detune=0,
                filterFreq=null, filterType='lowpass' }) {
  try {
    const c   = getCtx();
    const osc = c.createOscillator();
    const gain= c.createGain();

    if (filterFreq) {
      const f = c.createBiquadFilter();
      f.type            = filterType;
      f.frequency.value = filterFreq;
      osc.connect(f); f.connect(gain);
    } else {
      osc.connect(gain);
    }
    gain.connect(c.destination);

    osc.type            = type;
    osc.frequency.value = freq;
    osc.detune.value    = detune;
    if (freq2) osc.frequency.linearRampToValueAtTime(freq2, c.currentTime + duration);

    gain.gain.setValueAtTime(0, c.currentTime);
    gain.gain.linearRampToValueAtTime(vol, c.currentTime + attack);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);

    osc.start(c.currentTime);
    osc.stop(c.currentTime + duration + 0.01);
  } catch(e) {}
}

function noise(duration=0.1, vol=0.3, filterF=800) {
  try {
    const c      = getCtx();
    const buf    = c.createBuffer(1, c.sampleRate * duration, c.sampleRate);
    const data   = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src    = c.createBufferSource();
    src.buffer   = buf;
    const filt   = c.createBiquadFilter();
    filt.type    = 'bandpass';
    filt.frequency.value = filterF;
    filt.Q.value = 1.5;
    const gain   = c.createGain();
    gain.gain.setValueAtTime(vol, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
    src.connect(filt); filt.connect(gain); gain.connect(c.destination);
    src.start(); src.stop(c.currentTime + duration + 0.01);
  } catch(e) {}
}

// ── 효과음 정의 ────────────────────────────────

// 핑퐁 패들 히트
export function sfxPaddleHit() {
  play({ type:'square', freq:320, freq2:180, duration:0.08, vol:0.25, attack:0.002 });
}

// 핑퐁 벽 반사
export function sfxWallHit() {
  play({ type:'sine', freq:260, freq2:220, duration:0.06, vol:0.15, attack:0.001 });
}

// 핑퐁 목숨 잃기
export function sfxLifeLost() {
  play({ type:'sawtooth', freq:300, freq2:80, duration:0.4, vol:0.35, attack:0.01 });
  setTimeout(() => noise(0.15, 0.2, 400), 100);
}

// 핑퐁 게임오버
export function sfxGameOver() {
  [0, 120, 240, 360].forEach((delay, i) => {
    setTimeout(() => play({ type:'sawtooth', freq:200 - i*30, duration:0.3, vol:0.3, attack:0.01 }), delay);
  });
}

// 카운트다운 숫자
export function sfxCountdown() {
  play({ type:'sine', freq:660, duration:0.12, vol:0.3, attack:0.005 });
}

// 카운트다운 GO
export function sfxGo() {
  play({ type:'sine', freq:880, duration:0.08, vol:0.4, attack:0.003 });
  setTimeout(() => play({ type:'sine', freq:1100, duration:0.15, vol:0.4, attack:0.003 }), 80);
}

// 인트로 공 튕김 (핑퐁 인트로)
export function sfxIntroBounce() {
  play({ type:'square', freq:400, freq2:250, duration:0.07, vol:0.2, attack:0.001 });
}

// 인트로 패들 등장 (핑퐁 인트로)
export function sfxIntroSlide() {
  play({ type:'sine', freq:200, freq2:400, duration:0.2, vol:0.2, attack:0.01 });
}

// 스트라이크 인트로: 레이더 스윕
export function sfxRadarSweep() {
  play({ type:'sine', freq:800, freq2:600, duration:0.15, vol:0.12, attack:0.01, filterFreq:1200 });
}

// 스트라이크 인트로: 락온
export function sfxLockOn() {
  play({ type:'square', freq:1200, duration:0.08, vol:0.2, attack:0.002 });
}

// 스트라이크 인트로: 락온 완료
export function sfxLockOnComplete() {
  [0, 80].forEach(d => setTimeout(() =>
    play({ type:'square', freq:1400, duration:0.1, vol:0.25, attack:0.002 }), d));
}
