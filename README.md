# RETRO GAMES

React + Vite 기반 레트로 아케이드 플랫폼입니다. PING PONG, STRIKE WING, METRO PACMAN과 게임별 랭킹을 제공합니다.

## 실행

Node.js 20 이상에서 프로젝트 루트에서 실행합니다.

```powershell
npm install
npm run install:all
npm run dev
```

브라우저에서 http://localhost:5173 을 엽니다. Express 서버는 3001 포트를 사용하며, Vite가 API와 두 HTML 게임을 프록시합니다.

```powershell
npm run build --prefix client
npm test --prefix server
```

현재 루트의 `start`도 Vite 개발 서버를 실행합니다. 운영 배포 구성은 별도로 필요합니다.

## 플레이어와 로그인

- 행사 운영용으로 닉네임(1~12자)만 입력하면 바로 시작합니다. 비밀번호와 관리자 비밀번호 지정 절차는 없습니다.
- 같은 닉네임으로 다시 참여하면 기존 플레이어와 기록을 이어 씁니다. 다른 참가자와 기록이 섞이지 않도록 서로 다른 닉네임을 사용하세요.
- 로그인 세션은 HttpOnly / SameSite=Strict 쿠키를 사용합니다. 7일 후 또는 서버 재시작 시 다시 로그인해야 합니다.
- 점수 저장과 닉네임 변경은 현재 세션의 플레이어 ID와 일치해야 합니다. 닉네임으로 소유자를 확인하지는 않으며, 클라이언트 점수 자체를 검증하는 부정행위 방지 기능은 없습니다.
- 운영 환경(`NODE_ENV=production`)에서는 Secure 쿠키를 사용하므로 HTTPS가 필요합니다.

기존 플레이어와 기록은 그대로 보존하며, 기존 닉네임도 바로 사용할 수 있습니다.

## 게임

- PING PONG: W/S 또는 방향키로 이동하며, 목숨 3개 동안 성공한 랠리를 기록합니다.
- STRIKE WING: 방향키로 비행, SPACE 기관포, X 미사일, C 플레어, P 일시정지. 기체 3종과 순환하는 지역을 제공합니다.
- METRO PACMAN: 방향키/WASD 이동, SPACE 부스트(1.35초, 쿨타임 7초), P 일시정지. 큰 토큰을 모두 모으면 다음 스테이지로 이동합니다. 3개 스테이지를 클리어하면 승리로 기록합니다. 유령 접촉은 파워 토큰 상태에서도 즉시 게임 종료입니다.
- 팩맨 AI는 교차로 이동 표본 16개부터 JavaScript 소프트맥스 회귀로 학습하며, 학습 전에는 BFS로 추적합니다. 경로 탐색·무작위 모드도 비교할 수 있습니다.

## 구조와 저장

```text
client/src/                  React 화면, 인트로, 오디오, 플레이어 상태
server/                      Express API, 인증, lowdb
server/data/db.json          로컬 플레이어·게임·기록 (자동 생성, Git 제외)
metro-pacman/index.html      플랫폼에서 사용하는 팩맨
metro_pacman_ai_v14.html     이전 팩맨 버전 (플랫폼에서 사용하지 않음)
patch_pacman.py              과거 패치 스크립트 (현재 버전에 재실행하지 않음)
strike-wing-offline/         Three.js 게임과 로컬 글꼴·음원
```

실제 저장소는 **lowdb JSON**이며 SQLite를 사용하지 않습니다. `RETRO_DATA_DIR` 환경 변수로 데이터 폴더를 변경할 수 있습니다. 기존 `server/data/db.json`은 삭제하지 않으며, 참가자 데이터 보호를 위해 Git에 올리지 않습니다. 별도로 백업하세요.

## API

| Method | Path | 설명 |
|--------|------|------|
| POST | /api/players/login | 닉네임으로 시작 또는 기존 기록 이어 쓰기 |
| POST | /api/players/logout | 세션 종료 |
| GET | /api/players/me | 현재 로그인 플레이어 |
| PATCH | /api/players/:id/nickname | 본인 닉네임 변경 |
| GET | /api/players/:id/records | 개인 기록 조회 |
| POST | /api/records | 본인 경기 결과 저장 |
| GET | /api/rankings/:gameId | 게임별 랭킹 |
| GET | /api/rankings | 전체 게임별 상위 3명 |
| GET | /api/health | 서버 상태 |

음원·글꼴·Three.js 출처는 `strike-wing-offline/strike-wing/CREDITS.txt` 및 라이선스 파일을 참고하세요.
