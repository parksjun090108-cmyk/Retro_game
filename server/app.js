import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import playersRouter from './routes/players.js';
import recordsRouter from './routes/records.js';
import rankingsRouter from './routes/rankings.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

// Strike Wing 정적 파일 서빙
app.use('/strike-wing', express.static(
  path.join(__dirname, '../strike-wing-offline/strike-wing')
));

// Metro Pacman 정적 파일 서빙
app.use('/metro-pacman', express.static(
  path.join(__dirname, '../metro-pacman')
));

app.use('/api/players',  playersRouter);
app.use('/api/records',  recordsRouter);
app.use('/api/rankings', rankingsRouter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default app;
