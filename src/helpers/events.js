
import dotenv from 'dotenv';
import pkg from 'pg';
import bcrypt from 'bcrypt';

dotenv.config();

const { Pool } = pkg;
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

/**
 * Hash password menggunakan bcrypt
 * @param {string} password
 * @returns {Promise<string>} hash
 */
async function hashPassword(password) {
    const saltRounds = 10;
    return await bcrypt.hash(password, saltRounds);
}

/**
 * Cek dan simpan user ke database jika belum ada
 * @param {object} userData - { noHp, namaPenyelenggara, password }
 * @returns {object} user row
 */
export async function saveUserIfNotExists(userData) {
    // Cek apakah user sudah ada
    const checkSql = 'SELECT * FROM "user" WHERE no_hp = $1';
    const checkResult = await pool.query(checkSql, [userData.noHp]);
    if (checkResult.rows.length > 0) {
        return checkResult.rows[0];
    }

    // Hash password dashboard dengan bcrypt
    const passwordHash = await hashPassword(userData.password);

    // Insert user baru
    const insertSql = `
        INSERT INTO "user" (
            no_hp, password_hash, nama_penyelenggara, created_at, updated_at
        ) VALUES (
            $1, $2, $3, NOW(), NOW()
        ) RETURNING *
    `;
    const insertValues = [
        userData.noHp,
        passwordHash,
        userData.namaPenyelenggara
    ];
    const insertResult = await pool.query(insertSql, insertValues);
    return insertResult.rows[0];
}

/**
 * Save event data to database
 * @param {object} eventData - event data to be saved
 * @returns {boolean} - true if saved successfully
 */
export async function saveEventToDatabase(eventData) {
    const sql = `
        INSERT INTO events (
            nama_acara, lokasi_acara, tanggal_acara, status, tipe_pembayaran, user_id,
            estimasi_durasi_menit, kode_bahasa, random_viewer_kode, random_penyelenggara_kode,
            status_pembayaran, biaya_penyelenggara, biaya_telah_dibayar_penyelenggara,
            biaya_penonton, created_at, updated_at
        ) VALUES (
            $1, $2, $3, $4, $5, $6,
            $7, $8, $9, $10,
            $11, $12, $13,
            $14, $15, $16
        )
    `;
    const values = [
        eventData.nama_acara,
        eventData.lokasi_acara,
        eventData.tanggal_acara,
        eventData.status,
        eventData.tipe_pembayaran,
        eventData.user_id,
        eventData.estimasi_durasi_menit,
        eventData.kode_bahasa,
        eventData.random_viewer_kode,
        eventData.random_penyelenggara_kode,
        eventData.status_pembayaran,
        eventData.biaya_penyelenggara,
        eventData.biaya_telah_dibayar_penyelenggara,
        eventData.biaya_penonton,
        eventData.created_at,
        eventData.updated_at
    ];
    await pool.query(sql, values);
    return true;
}
