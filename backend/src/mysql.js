import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import mysql from 'mysql2/promise';
import { config } from './config.js';

const require = createRequire(import.meta.url);
const MMS = 'mysql-memory-server/dist/src';
const isWin = process.platform === 'win32';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const patch = (version) => Number(version.split('.')[2]);

const ROOT = isWin
  ? path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local'), 'HostelView')
  : process.platform === 'darwin'
    ? path.join(os.homedir(), 'Library', 'Application Support', 'HostelView')
    : path.join(process.env.XDG_DATA_HOME || path.join(os.homedir(), '.local', 'share'), 'hostelview');
const DOWNLOADS = path.join(ROOT, 'downloads');
const HOME = path.join(ROOT, 'mysql-8.0');
const DATA_DIR = path.join(HOME, 'data');
const LOG_FILE = path.join(HOME, 'mysqld.log');
const STATE_FILE = path.join(HOME, 'server.json');
const INIT_MARKER = path.join(HOME, 'initialized.json');
const WIN_HINT = isWin
  ? '\nOn Windows MySQL needs the Microsoft Visual C++ Redistributable: https://aka.ms/vs/17/release/vc_redist.x64.exe'
  : '';

function pickVersion() {
  const { DOWNLOADABLE_MYSQL_VERSIONS } = require(`${MMS}/constants`);
  const getBinaryInfo = require(`${MMS}/libraries/Version`).default;
  const arch = !isWin && process.arch === 'arm64' ? 'arm64' : 'x64';
  const versions = DOWNLOADABLE_MYSQL_VERSIONS.filter((v) => /^8\.0\.\d+$/.test(v) && patch(v) >= 11).sort((a, b) => patch(b) - patch(a));
  for (const version of versions) {
    try {
      return getBinaryInfo(version, arch);
    } catch {}
  }
  throw new Error(`There is no MySQL 8.0 download for ${process.platform} ${arch}.`);
}

