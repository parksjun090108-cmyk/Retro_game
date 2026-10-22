import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import usePlayerStore from '../store/usePlayerStore';
import './StrikeWingPage.css';

export default function StrikeWingPage() {
  const navigate = useNavigate();
  const { id: playerId, nickname } = usePlayerStore();

  useEffect(() => {
    if (!playerId) navigate('/');
  }, [playerId, navigate]);

  return (
    <div className="sw-page page-enter">

      {/* 상단바 — 핑퐁과 동일 구조 */}
      <div className="sw-topbar">
        <button className="sw-back btn btn-pink" onClick={() => navigate('/')}>
          ← 메인으로
        </button>
        <span className="sw-topbar-title neon-yellow">STRIKE WING</span>
        <span className="sw-topbar-hint">← → ↑ ↓ 비행 &nbsp;·&nbsp; SPACE 기관포 &nbsp;·&nbsp; X 미사일 &nbsp;·&nbsp; P 일시정지</span>
      </div>

      {/* 게임 iframe */}
      <div className="sw-frame-wrap">
        <iframe
          className="sw-frame"
          src="/strike-wing/index.html"
          title="STRIKE WING"
          allowFullScreen
        />
      </div>

    </div>
  );
}
