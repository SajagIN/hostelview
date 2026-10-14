import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { createApp } from './app.js';
import { config, FRONTEND_DIR } from './config.js';
import { connectPool, pool, queryOne, startDatabase } from './db.js';

function buildFrontendIfChanged() {
  const builtIndex = path.join(FRONTEND_DIR, 'dist', 'index.html');
  const newest = (file) => {
    const stat = fs.statSync(file);
    return stat.isDirectory() ? Math.max(0, ...fs.readdirSync(file).map((f) => newest(path.join(file, f)))) : stat.mtimeMs;
  };
  const sources = ['src', 'public', 'index.html', 'vite.config.js'].map((f) => path.join(FRONTEND_DIR, f)).filter(fs.existsSync);
  if (fs.existsSync(builtIndex) && fs.statSync(builtIndex).mtimeMs > Math.max(...sources.map(newest))) return;

  console.log('🛠  Building the React app…');
  const vite = path.join(path.dirname(createRequire(import.meta.url).resolve('vite/package.json')), 'bin', 'vite.js');
  const result = spawnSync(process.execPath, [vite, 'build', FRONTEND_DIR, '--logLevel', 'warn'], { stdio: 'inherit' });
  if (result.status !== 0) process.exit(1);
}

buildFrontendIfChanged();

let db;
try {
  db = await startDatabase();
} catch (err) {
  console.error(`\n✖ ${err.message}\n`);
  process.exit(1);
}
connectPool(db.port);

const server = createApp().listen(config.port, '0.0.0.0', async () => {
  const counts = await queryOne(
    "SELECT (SELECT COUNT(*) FROM colleges) AS colleges, (SELECT COUNT(*) FROM hostels WHERE status = 'approved') AS hostels",
  );
  console.log(`\n🏠 HostelView is running → http://localhost:${config.port}`);
  console.log(`   MySQL ${db.version} on 127.0.0.1:${db.port}, database "${config.db.name}" (${counts.colleges} colleges, ${counts.hostels} hostels)`);
  console.log('   SQL console: npm run sql (in a second terminal) · Stop: Ctrl+C\n');
});

let stopping = false;
async function stop(code = 0) {
  if (stopping) process.exit(1);
  stopping = true;
  server.close();
  server.closeAllConnections();
  await pool.end().catch(() => {});
  await db.stop();
  process.exit(code);
}

server.on('error', (err) => {
  console.error(err.code === 'EADDRINUSE' ? `\n✖ Port ${config.port} is already used by another program.\n` : err);
  stop(1);
});
for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP', 'SIGBREAK']) process.on(signal, () => stop());