async function download(info, mysqld, log) {
  if (fs.existsSync(mysqld)) return;
  const { downloadBinary } = require(`${MMS}/libraries/Downloader`);
  const Logger = require(`${MMS}/libraries/Logger`).default;
  const { DEFAULT_OPTIONS } = require(`${MMS}/constants`);
  log(`⬇  Downloading MySQL ${info.version} (first start only, 60-250 MB)…`);

  const extension = info.url.slice(info.url.lastIndexOf('-')).split('.').slice(1).join('.');
  const archive = path.join(DOWNLOADS, 'mysqlmsn', 'binaries', `${info.version}.${extension}`);
  let shown = 0;
  const progress = setInterval(() => {
    const mb = fs.existsSync(archive) ? Math.round(fs.statSync(archive).size / 1048576) : 0;
    if (mb > shown) log(`   … ${(shown = mb)} MB`);
  }, 5000);

  const saved = { TMPDIR: process.env.TMPDIR, TMP: process.env.TMP, TEMP: process.env.TEMP };
  process.env.TMPDIR = process.env.TMP = process.env.TEMP = DOWNLOADS;
  try {
    await downloadBinary(info, { ...DEFAULT_OPTIONS, version: info.version, downloadRetries: 3 }, new Logger('ERROR'));
  } catch (err) {
    throw new Error(`Downloading MySQL failed (${err.message || err}). The first start needs an internet connection.`);
  } finally {
    clearInterval(progress);
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

function checkLinuxLibraries(basedir, mysqld) {
  if (process.platform !== 'linux') return;
  let result = spawnSync(mysqld, ['--version'], { encoding: 'utf8' });
  if (result.status !== 0 && /libaio\.so\.1/.test(result.stderr)) {
    const lib = ['/usr/lib/x86_64-linux-gnu', '/lib/x86_64-linux-gnu', '/usr/lib/aarch64-linux-gnu', '/usr/lib64', '/usr/lib']
      .map((dir) => path.join(dir, 'libaio.so.1t64'))
      .find((file) => fs.existsSync(file));
    if (lib) {
      fs.copyFileSync(lib, path.join(basedir, 'lib', 'private', 'libaio.so.1'));
      result = spawnSync(mysqld, ['--version'], { encoding: 'utf8' });
    }
  }
  if (result.status !== 0) {
    throw new Error(`MySQL can't run here: ${(result.stderr || '').trim()}\nOn Debian/Ubuntu install: sudo apt install libaio1t64 libnuma1`);
  }
}

const baseArgs = (basedir, version) => [
  '--no-defaults',
  `--basedir=${basedir}`,
  `--datadir=${DATA_DIR}`,
  ...(patch(version) >= 30 ? ['--innodb-redo-log-capacity=16M'] : []),
  ...(!isWin && process.getuid?.() === 0 ? ['--user=root'] : []),
];

function initialize(basedir, mysqld, version, log) {
  if (fs.existsSync(INIT_MARKER) && fs.existsSync(path.join(DATA_DIR, 'mysql'))) return;
  log('🧱 Creating the MySQL data folder (first start only)…');
  fs.rmSync(DATA_DIR, { recursive: true, force: true });
  const initLog = path.join(HOME, 'initialize.log');
  const result = spawnSync(mysqld, [...baseArgs(basedir, version), `--log-error=${initLog}`, '--initialize-insecure'], { windowsHide: true });
  if (result.status !== 0) throw new Error(`MySQL could not create its data folder (see ${initLog}).${WIN_HINT}`);
  fs.writeFileSync(INIT_MARKER, JSON.stringify({ version, initializedAt: new Date().toISOString() }));
}

const connect = (port, timeout = 3000) => mysql.createConnection({ host: '127.0.0.1', port, user: 'root', connectTimeout: timeout });

function portIsFree(port) {
  return new Promise((resolve) => {
    const probe = net.createServer();
    probe.once('error', () => resolve(false));
    probe.listen({ port, host: '127.0.0.1', exclusive: true }, () => probe.close(() => resolve(true)));
  });
}

async function pickPort(log) {
  const first = config.db.port;
  for (let port = first; port < first + 20; port++) {
    if (await portIsFree(port)) {
      if (port !== first) log(`⚠  Port ${first} is busy, so MySQL uses port ${port}.`);
      return port;
    }
  }
  throw new Error(`Ports ${first}-${first + 19} are all busy.`);
}

const readLog = (from) => {
  try {
    return fs.readFileSync(LOG_FILE).subarray(from).toString();
  } catch {
    return '';
  }
};

async function spawnServer(basedir, mysqld, version, log) {
  const port = await pickPort(log);
  const logStart = fs.existsSync(LOG_FILE) ? fs.statSync(LOG_FILE).size : 0;
  log(`🚀 Starting MySQL ${version} on 127.0.0.1:${port}…`);
  const child = spawn(
    mysqld,
    [
      ...baseArgs(basedir, version),
      `--port=${port}`,
      '--bind-address=127.0.0.1',
      `--log-error=${LOG_FILE}`,
      `--pid-file=${path.join(HOME, 'mysqld.pid')}`,
      '--skip-log-bin',
      '--performance-schema=OFF',
      '--innodb-buffer-pool-size=64M',
      '--mysqlx=OFF',
      ...(isWin ? [] : [`--socket=${path.join(os.tmpdir(), `hostelview-mysql-${port}.sock`)}`]),
    ],
    { stdio: 'ignore', detached: isWin, windowsHide: true },
  );
  let spawnError = null;
  child.on('error', (err) => (spawnError = err));

  const deadline = Date.now() + 180_000;
  let waitingShown = false;
  for (;;) {
    const logText = readLog(logStart);
    const locked = logText.includes('Unable to lock');
    if (locked && !waitingShown) {
      waitingShown = true;
      log('⏳ Waiting for the previous MySQL to release the data folder…');
    }
    if (spawnError || child.exitCode !== null) {
      if (locked) {
        throw new Error('Another MySQL process is still using the HostelView data folder.\n' +
          'End "mysqld" in Task Manager (Windows) or run "pkill mysqld" (macOS/Linux), then try again.');
      }
      const errors = logText.split('\n').filter((line) => line.includes('[ERROR]')).slice(-5).join('\n');
      throw new Error(`MySQL stopped while starting (log: ${LOG_FILE}).\n${errors}${WIN_HINT}`);
    }
    try {
      (await connect(port, 1500)).destroy();
      return { child, port };
    } catch {}
    if (Date.now() > deadline) {
      child.kill();
      throw new Error(`MySQL did not start within 3 minutes (log: ${LOG_FILE}).`);
    }
    await sleep(300);
  }
}

const kill = (pid, signal) => {
  try {
    process.kill(pid, signal);
  } catch {}
};

const isAlive = (pid) => {
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return err.code === 'EPERM';
  }
};

const readState = () => {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch {
    return null;
  }
};
const writeState = (state) => fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));

