import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import usePlayerStore from '../store/usePlayerStore';
import { getRanking } from '../api';
import './RankingPage.css';

const MEDAL = ['🥇', '🥈', '🥉'];

const TABS = [
  { id: 1, label: 'PING PONG',    color: 'cyan',   scoreLabel: 'RALLY',  scoreUnit: '' },
  { id: 2, label: 'STRIKE WING',  color: 'yellow', scoreLabel: 'SCORE',  scoreUnit: 'pt' },
  { id: 3, label: 'METRO PACMAN', color: 'pink',   scoreLabel: 'SCORE',  scoreUnit: 'pt' },
];

export default function RankingPage() {
  const navigate = useNavigate();
  const { id: playerId } = usePlayerStore();
  const [activeTab, setActiveTab] = useState(1);
  const [data, setData]     = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    getRanking(activeTab)
      .then(({ rankings }) => {
        setData((prev) => ({ ...prev, [activeTab]: rankings }));
        setLoading(false);
      })
      .catch((e) => { setError(e.message); setLoading(false); });
  }, [activeTab]);

  const tab    = TABS.find((t) => t.id === activeTab);
  const rows   = data[activeTab] || [];

  return (
    <div className="ranking-page page-enter">
      <div className="ranking-content">

        <header className="ranking-header">
          <div className="ranking-eyebrow">LEADERBOARD</div>
          <h1 className="ranking-title">RANKINGS</h1>
          <div className="logo-line" />
        </header>

        {/* 탭 */}
        <div className="ranking-tabs">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`ranking-tab ranking-tab--${t.color} ${activeTab === t.id ? 'active' : ''}`}
              onClick={() => setActiveTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading && <div className={`loading-text neon-${tab.color}`}>로딩 중...</div>}
        {error   && <div className="error-text neon-pink">{error}</div>}

        {!loading && !error && (
          <table className="ranking-table">
            <thead>
              <tr>
                <th className="th-rank">RANK</th>
                <th className="th-nick">PLAYER</th>
                <th className="th-score">{tab.scoreLabel}</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={3} className="empty-row">아직 기록이 없습니다.</td></tr>
              )}
              {rows.map((r) => (
                <tr
                  key={r.player_id}
                  className={[
                    r.player_id === playerId ? 'my-row' : '',
                    `tab-${tab.color}`,
                  ].join(' ')}
                >
                  <td className="rank-col">
                    {r.rank <= 3
                      ? <span className="medal">{MEDAL[r.rank - 1]}</span>
                      : <span className="rank-num">{r.rank}</span>
                    }
                  </td>
                  <td className={`nick-col ${r.player_id === playerId ? `neon-${tab.color}` : ''}`}>
                    {r.nickname}
                    {r.player_id === playerId && <span className="you-badge"> ◀ YOU</span>}
                  </td>
                  <td className={`score-col neon-${tab.color}`}>
                    {r.best_score}
                    {tab.scoreUnit && <span className="score-unit">{tab.scoreUnit}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="ranking-nav">
          <button className="btn btn-ghost" onClick={() => navigate('/')}>
            메인으로
          </button>
        </div>
      </div>
    </div>
  );
}
