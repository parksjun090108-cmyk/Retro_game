import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import usePlayerStore from '../store/usePlayerStore';
import { saveRecord } from '../api';
import useBgm, { PONG_TRACKS } from '../hooks/useBgm';
import { sfxPaddleHit, sfxWallHit, sfxLifeLost, sfxGameOver, sfxCountdown, sfxGo } from '../hooks/useSfx';
import './GamePage.css';

// ── 상수 ──────────────────────────────────────────
const CANVAS_W = 900;
const CANVAS_H = 600;
const PADDLE_W = 14;
const PADDLE_H = 90;
const BALL_R   = 8;
const MAX_LIVES = 3;

const BALL_SPEED_INIT = 5;
const BALL_SPEED_MAX  = 15;
const BALL_SPEED_INC  = 0.25;

const AI_SPEED = 4.2;
const AI_ERROR = 28;

const GAME_ID = 1;

// ── 유틸 ──────────────────────────────────────────
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const rand   = (a, b) => Math.random() * (b - a) + a;

function initBall() {
  const angle = rand(-Math.PI / 4, Math.PI / 4);
  const dir   = Math.random() < 0.5 ? 1 : -1;
  return {
    x: CANVAS_W / 2,
    y: CANVAS_H / 2,
    vx: dir * BALL_SPEED_INIT * Math.cos(angle),
    vy: BALL_SPEED_INIT * Math.sin(angle),
    speed: BALL_SPEED_INIT,
    trail: [],
  };
}

