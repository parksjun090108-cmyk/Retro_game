const BASE = import.meta.env.VITE_API_URL || '/api';
const TOKEN_KEY = `retro-api-token:${BASE}`;

async function request(method, path, body) {
  const token = localStorage.getItem(TOKEN_KEY);
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '요청 실패');
  if (data.token) localStorage.setItem(TOKEN_KEY, data.token);
  return data;
}

// ── 플레이어 ──────────────────────────────
export const loginPlayer = (nickname) => request('POST', '/players/login', { nickname });
export const logoutPlayer = () => {
  // 요청이 현재 토큰을 읽은 다음 제거한다. 늦은 응답이 새 참가자의 토큰을 지우지 않게 한다.
  const pending = request('POST', '/players/logout', {});
  localStorage.removeItem(TOKEN_KEY);
  return pending;
};
export const getCurrentPlayer = () => request('GET', '/players/me');
export const changeNickname = (id, nickname)     => request('PATCH', `/players/${id}/nickname`,  { nickname });
export const getMyRecords   = (id)               => request('GET',   `/players/${id}/records`);

// ── 경기 기록 ──────────────────────────────
export const saveRecord = (player_id, game_id, score, result) =>
  request('POST', '/records', { player_id, game_id, score, result });

// ── 랭킹 ──────────────────────────────────
export const getRanking  = (gameId) => request('GET', `/rankings/${gameId}`);
export const getAllGames  = ()       => request('GET', '/rankings');
