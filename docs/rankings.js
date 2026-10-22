const API = 'https://retro-games-rankings.wigglybirch512.chatgpt.site/api/rankings';
const GAMES = [
  { id: 1, name: 'PING PONG', subtitle: 'RALLY SURVIVAL', unit: 'RALLY', color: 'cyan' },
  { id: 2, name: 'STRIKE WING', subtitle: 'AERIAL COMBAT', unit: 'POINTS', color: 'amber' },
  { id: 3, name: 'METRO PACMAN', subtitle: 'MAZE RUNNER', unit: 'POINTS', color: 'pink' },
];
const bodies = new Map();
for (const game of GAMES) {
  const section = document.createElement('section');
  section.className = `board ${game.color}`;
  section.setAttribute('aria-labelledby', `game-${game.id}`);
  section.innerHTML = `<div class="board-top"><span class="game-number">0${game.id}</span><span class="game-type">${game.subtitle}</span></div><h2 id="game-${game.id}">${game.name}</h2><div class="board-rule"><span>LEADERBOARD</span><span>TOP 20</span></div><table aria-label="${game.name} 랭킹"><thead><tr><th scope="col">순위</th><th scope="col">닉네임</th><th scope="col">${game.unit}</th></tr></thead><tbody></tbody></table>`;
  bodies.set(game.id, section.querySelector('tbody'));
  document.querySelector('#boards').append(section);
}
function empty(body, text) {
  const row = document.createElement('tr');
  const cell = document.createElement('td');
  cell.colSpan = 3;
  cell.className = 'empty';
  const dash = document.createElement('span');
  dash.textContent = '—';
  cell.append(dash, text);
  row.append(cell);
  body.replaceChildren(row);
}
for (const body of bodies.values()) empty(body, '랭킹 불러오는 중');
let busy = false;
let lastData = null;
async function refresh() {
  if (busy) return;
  busy = true;
  try {
    const response = await fetch(API, { cache: 'no-store', credentials: 'omit', signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error('unavailable');
    const data = await response.json();
    if (data && (!Array.isArray(data.games) || !Number.isFinite(Date.parse(data.updatedAt)))) throw new Error('invalid data');
    for (const game of GAMES) {
      const body = bodies.get(game.id);
      const rows = data?.games.find((g) => g.id === game.id)?.rankings ?? [];
      if (!rows.length) { empty(body, '아직 등록된 기록이 없습니다'); continue; }
      const fragment = document.createDocumentFragment();
      for (const row of rows.slice(0, 20)) {
        const tr = document.createElement('tr');
        if (row.rank === 1) tr.className = 'first-place';
        const rank = document.createElement('td');
        const position = document.createElement('span');
        position.className = `position position-${Number(row.rank)}`;
        position.textContent = String(row.rank).padStart(2, '0');
        rank.append(position);
        const name = document.createElement('td');
        name.textContent = row.nickname;
        const score = document.createElement('td');
        score.textContent = Number(row.best_score).toLocaleString('ko-KR');
        tr.append(rank, name, score);
        fragment.append(tr);
      }
      body.replaceChildren(fragment);
    }
    lastData = data;
    const stale = data && Date.now() - Date.parse(data.updatedAt) > 60000;
    document.querySelector('#statusDot').className = `status-dot ${stale ? 'warn' : !data ? 'waiting' : ''}`;
    document.querySelector('#statusText').textContent = stale ? '마지막 수신 기록' : data ? '자동 갱신 중' : '기록 수신 대기';
    document.querySelector('#updatedAt').textContent = data ? new Date(data.updatedAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', hour12: false }) + ' KST' : '행사 시작 후 기록이 표시됩니다';
  } catch {
    document.querySelector('#statusDot').className = 'status-dot warn';
    document.querySelector('#statusText').textContent = '연결 확인 중 · 마지막 기록 표시';
    if (!lastData) for (const body of bodies.values()) empty(body, '기록 서버 연결을 확인하고 있습니다');
  } finally { busy = false; }
}
refresh();
setInterval(refresh, 10000);
