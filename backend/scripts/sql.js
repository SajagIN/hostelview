// npm run sql                     → interactive mysql> prompt
// npm run sql database/queries.sql → run a file (continues after errors, like mysql --force)
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import mysql from 'mysql2/promise';
import { config, PROJECT_DIR } from '../src/config.js';
import { startDatabase } from '../src/db.js';

const paint = (code) => (text) => (process.stdout.isTTY ? `\x1b[${code}m${text}\x1b[0m` : text);
const dim = paint(2);
const red = paint(31);
const cyan = paint(36);
const NUMERIC_TYPES = new Set([0, 1, 2, 3, 4, 5, 8, 9, 13, 246]);
const width = (text) => [...text].length;
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

function splitSql(text) {
  const statements = [];
  let sql = '';
  let notes = [];
  let quote = null;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i + 1];
    if (quote) {
      sql += c;
      if (c === '\\' && quote !== '`') sql += text[++i] ?? '';
      else if (c === quote) quote = null;
    } else if (c === "'" || c === '"' || c === '`') {
      quote = c;
      sql += c;
    } else if (c === '#' || (c === '-' && next === '-' && /\s/.test(text[i + 2] ?? ' '))) {
      const end = text.indexOf('\n', i) === -1 ? text.length : text.indexOf('\n', i);
      if (!sql.trim()) notes.push(text.slice(i, end).trim());
      i = end - 1;
    } else if (c === '/' && next === '*') {
      const end = text.indexOf('*/', i + 2);
      i = end === -1 ? text.length : end + 1;
    } else if (c === ';' || (c === '\\' && /[gG]/.test(next ?? ''))) {
      if (sql.trim()) statements.push({ sql: sql.trim(), vertical: next === 'G' && c === '\\', notes });
      if (c === '\\') i++;
      sql = '';
      notes = [];
    } else {
      sql += c;
    }
  }
  return { statements, rest: sql.trim() ? sql : '' };
}

const cell = (value) => (value === null ? 'NULL' : Buffer.isBuffer(value) ? `0x${value.toString('hex')}` : String(value));

function table(fields, rows) {
  const data = rows.map((row) => row.map(cell));
  const widths = fields.map((f, i) => Math.max(width(f.name), ...data.map((row) => width(row[i]))));
  const line = `+${widths.map((w) => '-'.repeat(w + 2)).join('+')}+`;
  const format = (values, alignRight) =>
    `| ${values.map((v, i) => (alignRight?.[i] ? ' '.repeat(widths[i] - width(v)) + v : v + ' '.repeat(widths[i] - width(v)))).join(' | ')} |`;
  const numeric = fields.map((f) => NUMERIC_TYPES.has(f.columnType));
  return [line, format(fields.map((f) => f.name)), line, ...data.map((row) => format(row, numeric)), line].join('\n');
}

function vertical(fields, rows) {
  const w = Math.max(...fields.map((f) => width(f.name)));
  return rows
    .map((row, i) => [`${'*'.repeat(27)} ${i + 1}. row ${'*'.repeat(27)}`, ...row.map((v, j) => `${fields[j].name.padStart(w)}: ${cell(v)}`)].join('\n'))
    .join('\n');
}

async function execute(conn, statement) {
  const started = performance.now();
  try {
    const [result, fields] = await conn.query({ sql: statement.sql, rowsAsArray: true });
    const time = `(${((performance.now() - started) / 1000).toFixed(2)} sec)`;
    if (fields) {
      const output = result.length ? `${(statement.vertical ? vertical : table)(fields, result)}\n${plural(result.length, 'row')} in set` : 'Empty set';
      console.log(`${output} ${time}\n`);
    } else if (/^use\s/i.test(statement.sql)) {
      console.log('Database changed\n');
    } else {
      console.log(`Query OK, ${plural(result.affectedRows, 'row')} affected ${time}${result.info ? `\n${result.info.trim()}` : ''}\n`);
    }
  } catch (err) {
    console.log(`${red(err.errno ? `ERROR ${err.errno} (${err.sqlState}): ${err.sqlMessage}` : `ERROR: ${err.message}`)}\n`);
    if (err.fatal) throw err;
  }
}

function echo(statement) {
  statement.notes.forEach((note) => console.log(dim(note)));
  const lines = statement.sql.split('\n');
  const shown = lines.length > 12 ? [...lines.slice(0, 3), `… ${lines.length - 3} more lines`] : lines;
  console.log(`${shown.map((line, i) => (i ? '    -> ' : 'mysql> ') + cyan(line)).join('\n')}${cyan(statement.vertical ? '\\G' : ';')}`);
}

async function runFile(conn, file) {
  const full = [process.env.INIT_CWD, process.cwd(), PROJECT_DIR]
    .filter(Boolean)
    .map((base) => path.resolve(base, file))
    .find((candidate) => fs.existsSync(candidate));
  if (!full) return console.log(red(`ERROR: file not found: ${file}\n`));
  console.log(dim(`-- running ${path.relative(PROJECT_DIR, full).split(path.sep).join('/')}\n`));
  for (const statement of splitSql(fs.readFileSync(full, 'utf8')).statements) {
    echo(statement);
    await execute(conn, statement);
  }
}

const HELP = `
End every statement with ;  (or \\G to show one column per line). Statements may span lines.
  source database/queries.sql   run a .sql file
  exit                          quit (Ctrl+D also works, Ctrl+C clears the current input)
Try: SHOW TABLES;  DESCRIBE rooms;  SELECT name, city FROM colleges;
`;

async function interactive(conn, version) {
  console.log(`\nMySQL ${version} · database ${config.db.name} · type "help" for help, "exit" to quit\n`);
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, historySize: 500 });
  let buffer = '';
  const prompt = () => {
    rl.setPrompt(buffer ? '    -> ' : 'mysql> ');
    rl.prompt();
  };
  rl.on('SIGINT', () => {
    buffer = '';
    process.stdout.write('^C\n');
    prompt();
  });
  prompt();
  for await (const line of rl) {
    const command = line.trim().replace(/;$/, '');
    if (!buffer && /^(exit|quit|\\q)$/i.test(command)) break;
    if (!buffer && /^(help|\\h|\?)$/i.test(command)) console.log(HELP);
    else if (!buffer && /^(source|\\\.)\s+/i.test(command)) await runFile(conn, command.replace(/^\S+\s+/, ''));
    else {
      const { statements, rest } = splitSql(`${buffer}${line}\n`);
      buffer = rest;
      for (const statement of statements) await execute(conn, statement);
    }
    prompt();
  }
  rl.close();
  console.log('Bye');
}

let db;
try {
  db = await startDatabase();
} catch (err) {
  console.error(`\n✖ ${err.message}\n`);
  process.exit(1);
}
const conn = await mysql.createConnection({
  host: '127.0.0.1',
  port: db.port,
  user: 'root',
  database: config.db.name,
  dateStrings: true,
  jsonStrings: true,
  supportBigNumbers: true,
  bigNumberStrings: true,
});

try {
  const files = process.argv.slice(2);
  if (files.length) for (const file of files) await runFile(conn, file);
  else if (process.stdin.isTTY) await interactive(conn, db.version);
  else for (const statement of splitSql(fs.readFileSync(0, 'utf8')).statements) await execute(conn, statement);
} catch (err) {
  console.error(red(`\n✖ ${err.message}`));
}
conn.destroy();
await db.stop();
process.exit(0);
