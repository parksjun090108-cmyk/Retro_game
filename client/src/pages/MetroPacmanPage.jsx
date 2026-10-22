import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import usePlayerStore from '../store/usePlayerStore';
import './MetroPacmanPage.css';

export default function MetroPacmanPage() {
  const navigate  = useNavigate();
  const { id: playerId } = usePlayerStore();

  useEffect(() => {
    if (!playerId) navigate('/');
  }, [playerId, navigate]);

  return (
    <div className="mp-page">
      <div className="mp-topbar">
        <button className="mp-back" onClick={() => navigate('/')}>← 메인으로</button>
        <span className="mp-title">METRO PACMAN</span>
        <span className="mp-hint">← → ↑ ↓ 이동</span>
      </div>
      <iframe
        className="mp-frame"
        src="/metro-pacman/index.html"
        title="METRO PACMAN"
        allowFullScreen
      />
    </div>
  );
}
