import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import db from './db.js';
import { hashPassword } from './auth.js';

// 서버를 멈춘 상태에서 실행한다. 비밀번호를 명령행 인수나 셸 이력에 남기지 않는다.
const rl = createInterface({ input: stdin, output: stdout });
try {
  const nickname = (await rl.question('플레이어 닉네임: ')).trim();
  const player = db.data.players.find((p) => p.nickname === nickname);
  if (!player) throw new Error('플레이어를 찾을 수 없습니다.');
  const password = await rl.question('새 비밀번호 (8~128자, 화면에 표시됨): ');
  if (password.length < 8 || password.length > 128) throw new Error('비밀번호는 8~128자여야 합니다.');
  const confirmation = await rl.question('비밀번호 다시 입력: ');
  if (confirmation !== password) throw new Error('비밀번호가 일치하지 않습니다.');
  player.passwordHash = hashPassword(password);
  await db.write();
  console.log(`${nickname}: 비밀번호를 지정했습니다. 서버를 다시 시작해주세요.`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  rl.close();
}
