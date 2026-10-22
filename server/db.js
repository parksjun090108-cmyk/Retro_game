import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = process.env.RETRO_DATA_DIR || join(__dirname, 'data');
mkdirSync(dataDir, { recursive: true });

const adapter = new JSONFile(join(dataDir, 'db.json'));

const defaultData = {
  players: [],
  games: [
    { id: 1, name: 'PING PONG' },
    { id: 2, name: 'STRIKE WING' },
    { id: 3, name: 'METRO PACMAN' },
  ],
  records: [],
  _nextPlayerId: 1,
  _nextRecordId: 1,
};

const db = new Low(adapter, defaultData);

// 초기 로드
await db.read();

// 기본값 병합 (첫 실행 시)
db.data = { ...defaultData, ...db.data };

// 게임 목록 최신화
const gameIds = db.data.games.map((g) => g.id);
if (!gameIds.includes(2)) db.data.games.push({ id: 2, name: 'STRIKE WING' });
if (!gameIds.includes(3)) db.data.games.push({ id: 3, name: 'METRO PACMAN' });
db.data.games = db.data.games.map((g) => {
  if (g.id === 2) return { ...g, name: 'STRIKE WING' };
  if (g.id === 3) return { ...g, name: 'METRO PACMAN' };
  return g;
});

await db.write();

export default db;
