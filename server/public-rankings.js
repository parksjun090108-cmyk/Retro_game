import { readFileSync } from 'node:fs';
import db from './db.js';

function configuration() {
  try { return JSON.parse(readFileSync(new URL('./data/rankings-sync.json', import.meta.url), 'utf8')); }
  catch { return null; }
}

export function publicSnapshot() {
  return { games: [1, 2, 3].map((id) => {
    const best = new Map();
    for (const record of db.data.records) {
      if (record.gameId !== id) continue;
      best.set(record.playerId, Math.max(best.get(record.playerId) ?? 0, record.score));
    }
    return { id, rankings: [...best].map(([playerId, best_score]) => ({
      nickname: db.data.players.find((player) => player.id === playerId)?.nickname ?? '???', best_score,
    })).sort((a, b) => b.best_score - a.best_score).slice(0, 20) };
  }) };
}

export async function syncPublicRankings(config = configuration()) {
  if (!config?.url || !config?.token) return false;
  const response = await fetch(new URL('/api/sync', config.url), {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.token}` },
    body: JSON.stringify(publicSnapshot()), signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(`공개 랭킹 갱신 실패 (${response.status})`);
  return true;
}

export function startPublicRankingsSync() {
  const config = configuration();
  if (!config) return;
  let busy = false;
  let failed = false;
  const update = async () => {
    if (busy) return;
    busy = true;
    try {
      await syncPublicRankings(config);
      if (failed) console.log('공개 랭킹 연결이 복구되었습니다.');
      failed = false;
    } catch (error) {
      if (!failed) console.error(error.message);
      failed = true;
    } finally { busy = false; }
  };
  update();
  const timer = setInterval(update, 10000);
  timer.unref();
}
