import app from './app.js';
import { startPublicRankingsSync } from './public-rankings.js';

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  startPublicRankingsSync();
});
