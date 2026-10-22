import React, { useEffect, useRef } from 'react';
import './StrikeIntro.css';
import { sfxRadarSweep, sfxLockOn, sfxLockOnComplete } from '../hooks/useSfx';

/**
 * STRIKE WING 인트로 (총 2.8초)
 *
 * 0.0~0.4s  — 페이드인
 * 0.4~1.2s  — 레이더 원이 퍼져나옴 + 적기 점들 등장
 * 1.2~2.0s  — 조준선이 한 대를 락온
 * 2.0~2.5s  — STRIKE WING 타이틀 글리치 등장
 * 2.5~2.8s  — 앰버 플래시 → 전환
 */
export default function StrikeIntro({ onComplete }) {
  const canvasRef = useRef(null);
  const rafRef    = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext('2d');
    const W = canvas.width  = window.innerWidth;
    const H = canvas.height = window.innerHeight;
    const CX = W / 2, CY = H / 2;

    const TOTAL = 2800;
    let startTime = null;

    const easeOut   = (t) => 1 - Math.pow(1 - t, 3);
    const easeIn    = (t) => t * t * t;
    const norm      = (e, s, end) => Math.min(Math.max((e - s) / (end - s), 0), 1);

    // 적기 위치들 (레이더 화면 기준)
    const RADAR_R = Math.min(W, H) * 0.32;
    const blips = [
      { angle: -0.6,  dist: 0.55, size: 3 },
      { angle:  0.3,  dist: 0.72, size: 4 },  // 락온 타겟
      { angle:  1.1,  dist: 0.40, size: 3 },
      { angle: -1.4,  dist: 0.85, size: 2.5 },
      { angle:  2.0,  dist: 0.60, size: 2.5 },
    ];
    const TARGET = blips[1];

    // 레이더 스윕 각도
    let sweepAngle = -Math.PI / 2;

    // 락온 박스 애니메이션
    let lockSize = 60;

    function loop(ts) {
      if (!startTime) startTime = ts;
      const elapsed  = ts - startTime;
      const progress = Math.min(elapsed / TOTAL, 1);

      ctx.clearRect(0, 0, W, H);

      // ── 배경 ──
      ctx.fillStyle = '#06080D';
      ctx.fillRect(0, 0, W, H);

      // 페이드인
      const fadeIn = easeOut(norm(elapsed, 0, 400));
      ctx.globalAlpha = fadeIn;

      // 레이더 스윕 효과음 (0.6초마다)
      if (Math.floor(elapsed / 600) > Math.floor((elapsed - 16) / 600) && elapsed > 400 && elapsed < 1800) {
        sfxRadarSweep();
      }
      // 락온 시작
      if (elapsed > 1200 && elapsed < 1250) sfxLockOn();
      // 락온 완료
      if (elapsed > 1800 && elapsed < 1850) sfxLockOnComplete();

      // ── 레이더 (0.4s~2.0s) ──────────────────────
      const radarT = easeOut(norm(elapsed, 400, 900));
      if (radarT > 0) {
        // 레이더 원 배경
        ctx.save();
        ctx.globalAlpha = fadeIn * radarT * 0.15;
        ctx.fillStyle = '#9CFFC8';
        ctx.beginPath(); ctx.arc(CX, CY, RADAR_R, 0, Math.PI * 2); ctx.fill();
        ctx.restore();

        // 동심원들
        ctx.save();
        ctx.globalAlpha = fadeIn * radarT * 0.3;
        ctx.strokeStyle = '#9CFFC8';
        ctx.lineWidth = 0.5;
        [0.33, 0.66, 1].forEach((r) => {
          ctx.beginPath(); ctx.arc(CX, CY, RADAR_R * r, 0, Math.PI * 2); ctx.stroke();
        });
        // 십자선
        ctx.beginPath(); ctx.moveTo(CX - RADAR_R, CY); ctx.lineTo(CX + RADAR_R, CY); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(CX, CY - RADAR_R); ctx.lineTo(CX, CY + RADAR_R); ctx.stroke();
        ctx.restore();

        // 스윕
        sweepAngle += 0.03;
        ctx.save();
        ctx.globalAlpha = fadeIn * radarT;
        const sweepGrad = ctx.createConicalGradient
          ? null : null; // 캔버스 API 없으니 직접
        // 스윕 선
        ctx.strokeStyle = '#9CFFC8';
        ctx.lineWidth = 1.5;
        ctx.shadowBlur = 8; ctx.shadowColor = '#9CFFC8';
        ctx.beginPath();
        ctx.moveTo(CX, CY);
        ctx.lineTo(
          CX + Math.cos(sweepAngle) * RADAR_R,
          CY + Math.sin(sweepAngle) * RADAR_R
        );
        ctx.stroke();
        // 스윕 잔광 (부채꼴)
        ctx.globalAlpha = fadeIn * radarT * 0.12;
        ctx.fillStyle = '#9CFFC8';
        ctx.beginPath();
        ctx.moveTo(CX, CY);
        ctx.arc(CX, CY, RADAR_R, sweepAngle - 0.6, sweepAngle);
        ctx.closePath(); ctx.fill();
        ctx.restore();

        // 블립(적기)
        blips.forEach((b, i) => {
          const bx = CX + Math.cos(b.angle) * RADAR_R * b.dist;
          const by = CY + Math.sin(b.angle) * RADAR_R * b.dist;
          // 스윕이 지나갈 때만 밝게
          const da = ((sweepAngle - b.angle) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
          const bAlpha = da < 1.2 ? (1 - da / 1.2) : 0.15;
          ctx.save();
          ctx.globalAlpha = fadeIn * radarT * (0.3 + bAlpha * 0.7);
          ctx.fillStyle = '#FFC24A';
          ctx.shadowBlur = 6; ctx.shadowColor = '#FFC24A';
          ctx.beginPath(); ctx.arc(bx, by, b.size, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
        });
      }

      // ── 락온 박스 (1.2s~2.0s) ────────────────────
      const lockT = easeOut(norm(elapsed, 1200, 1900));
      if (lockT > 0) {
        const tx = CX + Math.cos(TARGET.angle) * RADAR_R * TARGET.dist;
        const ty = CY + Math.sin(TARGET.angle) * RADAR_R * TARGET.dist;
        lockSize = 60 - lockT * 40; // 60 → 20으로 좁혀짐

        const pulse = 0.7 + Math.sin(elapsed * 0.02) * 0.3;
        ctx.save();
        ctx.globalAlpha = fadeIn * lockT * pulse;
        ctx.strokeStyle = '#FF5A4E';
        ctx.lineWidth = 1.5;
        ctx.shadowBlur = 10; ctx.shadowColor = '#FF5A4E';
        // 락온 L자 코너
        const s = lockSize;
        const corners = [[-1,-1],[1,-1],[1,1],[-1,1]];
        corners.forEach(([dx, dy]) => {
          const cx2 = tx + dx * s, cy2 = ty + dy * s;
          const len = s * 0.35;
          ctx.beginPath();
          ctx.moveTo(cx2 + dx * -len, cy2);
          ctx.lineTo(cx2, cy2);
          ctx.lineTo(cx2, cy2 + dy * -len);
          ctx.stroke();
        });
        // 중앙 십자
        ctx.globalAlpha = fadeIn * lockT * 0.6;
        ctx.beginPath(); ctx.moveTo(tx - 6, ty); ctx.lineTo(tx + 6, ty); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(tx, ty - 6); ctx.lineTo(tx, ty + 6); ctx.stroke();
        ctx.restore();
      }

      // ── 타이틀 (2.0s~2.5s) ───────────────────────
      const titleT = easeOut(norm(elapsed, 2000, 2450));
      if (titleT > 0) {
        const glitch = Math.random() < 0.2 ? (Math.random() - 0.5) * 10 : 0;
        ctx.save();
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = `800 ${Math.floor(W * 0.085)}px 'Orbitron', sans-serif`;

        if (glitch) {
          ctx.globalAlpha = titleT * 0.5;
          ctx.fillStyle = '#FF5A4E';
          ctx.fillText('STRIKE WING', CX + glitch, CY - 2);
          ctx.fillStyle = '#9CFFC8';
          ctx.fillText('STRIKE WING', CX - glitch, CY + 2);
        }

        ctx.globalAlpha = titleT;
        ctx.shadowBlur = 30; ctx.shadowColor = '#FFC24A';
        ctx.fillStyle = '#FFC24A';
        ctx.fillText('STRIKE WING', CX, CY);

        ctx.font = `400 ${Math.floor(W * 0.016)}px 'Orbitron', sans-serif`;
        ctx.shadowBlur = 10; ctx.shadowColor = '#9CFFC8';
        ctx.fillStyle = '#9CFFC8';
        ctx.globalAlpha = titleT * 0.9;
        ctx.fillText('AERIAL COMBAT', CX, CY + Math.floor(W * 0.06));
        ctx.restore();
      }

      // ── 앰버 플래시 아웃 (2.5s~2.8s) ────────────
      const outT = easeIn(norm(elapsed, 2500, 2800));
      if (outT > 0) {
        ctx.globalAlpha = 1;
        ctx.fillStyle = `rgba(255,194,74,${outT * 0.9})`;
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

  return <canvas ref={canvasRef} className="strike-intro-canvas" />;
}
