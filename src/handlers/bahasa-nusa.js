import '../config/config.js';
import '../ui/menus/bahasa-nusa-menu.js';
import fs from 'fs';
import { saveEventToDatabase, saveUserIfNotExists, generatePassword, generateLinks, formatDateTime, getMonthName } from '../helpers/events.js';
import cuid from 'cuid';
import { languages } from '../helpers/enums.js';
import { TipePembayaranAcara, BIAYA_PENYELENGGARA, BIAYA_PENONTON } from '../helpers/enums.js';

// State management untuk user sessions
const userSessions = new Map();

// Helper functions


export default async (bahasaNusa, m) => {
    const msg = m.messages[0];
    if (!msg.message) return;

    const body = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
    const sender = msg.key.remoteJid;
    const pushname = msg.pushName || "BahasaNusa";

    // Get user session atau create new
    const userSession = userSessions.get(sender) || { step: 'welcome', eventData: {} };

    const bahasaNusaReply = (teks) => bahasaNusa.sendMessage(sender, { text: teks }, { quoted: msg });

    // Handle flow berdasarkan user input
    const userInput = body.trim().toLowerCase();
    // Flow pendaftaran acara BahasaNusa
    if (userSession.step === 'welcome') {
        // Tampilkan menu utama
        userSessions.set(sender, { step: 'menu', eventData: {} });
        return bahasaNusa.sendMessage(sender, {
            text: bahasaNusaMenu,
            mentions: [sender]
        }, { quoted: msg });
    }

    if (userInput === 'batal') {
        userSessions.delete(sender);
        return bahasaNusa.sendMessage(sender, {
            text: bahasaNusaMenu + '\n\n> ❌ Proses pendaftaran dibatalkan. Anda dapat memulai ulang dengan mengetik "daftar".',
            mentions: [sender]
        }, { quoted: msg });
    }
    if (userInput === 'daftar') {
        // Mulai pendaftaran acara
        userSessions.set(sender, { step: 'ask_event_name', eventData: {} });
        return bahasaNusaReply(`${mess.welcome}\n\n> Untuk membatalkan proses pendaftarkan, ketikkan "batal".`);
    }
    if (userInput === 'menu') {
        // Tampilkan menu utama
        return bahasaNusa.sendMessage(sender, {
            caption: bahasaNusaMenu,
            mentions: [sender]
        }, { quoted: msg });
    }

    if (userInput === 'bantuan') {
        return bahasaNusaReply(`*🔧 Panduan Penggunaan BahasaNusa*

1️⃣ Ketik "daftar" untuk mendaftar acara
2️⃣ Ikuti langkah demi langkah
3️⃣ Dapatkan link dan password untuk acara Anda

*Fitur Subtitle Real-time:*
• Link Audio Input untuk penyelenggara
• Link Viewer Subtitle untuk penonton
• Dashboard terintegrasi

*Untuk membatalkan proses pendaftarkan, ketikkan "batal".*
*Butuh bantuan lebih lanjut? Ketik "kontak"*`);
    }

    if (userInput === 'kontak') {
        return bahasaNusaReply(`*📞 Hubungi Kami*

*WhatsApp:* wa.me/6283829814737
*Telegram:* t.me/bahasanusa
*YouTube:* @BahasaNusa

*Tim Support BahasaNusa siap membantu Anda!* 🤝`);
    }

    // Handle flow pendaftaran berdasarkan step
    switch (userSession.step) {
        case 'ask_event_name':
            userSession.eventData.name = body;
            userSession.step = 'ask_location';
            userSessions.set(sender, userSession);
            return bahasaNusaReply(`*Lokasi acara "${body}" di mana?*\n\n_Contoh: Gedung Serbaguna, Jakarta_\n\n> Untuk membatalkan proses pendaftarkan, ketikkan "batal".`);

        case 'ask_location':
            userSession.eventData.location = body;
            userSession.step = 'ask_date_time';
            userSessions.set(sender, userSession);
            return bahasaNusaReply(`*Kapan acara ini akan berlangsung?*\nFormat: DD/MM/YYYY HH:MM\n\n_Contoh: 15/12/2024 19:00_\n\n> Untuk membatalkan proses pendaftarkan, ketikkan "batal".`);

        case 'ask_date_time':
            const dateTimeMatch = body.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})/);
            if (!dateTimeMatch) {
                return bahasaNusaReply(`*Format tanggal dan waktu tidak valid.*\n\nSilakan gunakan format: DD/MM/YYYY HH:MM\n_Contoh: 15/12/2024 19:00_\n> Untuk membatalkan proses pendaftarkan, ketikkan "batal".`);
            }
            // Validasi tanggal dan jam tidak boleh lebih awal dari sekarang
            const [dateStrInput, timeStrInput] = body.split(' ');
            let [dayInput, monthInput, yearInput] = dateStrInput.split('/');
            let [hourInput, minuteInput] = timeStrInput.split(':');
            dayInput = dayInput.padStart(2, '0');
            monthInput = monthInput.padStart(2, '0');
            hourInput = hourInput.padStart(2, '0');
            minuteInput = minuteInput.padStart(2, '0');
            const inputDate = new Date(`${yearInput}-${monthInput}-${dayInput}T${hourInput}:${minuteInput}:00`);
            const now = new Date();
            if (inputDate < now) {
                return bahasaNusaReply(`*Tanggal dan jam acara tidak boleh lebih awal dari sekarang.*\nSilakan masukkan tanggal dan jam yang valid.\n_Contoh: 15/12/2024 19:00_\n\n> Untuk membatalkan proses pendaftarkan, ketikkan "batal".`);
            }
            userSession.eventData.dateTime = body;
            userSession.step = 'ask_duration';
            userSessions.set(sender, userSession);
            return bahasaNusaReply(`*Estimasi durasi acara (dalam menit)?*\n_Contoh: 120_\n\n> Untuk membatalkan proses pendaftarkan, ketikkan "batal".`);

        case 'ask_duration':
            const duration = parseInt(body);
            if (isNaN(duration) || duration <= 0) {
                return bahasaNusaReply(`*Mohon masukkan durasi dalam angka (menit).*\n\n> Untuk membatalkan proses pendaftarkan, ketikkan "batal".`);
            }
            userSession.eventData.duration = duration;
            userSession.step = 'ask_language';
            userSessions.set(sender, userSession);
            // Tampilkan pilihan bahasa
            let langMsg = '*Pilih bahasa yang digunakan untuk subtitle:*\n';
            languages.forEach((lang, idx) => {
                langMsg += `${idx + 1}. ${lang.namaBahasa}\n`;
            });
            langMsg += '\nKetik angka sesuai pilihan Anda.\n_Contoh: 1_';
            return bahasaNusaReply(langMsg);

        case 'ask_language':
            const langIdx = parseInt(body) - 1;
            if (isNaN(langIdx) || langIdx < 0 || langIdx >= languages.length) {
                return bahasaNusaReply('Pilihan bahasa tidak valid. Silakan pilih angka yang sesuai.');
            }
            userSession.eventData.kodeBahasa = languages[langIdx].kodeBahasa;
            userSession.step = 'ask_payment_model';
            userSessions.set(sender, userSession);
            return bahasaNusaReply(`*Siapa yang akan menanggung biaya subtitle?*\n\n1️⃣ Penyelenggara (flat fee)\n2️⃣ Penonton (pay per view)\n\n> Untuk membatalkan proses pendaftarkan, ketikkan "batal".`);

        case 'ask_payment_model':
            if (!['1', '2'].includes(body)) {
                return bahasaNusaReply(`*Pilihan tidak valid. Silakan pilih:*\n\n1️⃣ Penyelenggara (flat fee)\n2️⃣ Penonton (pay per view)\n\n> Untuk membatalkan proses pendaftarkan, ketikkan "batal".`);
            }
            // Set model dan biaya menggunakan enum dan konstanta dari enums.js
            userSession.eventData.tipePembayaran = body === '1' ? TipePembayaranAcara.PENYELENGGARA : TipePembayaranAcara.PENONTON;
            userSession.eventData.biayaPenyelenggara = body === '1' ? BIAYA_PENYELENGGARA : 0.0;
            userSession.eventData.biayaPenonton = body === '2' ? BIAYA_PENONTON : 0.0;
            userSession.eventData.biayaTelahDibayarPenyelenggara = null;
            userSession.eventData.statusPembayaran = 'PENDING';
            // Generate event details dan id acara
            const eventId = cuid();
            const viewerCode = `${eventId}y`;
            const penyelenggaraCode = `${eventId}w`;
            const password = generatePassword();
            const links = generateLinks(eventId);
            // Parse tanggal_acara ke format ISO
            const [dateStrEvent, timeStrEvent] = userSession.eventData.dateTime.split(' ');
            let [dayEvent, monthEvent, yearEvent] = dateStrEvent.split('/');
            let [hourEvent, minuteEvent] = timeStrEvent.split(':');
            // Zero pad values to ensure valid date
            dayEvent = dayEvent.padStart(2, '0');
            monthEvent = monthEvent.padStart(2, '0');
            hourEvent = hourEvent.padStart(2, '0');
            minuteEvent = minuteEvent.padStart(2, '0');
            const isoDate = new Date(`${yearEvent}-${monthEvent}-${dayEvent}T${hourEvent}:${minuteEvent}:00`).toISOString();
            // Simpan/cek user
            const userRow = await saveUserIfNotExists({
                noHp: sender,
                namaPenyelenggara: pushname,
                password: password
            });
            // Simpan data ke database
            await saveEventToDatabase({
                id: eventId,
                nama_acara: userSession.eventData.name,
                lokasi_acara: userSession.eventData.location,
                tanggal_acara: isoDate,
                status: 'BELUM_MULAI',
                tipe_pembayaran: userSession.eventData.tipePembayaran,
                user_id: userRow.id,
                estimasi_durasi_menit: userSession.eventData.duration,
                kode_bahasa: userSession.eventData.kodeBahasa,
                random_viewer_kode: viewerCode,
                random_penyelenggara_kode: penyelenggaraCode,
                status_pembayaran: userSession.eventData.statusPembayaran,
                biaya_penyelenggara: userSession.eventData.biayaPenyelenggara,
                biaya_telah_dibayar_penyelenggara: userSession.eventData.biayaTelahDibayarPenyelenggara,
                biaya_penonton: userSession.eventData.biayaPenonton,
                created_at: new Date(),
                updated_at: new Date()
            });
            // Final summary
            const summary = `${mess.eventRegistered}\n\n*Nama Acara:* ${userSession.eventData.name}\n*Lokasi:* ${userSession.eventData.location}\n*Waktu:* ${formatDateTime(dateStr, timeStr)}\n*Durasi:* ${userSession.eventData.duration} menit\n*Bahasa:* ${languages.find(l => l.kodeBahasa === userSession.eventData.kodeBahasa)?.namaBahasa}\n*Model:* ${userSession.eventData.tipePembayaran}\n*Harga/penonton:* ${userSession.eventData.biayaPenonton > 0 ? 'Rp ' + userSession.eventData.biayaPenonton : '-'}\n*Biaya Penyelenggara:* ${userSession.eventData.biayaPenyelenggara > 0 ? 'Rp ' + userSession.eventData.biayaPenyelenggara : '-'}\n*Status Pembayaran:* ${userSession.eventData.statusPembayaran}\n\n🔗 *Link Anda:*\n\n🎤 *Audio Input (Penyelenggara)*\n${links.audioInput}\n\n👁️ *Viewer Subtitle (Penonton)*\n${links.viewerSubtitle}\n\n🔐 *Password Dashboard:*\n*${password}*\n\nGunakan password ini untuk login ke dashboard penyelenggara`;
            // Reset user session
            userSessions.delete(sender);
            return bahasaNusaReply(summary);

        default:
            // Jika user mengirim pesan di luar flow
            if (!userInput.includes('mulai') && !userInput.includes('bantuan') && !userInput.includes('kontak')) {
                return bahasaNusa.sendMessage(sender, {
                    text: bahasaNusaMenu,
                    mentions: [sender]
                }, { quoted: msg });
            }
    }
}
