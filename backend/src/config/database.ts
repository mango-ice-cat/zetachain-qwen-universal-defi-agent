import sqlite3 from 'sqlite3';
import { Database, open } from 'sqlite';
import path from 'path';

let db: Database | null = null;

export const initDB = async () => {
  if (db) return db;

  const dbPath = path.resolve(__dirname, '../../database.sqlite');
  
  db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      address TEXT UNIQUE,
      preferences TEXT
    );

    CREATE TABLE IF NOT EXISTS strategies (
      id TEXT PRIMARY KEY,
      user_address TEXT,
      intent TEXT,
      options TEXT,
      status TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      strategy_id TEXT,
      user_address TEXT,
      run_id TEXT,
      tx_hash TEXT,
      chain TEXT,
      chain_id INTEGER,
      status TEXT,
      description TEXT,
      tx_timestamp INTEGER,
      details TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const ensureColumn = async (table: string, column: string, type: string) => {
    const columns = await db!.all<{ name: string }[]>(`PRAGMA table_info(${table})`);
    if (!columns.some(col => col.name === column)) {
      await db!.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
    }
  };

  await ensureColumn('transactions', 'user_address', 'TEXT');
  await ensureColumn('transactions', 'run_id', 'TEXT');
  await ensureColumn('transactions', 'chain_id', 'INTEGER');
  await ensureColumn('transactions', 'description', 'TEXT');
  await ensureColumn('transactions', 'tx_timestamp', 'INTEGER');

  console.log('Database initialized at', dbPath);
  return db;
};

export const getDB = () => {
  if (!db) throw new Error('Database not initialized');
  return db;
};
