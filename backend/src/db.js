import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import mysql from 'mysql2/promise';
import { config, DATABASE_DIR } from './config.js';
import { startMySQL } from './mysql.js';

export let pool;

// Starts MySQL and (re)loads schema.sql + seed.sql when the database is empty or either file changed.
export async function startDatabase(log = console.log) {
  const server = await startMySQL(log);
  const conn = await mysql.createConnection({ host: '127.0.0.1', port: server.port, user: 'root', multipleStatements: true });
  let error = null;
  try {
    const files = ['schema.sql', 'seed.sql'].map((file) => fs.readFileSync(path.join(DATABASE_DIR, file), 'utf8'));
    const hash = crypto.createHash('sha1').update(files.join('\n')).digest('hex');
    const hashFile = path.join(server.home, 'loaded-sql.sha1');
    const loaded = fs.existsSync(hashFile) ? fs.readFileSync(hashFile, 'utf8') : '';
    const [[{ tables }]] = await conn.query('SELECT COUNT(*) AS tables FROM information_schema.tables WHERE table_schema = ?', [
      config.db.name,
    ]);
    if (!tables || loaded !== hash) {
      log(tables ? '🔄 schema.sql or seed.sql changed, reloading the database…' : '🆕 Creating the database from schema.sql + seed.sql…');
      for (const sql of files) await conn.query(sql);
      fs.writeFileSync(hashFile, hash);
    }
  } catch (err) {
    error = err;
  }
  await conn.end().catch(() => {});
  if (error) {
    await server.stop();
    throw new Error(`Loading database/schema.sql + seed.sql failed: ${error.sqlMessage || error.message}`);
  }
  return server;
}

export function connectPool(port) {
  pool = mysql.createPool({ host: '127.0.0.1', port, user: 'root', database: config.db.name, connectionLimit: 10, decimalNumbers: true });
}

export async function query(sql, params = []) {
  const [rows] = await pool.query(sql, params);
  return rows;
}

export async function queryOne(sql, params = []) {
  return (await query(sql, params))[0] ?? null;
}

export async function withTransaction(work) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await work(async (sql, params = []) => (await conn.query(sql, params))[0]);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
