import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import usePlayerStore from '../store/usePlayerStore';
import { getMyRecords } from '../api';
import './ResultPage.css';

export default function ResultPage() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { id: playerId, nickname } = usePlayerStore();

  const { rallies = 0 } = location.state || {};

  const [myStats,     setMyStats]     = useState(null);
  const [isNewRecord, setIsNewRecord] = useState(false);

  useEffect(() => {
    if (!playerId) return;
    getMyRecords(playerId)
      .then(({ bestScores }) => {
        const ping = bestScores.find((b) => b.gameId === 1);
        if (ping) {
          setMyStats(ping);
          setIsNewRecord(rallies >= ping.best_score);
        }
      })
      .catch(console.error);
  }, [playerId, rallies]);

  return (
    <div className="result-page page-enter">
      <div className="result-content">
        {/* 타이틀 */}
        <div className="result-verdict neon-pink">GAME OVER</div>

        {/* 랠리 수 */}
        <div className="final-score-board">
          <div className="score-side">
            <div className="score-label neon-cyan">{nickname || 'PLAYER'}</div>
            <div className="score-main-label">RALLIES SURVIVED</div>
            <div className="score-num neon-cyan">{rallies}</div>
          </div>
        </div>

        {/* 신기록 */}
        {isNewRecord && (
          <div className="new-record-badge">
            <span className="badge-icon">★</span>
            <span>NEW RECORD!</span>
          </div>
        )}

        {/* 개인 통계 */}
        {myStats && (
          <div className="my-stats">
            <div className="stat-item">
              <span className="stat-label">최고 랠리</span>
              <span className="stat-val neon-cyan">{myStats.best_score}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">총 경기</span>
              <span className="stat-val">{myStats.total_matches}</span>
            </div>
          </div>
        )}

        {/* 버튼 */}
        <div className="result-nav">
          <button className="btn btn-cyan" onClick={() => navigate('/game')}>다시 도전</button>
          <button className="btn btn-blue" onClick={() => navigate('/ranking')}>랭킹 보기</button>
          <button className="btn btn-pink" onClick={() => navigate('/')}>메인으로</button>
        </div>
      </div>
    </div>
  );
}
