const path = require('node:path');
const express = require('express');
const db = require('./db.cjs');

const app = express();
app.use(express.json());

app.use(express.static(path.join(__dirname, '..')));

app.post('/api/matches', (req, res) => {
  const { name, result, playerHp, cpuHp, rounds } = req.body;
  if (!name || !['win', 'loss'].includes(result)) {
    return res.status(400).json({ error: 'bad request' });
  }

  db.prepare('INSERT OR IGNORE INTO players (name) VALUES (?)').run(name);
  const player = db.prepare('SELECT id FROM players WHERE name = ?').get(name);

  db.prepare(
    'INSERT INTO matches (player_id, result, player_hp, cpu_hp, rounds) VALUES (?,?,?,?,?)'
  ).run(player.id, result, playerHp, cpuHp, rounds);

  const col = result === 'win' ? 'match_wins' : 'match_losses';
  db.prepare(`UPDATE players SET ${col} = ${col} + 1 WHERE id = ?`).run(player.id);

  res.json({ ok: true });
});

app.get('/api/leaderboard', (req, res) => {
  res.json(
    db.prepare(
      'SELECT name, match_wins, match_losses FROM players ORDER BY match_wins DESC LIMIT 10'
    ).all()
  );
});

app.listen(4174, '127.0.0.1', () => console.log('Local: http://127.0.0.1:4174'));
