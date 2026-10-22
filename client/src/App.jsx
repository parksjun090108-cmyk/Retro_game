import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import MainPage from './pages/MainPage';
import GamePage from './pages/GamePage';
import ResultPage from './pages/ResultPage';
import RankingPage from './pages/RankingPage';
import StrikeWingPage from './pages/StrikeWingPage';
import MetroPacmanPage from './pages/MetroPacmanPage';
import useBgm from './hooks/useBgm';
import usePlayerStore from './store/usePlayerStore';
import { getCurrentPlayer } from './api';

const BGM_ROUTES = ['/', '/ranking', '/result'];

function BgmController() {
  const location = useLocation();
  const active = BGM_ROUTES.includes(location.pathname);
  useBgm(0.28, active, 'main');
  return null;
}

export default function App() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let active = true;
    getCurrentPlayer()
      .then(({ player }) => { if (active) usePlayerStore.getState().setPlayer(player); })
      .catch(() => { if (active) usePlayerStore.getState().clearPlayer(); })
      .finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, []);
  if (!ready) return <div className="loading-text">로그인 확인 중...</div>;
  return (
    <>
      <BgmController />
      <Routes>
        <Route path="/"            element={<MainPage />} />
        <Route path="/game"        element={<GamePage />} />
        <Route path="/result"      element={<ResultPage />} />
        <Route path="/ranking"     element={<RankingPage />} />
        <Route path="/strike-wing"   element={<StrikeWingPage />} />
        <Route path="/metro-pacman"  element={<MetroPacmanPage />} />
        <Route path="*"            element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
