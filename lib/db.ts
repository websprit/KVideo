/**
 * Database Module - MySQL
 * Uses mysql2 for connection pooling and async/await support
 */

import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';

let pool: mysql.Pool | null = null;

function getPool(): mysql.Pool {
    if (!pool) {
        pool = mysql.createPool({
            host: process.env.MYSQL_HOST || 'localhost',
            port: parseInt(process.env.MYSQL_PORT || '3306'),
            user: process.env.MYSQL_USER || 'kvideo',
            password: process.env.MYSQL_PASSWORD || 'kvideo123',
            database: process.env.MYSQL_DATABASE || 'kvideo',
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0,
        });
    }
    return pool;
}

let _initialized = false;

async function ensureInitialized(): Promise<void> {
    if (_initialized) return;
    const p = getPool();
    await initSchema(p);
    await seedAdminUser(p);
    _initialized = true;
}

async function initSchema(p: mysql.Pool) {
    await p.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      is_admin TINYINT DEFAULT 0,
      disable_premium TINYINT DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

    await p.execute(`
    CREATE TABLE IF NOT EXISTS user_data (
      user_id INT NOT NULL,
      data_key VARCHAR(100) NOT NULL,
      data_value LONGTEXT,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, data_key),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
}

async function seedAdminUser(p: mysql.Pool) {
    const [rows] = await p.execute('SELECT id FROM users WHERE username = ?', ['admin']);
    if ((rows as any[]).length === 0) {
        const hash = bcrypt.hashSync('Admin@1234', 10);
        await p.execute(
            'INSERT INTO users (username, password_hash, is_admin, disable_premium) VALUES (?, ?, 1, 0)',
            ['admin', hash]
        );
    }
}

// ============ User Operations ============

export interface DbUser {
    id: number;
    username: string;
    password_hash: string;
    is_admin: number;
    disable_premium: number;
    created_at: string;
}

export async function getUserByUsername(username: string): Promise<DbUser | undefined> {
    await ensureInitialized();
    const [rows] = await getPool().execute('SELECT * FROM users WHERE username = ?', [username]);
    return (rows as DbUser[])[0];
}

export async function getUserById(id: number): Promise<DbUser | undefined> {
    await ensureInitialized();
    const [rows] = await getPool().execute('SELECT * FROM users WHERE id = ?', [id]);
    return (rows as DbUser[])[0];
}

export async function getAllUsers(): Promise<DbUser[]> {
    await ensureInitialized();
    const [rows] = await getPool().execute(
        'SELECT id, username, is_admin, disable_premium, created_at FROM users ORDER BY id'
    );
    return rows as DbUser[];
}

export async function createUser(username: string, password: string, disablePremium: boolean = true): Promise<DbUser> {
    await ensureInitialized();
    const hash = bcrypt.hashSync(password, 10);
    const [result] = await getPool().execute(
        'INSERT INTO users (username, password_hash, disable_premium) VALUES (?, ?, ?)',
        [username, hash, disablePremium ? 1 : 0]
    );
    return (await getUserById((result as any).insertId))!;
}

export async function updateUser(id: number, updates: { username?: string; password?: string; disable_premium?: boolean }): Promise<boolean> {
    await ensureInitialized();
    const fields: string[] = [];
    const values: (string | number)[] = [];

    if (updates.username !== undefined) {
        fields.push('username = ?');
        values.push(updates.username);
    }
    if (updates.password !== undefined) {
        fields.push('password_hash = ?');
        values.push(bcrypt.hashSync(updates.password, 10));
    }
    if (updates.disable_premium !== undefined) {
        fields.push('disable_premium = ?');
        values.push(updates.disable_premium ? 1 : 0);
    }

    if (fields.length === 0) return false;

    values.push(id);
    const [result] = await getPool().execute(
        `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
        values
    );
    return (result as any).affectedRows > 0;
}

export async function deleteUser(id: number): Promise<boolean> {
    await ensureInitialized();
    const [result] = await getPool().execute('DELETE FROM users WHERE id = ? AND is_admin = 0', [id]);
    return (result as any).affectedRows > 0;
}

export function verifyPassword(plaintext: string, hash: string): boolean {
    return bcrypt.compareSync(plaintext, hash);
}

// ============ User Data Operations ============

export async function getUserData(userId: number, key: string): Promise<string> {
    await ensureInitialized();
    const [rows] = await getPool().execute(
        'SELECT data_value FROM user_data WHERE user_id = ? AND data_key = ?',
        [userId, key]
    );
    const row = (rows as any[])[0];
    return row?.data_value || '{}';
}

export async function setUserData(userId: number, key: string, value: string): Promise<void> {
    await ensureInitialized();
    await getPool().execute(
        `INSERT INTO user_data (user_id, data_key, data_value)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE data_value = VALUES(data_value)`,
        [userId, key, value]
    );
}

export async function deleteAllUserData(userId: number): Promise<void> {
    await ensureInitialized();
    await getPool().execute('DELETE FROM user_data WHERE user_id = ?', [userId]);
}
