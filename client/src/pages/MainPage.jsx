import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import usePlayerStore from '../store/usePlayerStore';
import { loginPlayer, logoutPlayer, changeNickname } from '../api';
import NicknameModal from '../components/NicknameModal';
import GridBackground from '../components/GridBackground';
import GameIntro from '../components/GameIntro';
import StrikeIntro from '../components/StrikeIntro';
import PacmanIntro from '../components/PacmanIntro';
import './MainPage.css';

const GAMES = [
  {
    id: 1,
    num: '01',
    name: 'PING PONG',
    desc: 'RALLY SURVIVAL',
    color: 'cyan',
    route: '/game',
    available: true,
  },
  {
    id: 2,
    num: '02',
    name: 'STRIKE WING',
    desc: 'AERIAL COMBAT',
    color: 'yellow',
    route: '/strike-wing',
    available: true,
  },
  {
    id: 3,
    num: '03',
    name: 'METRO PACMAN',
    desc: 'MAZE RUNNER',
    color: 'pink',
    route: '/metro-pacman',
    available: true,
  },
];

export default function MainPage() {
  const navigate = useNavigate();
  const { id, nickname, setPlayer, clearPlayer } = usePlayerStore();
  const [showNicknameModal, setShowNicknameModal] = useState(!id);
  const [showIntro, setShowIntro]       = useState(false);
  const [showStrikeIntro, setShowStrikeIntro] = useState(false);
  const [showPacmanIntro, setShowPacmanIntro] = useState(false);
  const [introTarget, setIntroTarget]   = useState('/game');
  const [error, setError] = useState('');

  const handleNicknameSubmit = async (name) => {
    try {
      const { player } = await loginPlayer(name);
      setPlayer(player);
      setShowNicknameModal(false);
      setError('');
    } catch (e) {
      setError(e.message);
    }
  };

  const handleLogout = async () => {
    try {
      await logoutPlayer();
      clearPlayer();
      setError('');
      setShowNicknameModal(true);
    } catch (e) {
      setError(e.message);
    }
  };

  const handleNicknameChange = async (name) => {
    try {
      const { player } = await changeNickname(id, name);
      setPlayer(player);
      setShowNicknameModal(false);
      setError('');
    } catch (e) {
      setError(e.message);
    }
  };

  const handleGameSelect = (game) => {
    if (!game.available) return;
    if (!id) { setShowNicknameModal(true); return; }
    if (game.id === 1) {
      setIntroTarget('/game');
      setShowIntro(true);
    } else if (game.id === 2) {
      setShowStrikeIntro(true);
    } else if (game.id === 3) {
      setShowPacmanIntro(true);
    } else {
      navigate(game.route);
    }
  };

  return (
    <div className="main-page page-enter">
      <GridBackground />

      <div className="main-content">
        {/* 플레이어 — 우측 상단 고정 */}
        <div className="player-area-fixed">
          {id ? (
            <div className="player-info">
              <span className="player-label">PLAYER</span>
              <span className="player-name neon-cyan">{nickname}</span>
              <button className="btn-logout" onClick={handleLogout}>
                로그아웃
              </button>
            </div>
          ) : (
            <button className="btn btn-cyan" onClick={() => setShowNicknameModal(true)}>
              닉네임 입력
            </button>
          )}
        </div>

        {/* 로고 */}
        <header className="main-header">
          <div className="logo-eyebrow">ARCADE PLATFORM</div>
          <h1 className="logo-title">
            <span className="logo-word-1">RETRO</span>
            <span className="logo-colon"> : </span>
            <span className="logo-word-2">GAMES</span>
          </h1>
          <div className="logo-line" />
        </header>

        {/* 게임 카드 */}
        <nav className="game-menu">
          {GAMES.map((game) => (
            <button
              key={game.id}
              className={`game-card game-card--${game.color} ${game.available ? 'available' : 'locked'}`}
              onClick={() => handleGameSelect(game)}
              disabled={!game.available}
            >
              <div className="game-card-num">{game.num}</div>
              <div className="game-card-name">{game.name}</div>
              <div className="game-card-desc">{game.desc}</div>
              <div className="game-card-status">
                {game.available ? 'PLAY' : 'LOCKED'}
              </div>
            </button>
          ))}
        </nav>

        {/* 하단 */}
        <div className="bottom-menu">
          <button className="btn btn-ghost" onClick={() => navigate('/ranking')}>
            ◈ RANKING
          </button>
        </div>
      </div>

      {showNicknameModal && (
        <NicknameModal
          currentNickname={nickname}
          isFirst={!id}
          error={error}
          onSubmit={id ? handleNicknameChange : handleNicknameSubmit}
          onClose={id ? () => { setShowNicknameModal(false); setError(''); } : undefined}
        />
      )}

      {showIntro && (
        <GameIntro onComplete={() => navigate(introTarget)} />
      )}

      {showStrikeIntro && (
        <StrikeIntro onComplete={() => navigate('/strike-wing')} />
      )}

      {showPacmanIntro && (
        <PacmanIntro onComplete={() => navigate('/metro-pacman')} />
      )}
    </div>
  );
}
