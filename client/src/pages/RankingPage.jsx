import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import usePlayerStore from '../store/usePlayerStore';
import { getRanking } from '../api';
import './RankingPage.css';

const GAMES = [
  { id: 1, label: 'PING PONG', color: 'cyan', unit: 'RALLY' },
  { id: 2, label: 'STRIKE WING', color: 'yellow', unit: 'PT' },
  { id: 3, label: 'METRO PACMAN', color: 'pink', unit: 'PT' },
];
const MEDALS = ['🥇', '🥈', '🥉'];

export default function RankingPage() {
  const navigate = useNavigate();
  const { id: playerId, nickname } = usePlayerStore();
  const [boards, setBoards] = useState({});

  useEffect(() => {
    let active = true;
    setBoards({});
    GAMES.forEach((game) => {
      getRanking(game.id)
        .then((data) => { if (active) setBoards((prev) => ({ ...prev, [game.id]: data })); })
        .catch((error) => { if (active) setBoards((prev) => ({ ...prev, [game.id]: { error: error.message } })); });
    });
    return () => { active = false; };
  }, [playerId]);

  return (
    <div className="ranking-page page-enter">
      <div className="ranking-content">
        <header className="ranking-header">
          <div className="ranking-eyebrow">THREE GAMES · ONE LEADERBOARD</div>
          <h1 className="ranking-title">RANKINGS</h1>
          <p>세 종목의 최고 기록을 한눈에 확인하세요.</p>
        </header>

        {playerId && (
          <div className="ranking-player">
            <span className="ranking-me-tag">현재 참가자 · 나</span>
            <strong>{nickname}</strong>
            <span>각 종목 상단에 내 기록이 표시됩니다.</span>
          </div>
        )}

        <div className="ranking-boards">
          {GAMES.map((game) => {
            const board = boards[game.id];
            const mine = board?.myRanking;
            return (
              <section className={`ranking-board ranking-board--${game.color}`} key={game.id} aria-labelledby={`ranking-${game.id}`}>
                <header className="ranking-board-header">
                  <h2 id={`ranking-${game.id}`}>{game.label}</h2>
                  <span>TOP 20</span>
                </header>

                {playerId && (
                  <div className="ranking-my-card" aria-label={`${game.label} 내 기록`}>
                    <div className="ranking-my-heading"><span className="ranking-me-tag">내 기록</span><strong>{nickname}</strong></div>
                    {!board ? <p>내 기록 불러오는 중...</p>
                      : board.error ? <p>내 기록을 불러오지 못했습니다.</p>
                        : mine ? (
                          <div className="ranking-my-stats"><strong>{mine.rank}<small>위</small></strong><strong>{mine.best_score.toLocaleString()}<small>{game.unit}</small></strong></div>
                        ) : <p>아직 플레이 기록이 없습니다.</p>}
                  </div>
                )}

                {!board ? <p className="ranking-message" role="status">랭킹 불러오는 중...</p>
                  : board.error ? <p className="ranking-message ranking-error" role="alert">{board.error}</p>
                    : (
                      <table className="ranking-table" aria-label={`${game.label} 랭킹`}>
                        <thead><tr><th scope="col">순위</th><th scope="col">참가자</th><th scope="col">{game.unit}</th></tr></thead>
                        <tbody>
                          {board.rankings.length === 0 && <tr><td colSpan={3} className="ranking-message">아직 기록이 없습니다.</td></tr>}
                          {board.rankings.map((row) => (
                            <tr key={row.player_id} className={row.player_id === playerId ? 'ranking-my-row' : ''}>
                              <td>{MEDALS[row.rank - 1] || row.rank}</td>
                              <td><span className="ranking-row-name">{row.nickname}</span>{row.player_id === playerId && <span className="ranking-me-tag">나</span>}</td>
                              <td>{row.best_score.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
              </section>
            );
          })}
        </div>
        <div className="ranking-nav"><button className="btn btn-ghost" onClick={() => navigate('/')}>메인으로</button></div>
      </div>
    </div>
  );
}
