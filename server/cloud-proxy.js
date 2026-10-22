import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export function cloudConfiguration() {
  try {
    const dir = process.env.RETRO_DATA_DIR || fileURLToPath(new URL('./data/', import.meta.url));
    return JSON.parse(readFileSync(join(dir, 'rankings-sync.json'), 'utf8'));
  } catch { return null; }
}

export async function cloudProxy(req, res, next) {
  const config = cloudConfiguration();
  if (!config?.cloudApiUrl) return next();
  try {
    const response = await fetch(config.cloudApiUrl + req.url, {
      method: req.method,
      headers: { 'Content-Type': 'application/json', ...(req.headers.authorization ? { Authorization: req.headers.authorization } : {}) },
      body: ['GET', 'HEAD'].includes(req.method) ? undefined : JSON.stringify(req.body),
      signal: AbortSignal.timeout(15000),
    });
    res.status(response.status).type('application/json').send(await response.text());
  } catch {
    res.status(502).json({ error: '온라인 기록 서버에 연결할 수 없습니다. 인터넷 연결을 확인해주세요.' });
  }
}
