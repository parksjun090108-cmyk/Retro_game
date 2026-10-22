import React, { useEffect, useRef } from 'react';
import './GameIntro.css';
import { sfxIntroBounce, sfxIntroSlide } from '../hooks/useSfx';

/**
 * 인트로 시퀀스 (총 2.8초)
 *
 * 0.0s ~ 0.4s  — 검은 화면에서 페이드인
 * 0.4s ~ 1.0s  — 왼쪽 패들 / 오른쪽 패들 슬라이드인 + 공 중앙 등장
 * 1.0s ~ 1.8s  — 공이 좌우로 한 번 랠리
 * 1.8s ~ 2.4s  — "PING PONG" 타이틀 글리치 등장
 * 2.4s ~ 2.8s  — 화면 전체 줌+화이트아웃 → onComplete
 */
export default function GameIntro({ onComplete }) {
  const canvasRef = useRef(null);
  const rafRef    = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext('2d');
    const W      = canvas.width  = window.innerWidth;
    const H      = canvas.height = window.innerHeight;

    const TOTAL = 2800;
    let startTime = null;

    // ── 오브젝트 ───────────────────────────────
    const PW = 14, PH = 110;
    const left  = { x: W * 0.08, y: H / 2 - PH / 2 };
    const right = { x: W * 0.92 - PW, y: H / 2 - PH / 2 };

    const ball = { x: W / 2, y: H / 2, vx: 0, vy: 0, r: 10 };

    // 공 궤적
    const trail = [];

    // 글리치용 오프셋
    let glitchOffset = 0;

    // ── 이징 함수 ──────────────────────────────
    const easeOut  = (t) => 1 - Math.pow(1 - t, 3);
    const easeIn   = (t) => t * t * t;
    const easeInOut= (t) => t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2,3)/2;

    // ── 구간 정규화 ────────────────────────────
    // elapsed를 [start, end] 구간 안에서 0~1로 정규화
    const norm = (e, s, end) => Math.min(Math.max((e - s) / (end - s), 0), 1);

    function loop(ts) {
      if (!startTime) startTime = ts;
      const elapsed  = ts - startTime;
      const progress = Math.min(elapsed / TOTAL, 1);

      ctx.clearRect(0, 0, W, H);

      // ── 배경 ──────────────────────────────────
      ctx.fillStyle = '#050810';
      ctx.fillRect(0, 0, W, H);

      // 페이드인 오버레이
      const fadeIn = easeOut(norm(elapsed, 0, 400));
      if (fadeIn < 1) {
        ctx.fillStyle = `rgba(5,8,16,${1 - fadeIn})`;
        ctx.fillRect(0, 0, W, H);
      }

      // 미묘한 스캔라인
      ctx.save();
      ctx.globalAlpha = 0.06;
      for (let y = 0; y < H; y += 4) {
        ctx.fillStyle = '#000';
        ctx.fillRect(0, y, W, 2);
      }
      ctx.restore();

      // ── 센터 구분선 ───────────────────────────
      const lineAlpha = easeOut(norm(elapsed, 300, 700)) * 0.3;
      if (lineAlpha > 0) {
        ctx.save();
        ctx.globalAlpha = lineAlpha;
        ctx.setLineDash([14, 14]);
        ctx.strokeStyle = '#00f5ff';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(W/2, 0); ctx.lineTo(W/2, H); ctx.stroke();
        ctx.restore();
      }

      // ── 패들 슬라이드인 ───────────────────────
      const paddleT = easeOut(norm(elapsed, 400, 900));
      // 슬라이드 시작 시점 효과음 (한 번만)
      if (elapsed > 400 && elapsed < 450) sfxIntroSlide();

      // 왼쪽: 왼쪽 밖에서 슬라이드
      const lx = left.x - (1 - paddleT) * (left.x + PW + 40);
      // 오른쪽: 오른쪽 밖에서 슬라이드
      const rx = right.x + (1 - paddleT) * (W - right.x + 40);

      if (paddleT > 0) {
        drawPaddle(ctx, lx, left.y,  PW, PH, '#00f5ff', paddleT);
        drawPaddle(ctx, rx, right.y, PW, PH, '#ff2d78', paddleT);
      }

      // ── 공 ────────────────────────────────────
      // 1구간: 중앙 팝인 (0.7~1.0s)
      const ballPopT = easeOut(norm(elapsed, 700, 1000));

      // 2구간: 실제 이동 (1.0s~1.8s)
      const rallyT = norm(elapsed, 1000, 1800);

      if (rallyT === 0) {
        // 팝인: 중앙에서 크기 증가
        ball.x = W / 2;
        ball.y = H / 2;
        if (ballPopT > 0) {
          const popR = ball.r * ballPopT;
          drawBall(ctx, ball.x, ball.y, popR, ballPopT, []);
        }
      } else {
        // 랠리 이동 (선형 왕복)
        const dist = right.x - PW - left.x - PW;
        // 0~0.5: 왼→오, 0.5~1: 오→왼
        let bx;
        if (rallyT <= 0.5) {
          bx = (left.x + PW) + dist * easeInOut(rallyT * 2);
        } else {
          bx = (right.x) - dist * easeInOut((rallyT - 0.5) * 2);
        }
        ball.x = bx;
        ball.y = H / 2 + Math.sin(rallyT * Math.PI * 2) * (H * 0.18);

        // 반환 지점(패들 히트)에서 효과음
        const prevRallyT = (ts - startTime - 16) / 800;
        if ((prevRallyT < 0.5 && rallyT >= 0.5) || (prevRallyT < 1.0 && rallyT >= 1.0)) {
          sfxIntroBounce();
        }

        trail.push({ x: ball.x, y: ball.y });
        if (trail.length > 18) trail.shift();

        drawBall(ctx, ball.x, ball.y, ball.r, 1, trail);

        // 패들이 공에 반응해서 Y 이동
        const followSpeed = 0.3;
        left.y  += (ball.y - PH/2 - left.y)  * followSpeed;
        right.y += (ball.y - PH/2 - right.y) * followSpeed;

        // 패들 다시 그리기 (공 위에 겹침 방지를 위해 순서 조정)
        drawPaddle(ctx, lx, left.y,  PW, PH, '#00f5ff', 1);
        drawPaddle(ctx, rx, right.y, PW, PH, '#ff2d78', 1);
      }

      // ── 타이틀 텍스트 (1.8s~2.4s) ────────────
      const titleT = easeOut(norm(elapsed, 1800, 2300));
      if (titleT > 0) {
        glitchOffset = Math.random() < 0.15 ? (Math.random() - 0.5) * 12 : 0;

        ctx.save();
        ctx.globalAlpha = titleT;
        ctx.font = `900 ${Math.floor(W * 0.09)}px 'Orbitron', sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // 글리치 레이어 1 (빨강)
        if (glitchOffset !== 0) {
          ctx.fillStyle = '#ff2d78';
          ctx.globalAlpha = titleT * 0.6;
          ctx.fillText('PING PONG', W/2 + glitchOffset, H/2 - 2);
        }

        // 글리치 레이어 2 (파랑)
        if (glitchOffset !== 0) {
          ctx.fillStyle = '#0080ff';
          ctx.globalAlpha = titleT * 0.6;
          ctx.fillText('PING PONG', W/2 - glitchOffset, H/2 + 2);
        }

        // 메인 텍스트
        ctx.globalAlpha = titleT;
        ctx.shadowBlur  = 40;
        ctx.shadowColor = '#00f5ff';
        ctx.fillStyle   = '#ffffff';
        ctx.fillText('PING PONG', W/2, H/2);

        // 서브텍스트
        ctx.font = `400 ${Math.floor(W * 0.018)}px 'Orbitron', sans-serif`;
        ctx.shadowBlur  = 12;
        ctx.shadowColor = '#00f5ff';
        ctx.fillStyle   = '#00f5ff';
        ctx.globalAlpha = titleT * 0.9;
        ctx.fillText('REBOOT', W/2, H/2 + Math.floor(W * 0.065));
        ctx.restore();
      }

      // ── 줌아웃 + 화이트아웃 (2.4s~2.8s) ──────
      const outT = easeIn(norm(elapsed, 2400, 2800));
      if (outT > 0) {
        // 화이트아웃
        ctx.fillStyle = `rgba(0, 245, 255, ${outT * 0.92})`;
        ctx.fillRect(0, 0, W, H);

        // 완전 흰색 오버레이
        ctx.fillStyle = `rgba(255,255,255,${Math.max(0, outT - 0.5) * 2})`;
        ctx.fillRect(0, 0, W, H);
      }

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(loop);
      } else {
        onComplete();
      }
    }

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [onComplete]);

  return <canvas ref={canvasRef} className="game-intro-canvas" />;
}

// ── 헬퍼 ──────────────────────────────────────────
function drawPaddle(ctx, x, y, w, h, color, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.shadowBlur  = 20;
  ctx.shadowColor = color;
  ctx.fillStyle   = color;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 4);
  ctx.fill();
  ctx.restore();
}

function drawBall(ctx, x, y, r, alpha, trail) {
  // 잔상
  trail.forEach((t, i) => {
    const a = (i / trail.length) * 0.3 * alpha;
    const tr = r * (i / trail.length) * 0.8;
    ctx.beginPath();
    ctx.arc(t.x, t.y, tr, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(0,245,255,${a})`;
    ctx.fill();
  });

  // 공 본체
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.shadowBlur  = 28;
  ctx.shadowColor = '#00f5ff';
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();

  // 내부 글로우
  const grad = ctx.createRadialGradient(x - r*0.3, y - r*0.3, 0, x, y, r);
  grad.addColorStop(0, 'rgba(255,255,255,0.9)');
  grad.addColorStop(1, 'rgba(0,245,255,0.2)');
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.restore();
}