const samePath = (a, b) => {
  const norm = (p) => {
    let full = path.resolve(p);
    try {
      full = fs.realpathSync.native(full);
    } catch {}
    full = full.replace(/[\\/]+$/, '');
    return isWin || process.platform === 'darwin' ? full.toLowerCase() : full;
  };
  return norm(a) === norm(b);
};

async function findRunning() {
  const state = readState();
  if (!state || !isAlive(state.pid)) return null;
  try {
    const conn = await connect(state.port);
    const [[row]] = await conn.query('SELECT @@datadir AS dir, VERSION() AS version');
    conn.destroy();
    return samePath(row.dir, DATA_DIR) ? { ...state, version: row.version } : null;
  } catch {
    return null;
  }
}

async function otherClients(port) {
  try {
    const conn = await connect(port);
    const [[row]] = await conn.query(
      "SELECT COUNT(*) AS n FROM information_schema.processlist WHERE id <> CONNECTION_ID() AND user NOT IN ('event_scheduler', 'system user')",
    );
    conn.destroy();
    return Number(row.n);
  } catch {
    return 0;
  }
}

async function shutdown(child, pid, port) {
  const exited = () => (child ? child.exitCode !== null || child.signalCode !== null : !isAlive(pid));
  try {
    const conn = await connect(port);
    await conn.query('SHUTDOWN').catch(() => {});
    conn.destroy();
  } catch {
    if (!isWin) kill(pid, 'SIGTERM');
  }
  for (let i = 0; i < 200 && !exited(); i++) await sleep(150);
  if (!exited()) kill(pid, 'SIGKILL');
  fs.rmSync(STATE_FILE, { force: true });
}

export async function startMySQL(log = console.log) {
  const info = pickVersion();
  const basedir = path.join(DOWNLOADS, 'mysqlmsn', 'binaries', info.version, 'mysql');
  const mysqld = path.join(basedir, 'bin', isWin ? 'mysqld.exe' : 'mysqld');
  fs.mkdirSync(HOME, { recursive: true });

  let child = null;
  let leaveRunning = false;
  let state = await findRunning();
  if (state && !isAlive(state.owner)) writeState({ ...state, owner: process.pid });
  if (!state) {
    await download(info, mysqld, log);
    checkLinuxLibraries(basedir, mysqld);
    initialize(basedir, mysqld, info.version, log);
    const started = await spawnServer(basedir, mysqld, info.version, log);
    child = started.child;
    state = { pid: child.pid, port: started.port, version: info.version, owner: process.pid };
    writeState(state);
    process.once('exit', () => {
      if (!leaveRunning && child.exitCode === null) child.kill();
    });
  }

  return {
    port: state.port,
    version: state.version,
    home: HOME,
    async stop() {
      const current = readState();
      if (!current || current.pid !== state.pid) return;
      if (current.owner !== process.pid && isAlive(current.owner)) return;
      if ((await otherClients(state.port)) > 0) {
        leaveRunning = true;
        writeState({ ...current, owner: null });
        log('ℹ  MySQL keeps running because another program is still connected to it.');
        return;
      }
      log('🛑 Stopping MySQL…');
      await shutdown(child, state.pid, state.port);
    },
  };
}
