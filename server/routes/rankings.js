import { Router } from 'express';
import db from '../db.js';
import { sessionPlayerId } from '../auth.js';

const router = Router();

// GET /api/rankings/:gameId — 게임별 랭킹
router.get('/:gameId', async (req, res) => {
  const gameId = parseInt(req.params.gameId);
  const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 20));

  const game = db.data.games.find((g) => g.id === gameId);
  if (!game)
    return res.status(404).json({ error: '게임을 찾을 수 없습니다.' });

  // 플레이어별 집계
  const playerIds = [...new Set(
    db.data.records.filter((r) => r.gameId === gameId).map((r) => r.playerId)
  )];

  const rankings = playerIds
    .map((playerId) => {
      const player = db.data.players.find((p) => p.id === playerId);
      const gameRecords = db.data.records.filter(
        (r) => r.playerId === playerId && r.gameId === gameId
      );
      return {
        player_id: playerId,
        nickname: player?.nickname ?? '???',
        best_score: Math.max(...gameRecords.map((r) => r.score)),
        total_matches: gameRecords.length,
        wins: gameRecords.filter((r) => r.result === 'win').length,
        losses: gameRecords.filter((r) => r.result === 'lose').length,
      };
    })
    .sort((a, b) => b.best_score - a.best_score)
    .map((r, i) => ({ rank: i + 1, ...r }));

  const playerId = sessionPlayerId(req);
  res.json({ game, rankings: rankings.slice(0, limit), myRanking: rankings.find((r) => r.player_id === playerId) ?? null });
});

// GET /api/rankings — 전체 게임 목록 + top3
router.get('/', async (req, res) => {

  const summary = db.data.games.map((game) => {
    const playerIds = [...new Set(
      db.data.records.filter((r) => r.gameId === game.id).map((r) => r.playerId)
    )];

    const top3 = playerIds
      .map((playerId) => {
        const player = db.data.players.find((p) => p.id === playerId);
        const best = Math.max(
          ...db.data.records
            .filter((r) => r.playerId === playerId && r.gameId === game.id)
            .map((r) => r.score)
        );
        return { nickname: player?.nickname ?? '???', best_score: best };
      })
      .sort((a, b) => b.best_score - a.best_score)
      .slice(0, 3);

    return { game, top3 };
  });

  res.json({ summary });
});

export default router;
