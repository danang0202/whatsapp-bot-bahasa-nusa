import cuid from 'cuid';

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
 * Generate random password for dashboard
 * @returns {string}
 */
export function generatePassword() {
    // Generate a random alphanumeric string (8 chars)
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let password = '';
    for (let i = 0; i < 8; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
}

/**
 * Generate event links
 * @param {string} eventId
 * @returns {{audioInput: string, viewerSubtitle: string}}
 */
export function generateLinks(eventId) {
    const baseUrl = 'https://bahasa-nusa.ekoptra.com';
    return {
        audioInput: `${baseUrl}/s/${eventId}w`,
        viewerSubtitle: `${baseUrl}/v/${eventId}y`
    };
}

/**
 * Format date and time
 * @param {string} dateStr
 * @param {string} timeStr
 * @returns {string}
 */
export function formatDateTime(dateStr, timeStr) {
    const [day, month, year] = dateStr.split('/');
    const [hour, minute] = timeStr.split(':');
    return `${day} ${getMonthName(month)} ${year}, ${hour}:${minute}`;
}

/**
 * Get month name from number
 * @param {string} month
 * @returns {string}
 */
export function getMonthName(month) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    return months[parseInt(month) - 1] || month;
}
/**
 * Generate random event ID
 * @returns {string}
 */

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
    const passwordHash = await hashPassword(userData.password);

    if (checkResult.rows.length > 0) {        
        const updateSql = `
            UPDATE "user" 
            SET password_hash = $1, updated_at = NOW()
            WHERE no_hp = $2
            RETURNING *
        `;
        const updateResult = await pool.query(updateSql, [passwordHash, userData.noHp]);
        return updateResult.rows[0];
    }
    // Generate cuid untuk id
    const userId = cuid();

    // Insert user baru, sertakan id dan field bank info sebagai null
    const insertSql = `
        INSERT INTO "user" (
            id, no_hp, password_hash, nama_penyelenggara, nama_bank, no_rekening, nama_pemilik_rekening, created_at, updated_at
        ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, NOW(), NOW()
        ) RETURNING *
    `;
    const insertValues = [
        userId,
        userData.noHp,
        passwordHash,
        userData.namaPenyelenggara,
        "null", // nama_bank
        "null", // no_rekening
        "null"  // nama_pemilik_rekening
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
    // Start transaction untuk memastikan konsistensi data
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        // Insert ke tabel acara
        const acaraSql = `
            INSERT INTO acara (
                id, nama_acara, lokasi_acara, tanggal_acara, status, tipe_pembayaran, user_id,
                estimasi_durasi_menit, kode_bahasa, random_viewer_kode, random_penyelenggara_kode,
                status_pembayaran, biaya_penyelenggara, biaya_telah_dibayar_penyelenggara,
                biaya_penonton, created_at, updated_at
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7,
                $8, $9, $10, $11,
                $12, $13, $14,
                $15, $16, $17
            )
        `;
        const acaraValues = [
            eventData.id,
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
        
        await client.query(acaraSql, acaraValues);
        
        // Insert ke tabel acara_bahasa_source
        const bahasaSourceId = cuid();
        const bahasaSourceSql = `
            INSERT INTO acara_bahasa_source (
                id, acara_id, kode_bahasa, created_at, updated_at
            ) VALUES (
                $1, $2, $3, NOW(), NOW()
            )
        `;
        const bahasaSourceValues = [
            bahasaSourceId,
            eventData.id,
            eventData.kode_bahasa
        ];
        
        await client.query(bahasaSourceSql, bahasaSourceValues);
        
        // Commit transaction
        await client.query('COMMIT');
        
        console.log(`✅ Event saved: ${eventData.id} with source language: ${eventData.kode_bahasa}`);
        return true;
        
    } catch (error) {
        // Rollback transaction jika terjadi error
        await client.query('ROLLBACK');
        console.error('❌ Error saving event to database:', error);
        throw error;
    } finally {
        // Release client connection
        client.release();
    }
}