// ── 컴포넌트 ──────────────────────────────────────
export default function GamePage() {
  const navigate  = useNavigate();
  const { id: playerId, nickname } = usePlayerStore();

  const canvasRef = useRef(null);
  const stateRef  = useRef(null);
  const rafRef    = useRef(null);
  const keysRef   = useRef({});

  // React 상태 (HUD 표시용)
  const [lives,     setLives]     = useState(MAX_LIVES);
  const [rallies,   setRallies]   = useState(0);   // 버틴 총 랠리 수
  const [speedMult, setSpeedMult] = useState(1);
  const [phase,     setPhase]     = useState('countdown'); // countdown | playing | over
  const [countdown, setCountdown] = useState(3);
  const [saving,    setSaving]    = useState(false);

  // 게임 중에만 BGM 재생
  useBgm(0.18, phase === 'playing' || phase === 'countdown', 'pong', PONG_TRACKS);

  // ── 플레이어 없으면 메인으로 ──
  useEffect(() => {
    if (!playerId) navigate('/');
  }, [playerId, navigate]);

  // ── 게임 상태 초기화 ──
  const resetState = useCallback(() => {
    stateRef.current = {
      playerPaddle: { x: 30,                    y: CANVAS_H / 2 - PADDLE_H / 2 },
      aiPaddle:     { x: CANVAS_W - 30 - PADDLE_W, y: CANVAS_H / 2 - PADDLE_H / 2 },
      ball:         initBall(),
      lives:        MAX_LIVES,
      rallies:      0,       // 공을 성공적으로 받아친 횟수
      particles:    [],
      flashTimer:   0,
      flashColor:   '',
      aiTargetY:     CANVAS_H / 2,
      aiNeedsUpdate: true,
      aiReactionTimer: 0,
      lifeLostTimer: 0,      // 목숨 잃은 직후 잠깐 멈춤
    };
  }, []);

  // ── 키보드 ──
  useEffect(() => {
    const down = (e) => { keysRef.current[e.key] = true; };
    const up   = (e) => { keysRef.current[e.key] = false; };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup',   up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, []);

  // ── 첫 마운트: 카운트다운 시작 ──
  useEffect(() => {
    resetState();
    setLives(MAX_LIVES);
    setRallies(0);
    setSpeedMult(1);
    setPhase('countdown');
    setCountdown(3);
  }, []);

  useEffect(() => {
    if (phase !== 'countdown') return;
    if (countdown <= 0) { sfxGo(); setPhase('playing'); return; }
    sfxCountdown();
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, countdown]);

  // ── 게임 루프 ──
  useEffect(() => {
    if (phase !== 'playing') { cancelAnimationFrame(rafRef.current); return; }

    const canvas = canvasRef.current;
    const ctx    = canvas.getContext('2d');

    // ── 패들 이동 ──
    function updatePlayer() {
      const s = stateRef.current;
      const spd = 6;
      if (keysRef.current['ArrowUp']   || keysRef.current['w'] || keysRef.current['W']) s.playerPaddle.y -= spd;
      if (keysRef.current['ArrowDown'] || keysRef.current['s'] || keysRef.current['S']) s.playerPaddle.y += spd;
      s.playerPaddle.y = clamp(s.playerPaddle.y, 0, CANVAS_H - PADDLE_H);
    }

    // ── AI ──
    function updateAI() {
      const s    = stateRef.current;
      const ball = s.ball;
      const ai   = s.aiPaddle;

      // 공이 AI 쪽으로 방향 바뀔 때 반응 지연 타이머 세팅
      if (ball.vx > 0 && s.aiNeedsUpdate) {
        // 즉시 반응하지 않고 일정 프레임 후에 예측값 계산
        s.aiReactionTimer = 18; // 약 0.3초 딜레이
        s.aiNeedsUpdate   = false;
      }

      // 반응 딜레이 카운트다운
      if (s.aiReactionTimer > 0) {
        s.aiReactionTimer--;
        // 딜레이 끝나면 그 시점의 공 위치로 예측
        if (s.aiReactionTimer === 0 && ball.vx > 0) {
          const t = (ai.x - ball.x) / ball.vx;
          let py  = ball.y + ball.vy * t;
          for (let i = 0; i < 6 && (py < 0 || py > CANVAS_H); i++) {
            if (py < 0)        py = -py;
            if (py > CANVAS_H) py = 2 * CANVAS_H - py;
          }
          // 오차 크게 줘서 가끔 못 받게
          s.aiTargetY = clamp(py + rand(-AI_ERROR, AI_ERROR), 0, CANVAS_H);
        }
      }

      if (ball.vx <= 0) {
        s.aiNeedsUpdate = true;
        // 공이 멀어지면 중앙으로 천천히 복귀
        s.aiTargetY = CANVAS_H / 2;
      }

      const targetPaddleY = clamp(s.aiTargetY - PADDLE_H / 2, 0, CANVAS_H - PADDLE_H);
      const diff          = targetPaddleY - ai.y;
      // 공 속도에 비례해서 AI 최대 이동속도 증가 (아주 조금씩)
      const speedBonus    = (ball.speed - BALL_SPEED_INIT) * 0.18;
      const maxStep       = AI_SPEED + speedBonus;
      const step          = diff * 0.07;
      ai.y += clamp(step, -maxStep, maxStep);
      ai.y  = clamp(ai.y, 0, CANVAS_H - PADDLE_H);
    }

    // ── 파티클 생성 ──
    function spawnParticles(x, y, color, count = 12) {
      const s = stateRef.current;
      for (let i = 0; i < count; i++) {
        const a = rand(0, Math.PI * 2);
        const v = rand(1.5, 5);
        s.particles.push({ x, y, vx: Math.cos(a)*v, vy: Math.sin(a)*v, life: 1, color, size: rand(2, 5) });
      }
    }

    // ── 공 ──
    function updateBall() {
      const s    = stateRef.current;
      const ball = s.ball;

      // 목숨 잃은 직후 잠깐 정지
      if (s.lifeLostTimer > 0) { s.lifeLostTimer--; return; }

      ball.trail.push({ x: ball.x, y: ball.y });
      if (ball.trail.length > 12) ball.trail.shift();

      ball.x += ball.vx;
      ball.y += ball.vy;

      // 위아래 벽
      if (ball.y - BALL_R < 0)       { ball.y = BALL_R;         ball.vy =  Math.abs(ball.vy); spawnParticles(ball.x, 0,       '#00f5ff', 6); sfxWallHit(); }
      if (ball.y + BALL_R > CANVAS_H) { ball.y = CANVAS_H-BALL_R; ball.vy = -Math.abs(ball.vy); spawnParticles(ball.x, CANVAS_H, '#00f5ff', 6); sfxWallHit(); }

      // 플레이어 패들 충돌
      const pp = s.playerPaddle;
      if (ball.x - BALL_R < pp.x + PADDLE_W && ball.x + BALL_R > pp.x &&
          ball.y > pp.y && ball.y < pp.y + PADDLE_H && ball.vx < 0) {
        const hit = (ball.y - (pp.y + PADDLE_H/2)) / (PADDLE_H/2);
        const ang = hit * (Math.PI / 3);
        ball.speed = Math.min(ball.speed + BALL_SPEED_INC, BALL_SPEED_MAX);
        ball.vx    = Math.abs(ball.speed * Math.cos(ang));
        ball.vy    = ball.speed * Math.sin(ang);
        ball.x     = pp.x + PADDLE_W + BALL_R;
        s.rallies++;
        setRallies(s.rallies);
        spawnParticles(ball.x, ball.y, '#00f5ff', 14);
        sfxPaddleHit();
        s.flashTimer = 4; s.flashColor = '#00f5ff18';
        setSpeedMult(+(ball.speed / BALL_SPEED_INIT).toFixed(1));
      }

      // AI 패들 충돌
      const ap = s.aiPaddle;
      if (ball.x + BALL_R > ap.x && ball.x - BALL_R < ap.x + PADDLE_W &&
          ball.y > ap.y && ball.y < ap.y + PADDLE_H && ball.vx > 0) {
        const hit = (ball.y - (ap.y + PADDLE_H/2)) / (PADDLE_H/2);
        const ang = hit * (Math.PI / 3);
        ball.speed = Math.min(ball.speed + BALL_SPEED_INC, BALL_SPEED_MAX);
        ball.vx    = -Math.abs(ball.speed * Math.cos(ang));
        ball.vy    = ball.speed * Math.sin(ang);
        ball.x     = ap.x - BALL_R;
        spawnParticles(ball.x, ball.y, '#ff2d78', 14);
        sfxPaddleHit();
        s.flashTimer = 4; s.flashColor = '#ff2d7818';
        setSpeedMult(+(ball.speed / BALL_SPEED_INIT).toFixed(1));
      }

      // 플레이어 쪽 아웃 → 목숨 -1
      if (ball.x - BALL_R < 0) {
        spawnParticles(0, ball.y, '#ff2d78', 24);
        s.lives--;
        setLives(s.lives);
        sfxLifeLost();
        s.flashTimer = 10; s.flashColor = '#ff000030';

        if (s.lives <= 0) {
          endGame(s.rallies);
        } else {
          Object.assign(s.ball, initBall());
          s.lifeLostTimer = 60; // 약 1초 정지
          setSpeedMult(1);
        }
        return;
      }

      // AI 쪽 아웃 → 그냥 랠리 리셋 (AI는 목숨 없음)
      if (ball.x + BALL_R > CANVAS_W) {
        spawnParticles(CANVAS_W, ball.y, '#ffd700', 16);
        Object.assign(s.ball, initBall());
        setSpeedMult(1);
        return;
      }
    }

    function updateParticles() {
      const s = stateRef.current;
      s.particles = s.particles
        .map((p) => ({ ...p, x: p.x+p.vx, y: p.y+p.vy, life: p.life-0.04, vy: p.vy+0.1 }))
        .filter((p) => p.life > 0);
    }

    // ── 그리기 ──
    function draw() {
      const s = stateRef.current;
      if (!s) return;

      const time = performance.now() * 0.001; // 초 단위 시간 (애니메이션용)

      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

      // ── 1. 배경 그라디언트 ──────────────────────
      const bgGrad = ctx.createRadialGradient(CANVAS_W/2, CANVAS_H/2, 80, CANVAS_W/2, CANVAS_H/2, CANVAS_W * 0.75);
      bgGrad.addColorStop(0, '#0a0f1e');
      bgGrad.addColorStop(1, '#020408');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // ── 2. 바닥 그리드 (원근감) ─────────────────
      ctx.save();
      ctx.globalAlpha = 0.18;
      // 수평선
      for (let i = 1; i < 8; i++) {
        const y = CANVAS_H * (i / 8);
        const fade = 1 - Math.abs(i/8 - 0.5) * 1.5;
        ctx.strokeStyle = `rgba(0,245,255,${Math.max(0, fade) * 0.6})`;
        ctx.lineWidth = 0.5;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CANVAS_W, y); ctx.stroke();
      }
      // 수직 그리드 (경기장 느낌)
      for (let i = 0; i <= 12; i++) {
        const x = (CANVAS_W / 12) * i;
        ctx.strokeStyle = 'rgba(0,245,255,0.08)';
        ctx.lineWidth = 0.5;
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CANVAS_H); ctx.stroke();
      }
      ctx.restore();

      // ── 3. 코너 장식 ────────────────────────────
      const corners = [
        [0, 0, 1, 1], [CANVAS_W, 0, -1, 1],
        [0, CANVAS_H, 1, -1], [CANVAS_W, CANVAS_H, -1, -1],
      ];
      corners.forEach(([cx, cy, dx, dy]) => {
        ctx.save();
        ctx.strokeStyle = '#00f5ff';
        ctx.lineWidth = 2;
        ctx.shadowBlur = 8; ctx.shadowColor = '#00f5ff';
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        ctx.moveTo(cx + dx * 40, cy);
        ctx.lineTo(cx, cy);
        ctx.lineTo(cx, cy + dy * 40);
        ctx.stroke();
        ctx.restore();
      });

      // ── 4. 상하 테두리 네온라인 ─────────────────
      [0, CANVAS_H].forEach((y) => {
        const grad = ctx.createLinearGradient(0, y, CANVAS_W, y);
        grad.addColorStop(0,   'transparent');
        grad.addColorStop(0.3, '#00f5ff');
        grad.addColorStop(0.7, '#00f5ff');
        grad.addColorStop(1,   'transparent');
        ctx.save();
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.5;
        ctx.shadowBlur = 12; ctx.shadowColor = '#00f5ff';
        ctx.globalAlpha = 0.7;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CANVAS_W, y); ctx.stroke();
        ctx.restore();
      });

      // ── 5. 플레이어 영역 글로우 ─────────────────
      // 왼쪽 (플레이어) — 시안
      const leftGlow = ctx.createLinearGradient(0, 0, 120, 0);
      leftGlow.addColorStop(0,   'rgba(0,245,255,0.06)');
      leftGlow.addColorStop(1,   'transparent');
      ctx.fillStyle = leftGlow;
      ctx.fillRect(0, 0, 120, CANVAS_H);

      // 오른쪽 (AI) — 핑크
      const rightGlow = ctx.createLinearGradient(CANVAS_W, 0, CANVAS_W - 120, 0);
      rightGlow.addColorStop(0,   'rgba(255,45,120,0.06)');
      rightGlow.addColorStop(1,   'transparent');
      ctx.fillStyle = rightGlow;
      ctx.fillRect(CANVAS_W - 120, 0, 120, CANVAS_H);

      // ── 6. 센터라인 ─────────────────────────────
      ctx.save();
      ctx.setLineDash([10, 10]);
      ctx.lineDashOffset = -(time * 30) % 20; // 흐르는 효과
      const cGrad = ctx.createLinearGradient(CANVAS_W/2, 0, CANVAS_W/2, CANVAS_H);
      cGrad.addColorStop(0,   'transparent');
      cGrad.addColorStop(0.2, 'rgba(0,245,255,0.4)');
      cGrad.addColorStop(0.8, 'rgba(0,245,255,0.4)');
      cGrad.addColorStop(1,   'transparent');
      ctx.strokeStyle = cGrad;
      ctx.lineWidth = 1.5;
      ctx.shadowBlur = 8; ctx.shadowColor = '#00f5ff';
      ctx.beginPath(); ctx.moveTo(CANVAS_W/2, 0); ctx.lineTo(CANVAS_W/2, CANVAS_H); ctx.stroke();
      ctx.restore();

      // ── 7. 스캔라인 ─────────────────────────────
      ctx.save();
      ctx.globalAlpha = 0.04;
      for (let y = 0; y < CANVAS_H; y += 3) {
        ctx.fillStyle = '#000';
        ctx.fillRect(0, y, CANVAS_W, 1.5);
      }
      // 이동하는 스캔라인
      const scanY = (time * 80) % (CANVAS_H + 40) - 20;
      ctx.globalAlpha = 0.06;
      const scanGrad = ctx.createLinearGradient(0, scanY - 20, 0, scanY + 20);
      scanGrad.addColorStop(0,   'transparent');
      scanGrad.addColorStop(0.5, '#00f5ff');
      scanGrad.addColorStop(1,   'transparent');
      ctx.fillStyle = scanGrad;
      ctx.fillRect(0, scanY - 20, CANVAS_W, 40);
      ctx.restore();

      // ── 8. 플래시 효과 ──────────────────────────
      if (s.flashTimer > 0) {
        ctx.fillStyle = s.flashColor;
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        s.flashTimer--;
      }

      // ── 9. 공 잔상 ──────────────────────────────
      s.ball.trail.forEach((t, i) => {
        const alpha = (i / s.ball.trail.length) * 0.45;
        const r     = BALL_R * (i / s.ball.trail.length) * 0.85;
        ctx.beginPath();
        ctx.arc(t.x, t.y, r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0,245,255,${alpha})`;
        ctx.fill();
      });

      // ── 10. 공 ──────────────────────────────────
      ctx.save();
      ctx.shadowBlur = 30; ctx.shadowColor = '#00f5ff';
      ctx.beginPath(); ctx.arc(s.ball.x, s.ball.y, BALL_R, 0, Math.PI * 2);
      // 내부 그라디언트
      const ballGrad = ctx.createRadialGradient(
        s.ball.x - BALL_R * 0.3, s.ball.y - BALL_R * 0.3, 0,
        s.ball.x, s.ball.y, BALL_R
      );
      ballGrad.addColorStop(0, '#ffffff');
      ballGrad.addColorStop(1, '#00f5ff');
      ctx.fillStyle = ballGrad;
      ctx.fill();
      ctx.restore();

      // ── 11. 패들 ────────────────────────────────
      drawPaddle(ctx, s.playerPaddle.x, s.playerPaddle.y, '#00f5ff', time);
      drawPaddle(ctx, s.aiPaddle.x,     s.aiPaddle.y,     '#ff2d78', time);

      // ── 12. 파티클 ──────────────────────────────
      s.particles.forEach((p) => {
        ctx.save();
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.shadowBlur = 10; ctx.shadowColor = p.color;
        ctx.fillRect(p.x - p.size/2, p.y - p.size/2, p.size, p.size);
        ctx.restore();
      });

      // ── 13. 비네트 (가장자리 어둠) ──────────────
      const vignette = ctx.createRadialGradient(
        CANVAS_W/2, CANVAS_H/2, CANVAS_H * 0.25,
        CANVAS_W/2, CANVAS_H/2, CANVAS_W * 0.75
      );
      vignette.addColorStop(0, 'transparent');
      vignette.addColorStop(1, 'rgba(0,0,0,0.55)');
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    }

    function drawPaddle(ctx, x, y, color, time) {
      // 패들 본체
      ctx.save();
      ctx.shadowBlur = 20; ctx.shadowColor = color;

      // 패들 그라디언트
      const pg = ctx.createLinearGradient(x, y, x + PADDLE_W, y);
      pg.addColorStop(0, color);
      pg.addColorStop(1, color + '99');
      ctx.fillStyle = pg;
      ctx.beginPath(); ctx.roundRect(x, y, PADDLE_W, PADDLE_H, 4); ctx.fill();

      // 패들 내부 하이라이트
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.roundRect(x + 2, y + 4, 3, PADDLE_H - 8, 2); ctx.fill();
      ctx.restore();

      // 패들 옆 플레어 (펄스)
      const pulse = 0.5 + Math.sin(time * 3) * 0.5;
      ctx.save();
      ctx.globalAlpha = 0.15 * pulse;
      const flareGrad = ctx.createRadialGradient(x + PADDLE_W/2, y + PADDLE_H/2, 0, x + PADDLE_W/2, y + PADDLE_H/2, 50);
      flareGrad.addColorStop(0, color);
      flareGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = flareGrad;
      ctx.fillRect(x - 40, y - 20, PADDLE_W + 80, PADDLE_H + 40);
      ctx.restore();
    }

    function loop() {
      if (!stateRef.current) return;
      updatePlayer();
      updateAI();
      updateBall();
      updateParticles();
      draw();
      rafRef.current = requestAnimationFrame(loop);
    }

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [phase]);

  // ── 게임 종료 ──
  const endGame = async (finalRallies) => {
    cancelAnimationFrame(rafRef.current);
    setPhase('over');
    sfxGameOver();

    if (playerId) {
      setSaving(true);
      try {
        await saveRecord(playerId, GAME_ID, finalRallies, 'lose');
      } catch (e) {
        console.error('기록 저장 실패:', e);
      } finally {
        setSaving(false);
      }
    }
  };

  const handleRestart = () => {
    resetState();
    setLives(MAX_LIVES);
    setRallies(0);
    setSpeedMult(1);
    setCountdown(3);
    setPhase('countdown');
  };

  // 목숨 하트 표시
  const heartsArr = Array.from({ length: MAX_LIVES }, (_, i) => i < lives);

  return (
    <div className="game-page page-enter">
      {/* 상단바 */}
      <div className="game-topbar">
        <button className="game-back btn btn-pink" onClick={() => navigate('/')}>
          ← 메인으로
        </button>
        <span className="game-topbar-title neon-cyan">PING PONG</span>
        <span className="game-topbar-hint">W / S  또는  ↑ / ↓  —  패들 이동</span>
      </div>

      {/* HUD */}
      <div className="hud">
        <div className="hud-player">
          <span className="hud-label neon-cyan">{nickname || 'PLAYER'}</span>
          <div className="hud-hearts">
            {heartsArr.map((alive, i) => (
              <span key={i} className={`heart ${alive ? 'alive' : 'dead'}`}>♥</span>
            ))}
          </div>
        </div>

        <div className="hud-center">
          <div className="hud-rallies">
            <span className="hud-rallies-label">RALLY</span>
            <span className="hud-rallies-num neon-cyan">{rallies}</span>
          </div>
          <div className="hud-speed">SPEED <span className="neon-pink">×{speedMult}</span></div>
        </div>

        <div className="hud-ai">
          <span className="hud-label neon-pink">CPU</span>
        </div>
      </div>

      {/* 캔버스 */}
      <div className="canvas-wrapper">
        <canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H} className="game-canvas" />

        {/* 카운트다운 */}
        {phase === 'countdown' && (
          <div className="overlay">
            <span className="countdown-num neon-cyan">
              {countdown > 0 ? countdown : 'GO!'}
            </span>
          </div>
        )}

        {/* 게임 오버 */}
        {phase === 'over' && (
          <div className="overlay">
            <div className="result-overlay">
              <div className="result-title neon-pink">GAME OVER</div>
              <div className="result-rally-wrap">
                <span className="result-rally-label">RALLIES SURVIVED</span>
                <span className="result-rally-num neon-cyan">{rallies}</span>
              </div>
              {saving && <div className="saving-text">기록 저장 중...</div>}
              <div className="result-buttons">
                <button className="btn btn-cyan" onClick={handleRestart}>다시 도전</button>
                <button className="btn btn-blue" onClick={() => navigate('/result', { state: { rallies } })}>결과 보기</button>
                <button className="btn btn-pink" onClick={() => navigate('/')}>메인으로</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
