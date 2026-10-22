import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import vm from 'node:vm';

test('로그인·권한·기록 회귀 검사 (격리된 DB)', async () => {
  const dataDir = await mkdtemp(join(tmpdir(), 'retro-test-'));
  process.env.RETRO_DATA_DIR = dataDir;
  const { default: app } = await import('./app.js');
  const { default: db } = await import('./db.js');
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const call = async (path, method = 'GET', body, cookie) => {
    const res = await fetch(base + path, {
      method,
      headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: res.status, body: await res.json(), cookie: res.headers.get('set-cookie')?.split(';')[0] };
  };
  try {
    db.data.players.push({ id: 99, nickname: '기존계정', createdAt: new Date().toISOString() });
    await db.write();
    const legacy = await call('/players/login', 'POST', { nickname: '기존계정' });
    assert.equal(legacy.status, 409);
    assert.equal(db.data.players.find((p) => p.id === 99).passwordHash, undefined);
    assert.equal((await call('/players/login', 'POST', { nickname: 123 })).status, 400);
    assert.equal((await call('/players/login', 'POST', { nickname: '   ' })).status, 400);
    assert.equal((await call('/players/login', 'POST', { nickname: '가'.repeat(13) })).status, 400);
    const login = await call('/players/login', 'POST', { nickname: '테스트' });
    assert.equal(login.status, 201);
    assert.ok(login.cookie);
    assert.equal(login.body.player.passwordHash, undefined);
    const id = login.body.player.id;
    const stored = db.data.players.find((p) => p.id === id);
    assert.equal(stored.passwordHash, undefined);
    const returning = await call('/players/login', 'POST', { nickname: ' 테스트 ' });
    assert.equal(returning.status, 409);
    assert.equal(db.data.players.filter((p) => p.nickname === '테스트').length, 1);
    assert.equal((await call('/players/me')).status, 401);
    assert.equal((await call('/players/me', 'GET', undefined, login.cookie)).body.player.id, id);
    const concurrent = await Promise.all([
      call('/players/login', 'POST', { nickname: '동시등록' }),
      call('/players/login', 'POST', { nickname: '동시등록' }),
    ]);
    assert.deepEqual(concurrent.map((r) => r.status).sort(), [201, 409]);
    assert.equal(db.data.players.filter((p) => p.nickname === '동시등록').length, 1);
    const record = { player_id: id, game_id: 3, score: 500, result: 'win' };
    assert.equal((await call('/records', 'POST', record)).status, 401);
    assert.equal((await call('/records', 'POST', { ...record, player_id: 99 }, login.cookie)).status, 403);
    assert.equal((await call('/records', 'POST', { ...record, score: 1e100 }, login.cookie)).status, 400);
    const saved = await call('/records', 'POST', record, login.cookie);
    assert.equal(saved.status, 201);
    assert.equal(saved.body.record.result, 'win');
    assert.equal((await call('/rankings/3')).body.rankings[0].wins, 1);
    assert.equal((await call('/rankings/3', 'GET', undefined, login.cookie)).body.myRanking.rank, 1);
    assert.equal((await call('/rankings/1', 'GET', undefined, login.cookie)).body.myRanking, null);
    assert.equal((await call('/rankings/3')).body.myRanking, null);
    // 상위 20명 밖이어도 현재 참가자의 전체 순위를 따로 반환한다.
    for (let i = 0; i < 21; i++) {
      db.data.players.push({ id: 200 + i, nickname: `상위${i}` });
      db.data.records.push({ id: 200 + i, playerId: 200 + i, gameId: 3, score: 1000 + i, result: 'lose' });
    }
    await db.write();
    const outsideTop = await call('/rankings/3', 'GET', undefined, login.cookie);
    assert.equal(outsideTop.body.rankings.length, 20);
    assert.equal(outsideTop.body.myRanking.rank, 22);
    assert.equal(outsideTop.body.myRanking.best_score, 500);
    assert.ok(!outsideTop.body.rankings.some((row) => row.player_id === id));
    for (const gameId of [1, 2, 3]) assert.equal((await call(`/rankings/${gameId}`)).status, 200);
    assert.equal((await call(`/players/${id}/records`)).body.player.passwordHash, undefined);
    assert.equal((await call('/players/99/nickname', 'PATCH', { nickname: '탈취' }, login.cookie)).status, 403);
    assert.equal((await call(`/players/${id}/nickname`, 'PATCH', { nickname: '기존계정' }, login.cookie)).status, 409);
    assert.equal((await call(`/players/${id}/nickname`, 'PATCH', { nickname: '새이름' }, login.cookie)).status, 200);
    await call('/players/logout', 'POST', undefined, login.cookie);
    assert.equal((await call('/players/me', 'GET', undefined, login.cookie)).status, 401);
    assert.equal((await call('/players/login', 'POST', { nickname: '새이름' })).status, 409);
    // 이전 버전 계정도 중복 이름으로 접속할 수 없다.
    db.data.players.find((p) => p.id === 99).passwordHash = 'legacy-unused-hash';
    await db.write();
    const oldProtected = await call('/players/login', 'POST', { nickname: '기존계정' });
    assert.equal(oldProtected.status, 409);
    assert.equal(db.data.records.length, 22);
    const { publicSnapshot, syncPublicRankings } = await import('./public-rankings.js');
    const publicData = publicSnapshot();
    assert.equal(publicData.games.length, 3);
    assert.equal(publicData.games[2].rankings.length, 20);
    assert.deepEqual(Object.keys(publicData.games[2].rankings[0]).sort(), ['best_score', 'nickname']);
    assert.equal(await syncPublicRankings({}), false);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await rm(dataDir, { recursive: true, force: true });
    delete process.env.RETRO_DATA_DIR;
  }
});

test('팩맨 승리/패배 전송과 BGM 단일 재생', async () => {
  const html = await readFile(new URL('../metro-pacman/index.html', import.meta.url), 'utf8');
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  // 게임 본체도 파싱해 잘못된 JS 교체를 잡는다.
  scripts.forEach((script) => new vm.Script(script));
  const showResult = html.slice(html.indexOf('    function showResult(win)'), html.indexOf('    function favoriteDirection'));
  const records = [];
  const element = () => ({ classList: { add() {}, toggle() {} }, replaceChildren() {}, append() {}, appendChild() {} });
  const context = {
    game: { score: 500, best: 0, totalCollected: 5, totalTime: 10, moves: 2, turns: 1, predictionOk: 0, predictionFail: 0 },
    hideOverlays() {}, writeBestScore() {}, updateUI() {},
    els: { result: element(), resultTitle: element(), resultTable: element(), resultText: element() },
    document: { querySelector: element, createElement: element },
    localStorage: { getItem: () => '1' },
    fetch: (url, options) => { records.push(JSON.parse(options.body)); return Promise.resolve(); },
  };
  vm.createContext(context);
  vm.runInContext(showResult + '\nshowResult(true); showResult(false);', context);
  assert.deepEqual(records.map((r) => r.result), ['win', 'lose']);
  let audioCount = 0;
  const listeners = {};
  const bgmContext = {
    Audio: class { constructor() { audioCount++; } play() { return Promise.resolve(); } },
    document: { addEventListener: (event, handler) => { (listeners[event] ||= []).push(handler); } },
    setInterval: () => 1, clearInterval() {},
  };
  vm.createContext(bgmContext);
  scripts.slice(1).forEach((script) => vm.runInContext(script, bgmContext));
  assert.equal(audioCount, 1);
  assert.equal(listeners.click.length, 1);
  listeners.click[0]();
  listeners.keydown[0]();
  assert.equal(audioCount, 1);
});
