import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const sessions = new Map();
const cookieName = 'retro_session';
const lifetime = 7 * 24 * 60 * 60 * 1000;

export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
}

export function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  const expected = Buffer.from(hash, 'hex');
  const actual = scryptSync(password, salt, 64);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function sessionToken(req) {
  return (req.headers.cookie || '').split(';')
    .map((part) => part.trim()).find((part) => part.startsWith(`${cookieName}=`))
    ?.slice(cookieName.length + 1);
}

export function endSession(req, res) {
  sessions.delete(sessionToken(req));
  res.clearCookie(cookieName, { httpOnly: true, sameSite: 'strict', path: '/' });
}

export function createSession(req, res, playerId) {
  sessions.delete(sessionToken(req));
  const now = Date.now();
  for (const [token, session] of sessions) {
    if (session.expires <= now) sessions.delete(token);
  }
  const token = randomBytes(32).toString('hex');
  sessions.set(token, { playerId, expires: now + lifetime });
  res.cookie(cookieName, token, {
    httpOnly: true, sameSite: 'strict', path: '/', maxAge: lifetime,
    secure: process.env.NODE_ENV === 'production',
  });
}

export function requireAuth(req, res, next) {
  const token = sessionToken(req);
  const session = sessions.get(token);
  if (!session || session.expires <= Date.now()) {
    sessions.delete(token);
    return res.status(401).json({ error: '다시 로그인해주세요.' });
  }
  req.playerId = session.playerId;
  next();
}

export function publicPlayer(player) {
  return { id: player.id, nickname: player.nickname, createdAt: player.createdAt };
}
