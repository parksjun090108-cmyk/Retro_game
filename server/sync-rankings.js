import { syncPublicRankings } from './public-rankings.js';
try {
  if (!await syncPublicRankings()) throw new Error('공개 랭킹 연결 설정이 없습니다.');
  console.log('공개 랭킹을 갱신했습니다.');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
