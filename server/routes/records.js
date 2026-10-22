import { Router } from 'express';
import db from '../db.js';
import { requireAuth } from '../auth.js';

const router = Router();

// POST /api/records — 경기 결과 저장
router.post('/', requireAuth, async (req, res) => {
  const { player_id, game_id, score, result } = req.body;
  if (player_id !== req.playerId)
    return res.status(403).json({ error: '본인의 기록만 저장할 수 있습니다.' });

  if (!player_id || !game_id || score === undefined || !result)
    return res.status(400).json({ error: '필수 항목이 누락되었습니다.' });

  if (!['win', 'lose'].includes(result))
    return res.status(400).json({ error: 'result는 win 또는 lose여야 합니다.' });

  if (!Number.isSafeInteger(score) || score < 0)
    return res.status(400).json({ error: '유효하지 않은 점수입니다.' });

  await db.read();

  const player = db.data.players.find((p) => p.id === player_id);
  if (!player)
    return res.status(404).json({ error: '플레이어를 찾을 수 없습니다.' });

  const game = db.data.games.find((g) => g.id === game_id);
  if (!game)
    return res.status(404).json({ error: '게임을 찾을 수 없습니다.' });

  // 이전 최고 점수
  const prevScores = db.data.records
    .filter((r) => r.playerId === player_id && r.gameId === game_id)
    .map((r) => r.score);
  const prevBest = prevScores.length > 0 ? Math.max(...prevScores) : 0;
  const isNewRecord = score > prevBest;

  const newRecord = {
    id: db.data._nextRecordId++,
    playerId: player_id,
    gameId: game_id,
    score,
    result,
    playedAt: new Date().toISOString(),
  };

  db.data.records.push(newRecord);
  await db.write();

  res.status(201).json({ record: newRecord, isNewRecord, prevBest });
});

export default router;
