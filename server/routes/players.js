import { Router } from 'express';
import db from '../db.js';
import { createSession, endSession, requireAuth, publicPlayer } from '../auth.js';

const router = Router();

// 행사 참가 등록: 기존 닉네임은 재사용할 수 없다. 재접속은 세션으로 처리한다.
router.post('/login', async (req, res) => {
  const { nickname } = req.body;
  if (typeof nickname !== 'string' || !nickname.trim() || nickname.trim().length > 12)
    return res.status(400).json({ error: '닉네임은 1~12자로 입력해주세요.' });

  const name = nickname.trim();

  const existing = db.data.players.find((p) => p.nickname === name);

  if (existing) {
    return res.status(409).json({ error: '이미 사용 중인 닉네임입니다. 다른 닉네임을 입력해주세요.' });
  }

  const newPlayer = {
    id: db.data._nextPlayerId++,
    nickname: name,
    createdAt: new Date().toISOString(),
  };
  db.data.players.push(newPlayer);
  await db.write();

  createSession(req, res, newPlayer.id);
  res.status(201).json({ player: publicPlayer(newPlayer), isNew: true });
});

router.post('/logout', (req, res) => {
  endSession(req, res);
  res.json({ ok: true });
});

router.get('/me', requireAuth, (req, res) => {
  const player = db.data.players.find((p) => p.id === req.playerId);
  if (!player) return res.status(401).json({ error: '다시 로그인해주세요.' });
  res.json({ player: publicPlayer(player) });
});

// PATCH /api/players/:id/nickname — 닉네임 변경
router.patch('/:id/nickname', requireAuth, async (req, res) => {
  const id = parseInt(req.params.id);
  if (id !== req.playerId) return res.status(403).json({ error: '본인의 닉네임만 변경할 수 있습니다.' });
  const { nickname } = req.body;

  if (typeof nickname !== 'string' || !nickname.trim() || nickname.trim().length > 12)
    return res.status(400).json({ error: '닉네임은 1~12자로 입력해주세요.' });

  const player = db.data.players.find((p) => p.id === id);
  if (!player)
    return res.status(404).json({ error: '플레이어를 찾을 수 없습니다.' });

  // 같은 닉네임을 다른 사람이 쓰고 있으면 거부
  const conflict = db.data.players.find(
    (p) => p.nickname === nickname.trim() && p.id !== id
  );
  if (conflict)
    return res.status(409).json({ error: '이미 사용 중인 닉네임입니다.' });

  player.nickname = nickname.trim();
  await db.write();

  res.json({ player: publicPlayer(player) });
});

// GET /api/players/:id/records — 개인 기록 조회
router.get('/:id/records', async (req, res) => {
  const id = parseInt(req.params.id);

  const player = db.data.players.find((p) => p.id === id);
  if (!player)
    return res.status(404).json({ error: '플레이어를 찾을 수 없습니다.' });

  const records = db.data.records
    .filter((r) => r.playerId === id)
    .map((r) => ({
      ...r,
      gameName: db.data.games.find((g) => g.id === r.gameId)?.name ?? '',
    }))
    .sort((a, b) => new Date(b.playedAt) - new Date(a.playedAt));

  // 게임별 최고 점수
  const gameIds = [...new Set(records.map((r) => r.gameId))];
  const bestScores = gameIds.map((gameId) => {
    const gameRecords = records.filter((r) => r.gameId === gameId);
    return {
      gameId,
      gameName: db.data.games.find((g) => g.id === gameId)?.name ?? '',
      best_score: Math.max(...gameRecords.map((r) => r.score)),
      total_matches: gameRecords.length,
      wins: gameRecords.filter((r) => r.result === 'win').length,
    };
  });

  res.json({ player: publicPlayer(player), records, bestScores });
});

export default router;
