import React, { useEffect, useRef } from 'react';
import './GridBackground.css';

const BAR_COUNT = 24;

export default function GridBackground() {
  const canvasRef = useRef(null);
  const rafRef    = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext('2d');

    const resize = () => {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // 각 막대의 독립적인 노이즈 파라미터
    const bars = Array.from({ length: BAR_COUNT }, (_, i) => ({
      phase:  Math.random() * Math.PI * 2,
      speed:  0.4 + Math.random() * 0.6,
      base:   0.12 + Math.random() * 0.15,
      amp:    0.18 + Math.random() * 0.28,
      // 중앙 쪽 막대가 더 높게
      centerBoost: 1 - Math.abs((i / BAR_COUNT) - 0.5) * 1.2,
    }));

    let t = 0;

    function draw() {
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      const barW   = W / BAR_COUNT;
      const gap    = barW * 0.22;
      const maxH   = H * 0.82;

      bars.forEach((b, i) => {
        // 여러 주파수 합성으로 자연스러운 움직임
        const noise =
          Math.sin(t * b.speed + b.phase) * 0.5 +
          Math.sin(t * b.speed * 1.7 + b.phase * 1.3) * 0.3 +
          Math.sin(t * b.speed * 0.5 + b.phase * 0.7) * 0.2;

        const heightRatio = Math.max(
          0.03,
          b.base + b.amp * ((noise + 1) / 2) * b.centerBoost
        );
        const bh = maxH * heightRatio;

        const x = i * barW + gap / 2;
        const y = H - bh;
        const w = barW - gap;

        // 높이에 따라 색상 전환 (낮으면 시안, 높으면 핑크)
        const colorT = heightRatio / (b.base + b.amp);
        const alpha  = 0.25 + colorT * 0.35;

        // 그라디언트 (아래→위)
        const grad = ctx.createLinearGradient(x, H, x, y);
        if (colorT > 0.7) {
          grad.addColorStop(0,   `rgba(0,245,255,${alpha * 0.6})`);
          grad.addColorStop(0.6, `rgba(0,245,255,${alpha})`);
          grad.addColorStop(1,   `rgba(255,45,120,${alpha})`);
        } else {
          grad.addColorStop(0,   `rgba(0,245,255,${alpha * 0.4})`);
          grad.addColorStop(1,   `rgba(0,245,255,${alpha})`);
        }

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(x, y, w, bh, 1.5);
        ctx.fill();

        // 상단 밝은 캡
        ctx.fillStyle = colorT > 0.7
          ? `rgba(255,45,120,${alpha + 0.15})`
          : `rgba(0,245,255,${alpha + 0.1})`;
        ctx.fillRect(x, y, w, 2);
      });

      t += 0.022;
      rafRef.current = requestAnimationFrame(draw);
    }

    rafRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <div className="grid-bg" aria-hidden="true">
      <div className="grid-perspective" />
      <canvas ref={canvasRef} className="eq-canvas" />
      <div className="scanlines" />
      <div className="vignette" />
    </div>
  );
}
