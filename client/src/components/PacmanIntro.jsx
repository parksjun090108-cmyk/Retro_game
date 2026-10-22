import React, { useEffect, useRef } from 'react';
import './PacmanIntro.css';
import { sfxLockOnComplete, sfxCountdown } from '../hooks/useSfx';

/**
 * METRO PACMAN 인트로 (총 4.5초)
 * 0.0~0.6s  — 검은 화면 페이드인
 * 0.6~1.6s  — 미로 격자 + 트랙라인 등장
 * 1.6~3.2s  — 팩맨이 도트 먹으며 이동, 유령 2마리 추격
 * 3.2~4.0s  — METRO PACMAN 타이틀 글리치 등장
 * 4.0~4.5s  — 핑크 플래시 아웃
 */
export default function PacmanIntro({ onComplete }) {
  const canvasRef = useRef(null);
  const rafRef    = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext('2d');
    const W = canvas.width  = window.innerWidth;
    const H = canvas.height = window.innerHeight;
    const CX = W / 2, CY = H / 2;

    const TOTAL = 4500;
    let startTime = null;

    const easeOut = (t) => 1 - Math.pow(1 - t, 3);
    const easeIn  = (t) => t * t * t;
    const norm    = (e, s, end) => Math.min(Math.max((e - s) / (end - s), 0), 1);

    const TRACK_Y  = CY + 20;
    const PAC_R    = 26;
    const GHOST_R  = 22;

    // 도트 16개
    const DOTS = Array.from({ length: 16 }, (_, i) => ({
      x: W * 0.08 + (W * 0.84 / 15) * i,
      eaten: false,
      power: i === 3 || i === 12, // 파워 도트 2개
    }));

    let sfxTitlePlayed = false;
    let lastEatSfx = 0;

    function playEatSfx(ts) {
      if (ts - lastEatSfx < 120) return;
      lastEatSfx = ts;
      try {
        const c = new (window.AudioContext || window.webkitAudioContext)();
        const o = c.createOscillator();
        const g = c.createGain();
        o.connect(g); g.connect(c.destination);
        o.type = 'square';
        o.frequency.setValueAtTime(500, c.currentTime);
        o.frequency.linearRampToValueAtTime(900, c.currentTime + 0.05);
        g.gain.setValueAtTime(0.15, c.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.08);
        o.start(); o.stop(c.currentTime + 0.09);
      } catch(e) {}
    }

    function drawPacman(x, y, mouthAngle) {
      ctx.save();
      ctx.shadowBlur = 24; ctx.shadowColor = '#ffe44d';
      ctx.fillStyle = '#ffe44d';
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.arc(x, y, PAC_R, mouthAngle, Math.PI * 2 - mouthAngle);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    function drawGhost(x, y, color, alpha) {
      if (alpha <= 0) return;
      ctx.save();
      ctx.globalAlpha = Math.min(1, alpha);
      ctx.shadowBlur = 20; ctx.shadowColor = color;
      ctx.fillStyle = color;
      const r = GHOST_R;
      ctx.beginPath();
      ctx.arc(x, y - r * 0.3, r, Math.PI, 0);
      ctx.lineTo(x + r, y + r * 0.9);
      const waves = 4;
      for (let i = waves - 1; i >= 0; i--) {
        const wx = x - r + (i + 0.5) * (r * 2 / waves);
        ctx.quadraticCurveTo(wx + r / waves * 0.5, y + r * 1.4, wx, y + r * 0.9);
      }
      ctx.closePath();
      ctx.fill();
      // 눈
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(x - 7, y - r * 0.4, 5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(x + 7, y - r * 0.4, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#1a1aff';
      ctx.beginPath(); ctx.arc(x - 6, y - r * 0.4, 2.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(x + 8, y - r * 0.4, 2.5, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    function loop(ts) {
      if (!startTime) startTime = ts;
      const elapsed  = ts - startTime;
      const progress = Math.min(elapsed / TOTAL, 1);

      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#02040c';
      ctx.fillRect(0, 0, W, H);

      const fadeIn = easeOut(norm(elapsed, 0, 600));

      // ── 격자 (0.6~1.6s) ──────────────────────
      const gridT = easeOut(norm(elapsed, 600, 1400));
      if (gridT > 0) {
        ctx.save();
        ctx.globalAlpha = fadeIn * gridT * 0.12;
        ctx.strokeStyle = '#ff2d78';
        ctx.lineWidth = 1;
        const sp = 50;
        for (let x = 0; x < W; x += sp) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
        for (let y = 0; y < H; y += sp) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
        ctx.restore();

        // 트랙 라인
        ctx.save();
        ctx.globalAlpha = fadeIn * gridT * 0.5;
        ctx.strokeStyle = '#ff7bdc';
        ctx.lineWidth = 2;
        ctx.setLineDash([12, 12]);
        ctx.beginPath(); ctx.moveTo(0, TRACK_Y); ctx.lineTo(W, TRACK_Y); ctx.stroke();
        ctx.restore();
      }

      // ── 도트 그리기 ───────────────────────────
      const dotsAlpha = easeOut(norm(elapsed, 800, 1600));
      if (dotsAlpha > 0) {
        DOTS.forEach((dot) => {
          if (dot.eaten) return;
          ctx.save();
          ctx.globalAlpha = fadeIn * dotsAlpha;
          if (dot.power) {
            const pulse = 0.7 + Math.sin(elapsed * 0.008) * 0.3;
            ctx.globalAlpha = fadeIn * dotsAlpha * pulse;
            ctx.fillStyle = '#ff7bdc';
            ctx.shadowBlur = 16; ctx.shadowColor = '#ff7bdc';
            ctx.beginPath(); ctx.arc(dot.x, TRACK_Y, 11, 0, Math.PI * 2); ctx.fill();
          } else {
            ctx.fillStyle = '#e9fbff';
            ctx.shadowBlur = 8; ctx.shadowColor = '#e9fbff';
            ctx.beginPath(); ctx.arc(dot.x, TRACK_Y, 5, 0, Math.PI * 2); ctx.fill();
          }
          ctx.restore();
        });
      }

      // ── 팩맨 + 유령 이동 (1.6~3.2s) ───────────
      const moveT = norm(elapsed, 1600, 3200);
      if (moveT > 0) {
        const pacX = -PAC_R + (W + PAC_R * 2) * easeOut(moveT);
        const mouth = Math.abs(Math.sin(elapsed * 0.012)) * 0.38;

        // 도트 먹기
        DOTS.forEach((dot) => {
          if (!dot.eaten && pacX > dot.x - 10) {
            dot.eaten = true;
            playEatSfx(ts);
          }
        });

        // 팩맨
        drawPacman(pacX, TRACK_Y, mouth);

        // 유령 — 팩맨 뒤를 따라감
        const g1x = pacX - 70;
        const g2x = pacX - 130;
        const ghostAlpha = Math.min(1, moveT * 2);
        drawGhost(g1x, TRACK_Y, '#00e5ff', ghostAlpha);
        drawGhost(g2x, TRACK_Y, '#ff4266', ghostAlpha * 0.8);
      }

      // ── 타이틀 (3.2~4.0s) ─────────────────────
      const titleT = easeOut(norm(elapsed, 3200, 3900));
      if (titleT > 0) {
        if (!sfxTitlePlayed) { sfxTitlePlayed = true; sfxLockOnComplete(); }

        const glitch = Math.random() < 0.15 ? (Math.random() - 0.5) * 10 : 0;
        ctx.save();
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = `900 ${Math.floor(W * 0.078)}px 'Orbitron', sans-serif`;

        if (glitch) {
          ctx.globalAlpha = titleT * 0.45;
          ctx.fillStyle = '#ff4266';
          ctx.fillText('METRO PACMAN', CX + glitch, CY - 2);
          ctx.fillStyle = '#00e5ff';
          ctx.fillText('METRO PACMAN', CX - glitch, CY + 2);
        }

        ctx.globalAlpha = titleT;
        ctx.shadowBlur  = 36; ctx.shadowColor = '#ff7bdc';
        ctx.fillStyle   = '#ffe44d';
        ctx.fillText('METRO PACMAN', CX, CY);

        ctx.font = `400 ${Math.floor(W * 0.018)}px 'Orbitron', sans-serif`;
        ctx.shadowBlur = 12; ctx.shadowColor = '#ff7bdc';
        ctx.fillStyle  = '#ff7bdc';
        ctx.globalAlpha = titleT * 0.95;
        ctx.fillText('AI ARCADE', CX, CY + Math.floor(W * 0.062));
        ctx.restore();
      }

      // ── 플래시 아웃 (4.0~4.5s) ────────────────
      const outT = easeIn(norm(elapsed, 4000, 4500));
      if (outT > 0) {
        ctx.globalAlpha = 1;
        ctx.fillStyle = `rgba(255,45,120,${outT * 0.9})`;
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = `rgba(255,255,255,${Math.max(0, outT - 0.5) * 2})`;
        ctx.fillRect(0, 0, W, H);
      }

      ctx.globalAlpha = 1;

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(loop);
      } else {
        onComplete();
      }
    }

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [onComplete]);

  return <canvas ref={canvasRef} className="pacman-intro-canvas" />;
}
