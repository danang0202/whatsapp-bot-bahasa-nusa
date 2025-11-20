/*  

  Made By BahasaNusa
  Base : BahasaNusa
  WhatsApp : wa.me/6283829814737
  Telegram : t.me/bahasanusa
  Youtube : @BahasaNusa

  Channel : https://whatsapp.com/channel/0029VaGdzBSGZNCmoTgN2K0u

  Copy Code?, Recode?, Rename?, Reupload?, Reseller? Taruh Credit Ya :D

  Mohon Untuk Tidak Menghapus Watermark Di Dalam Kode Ini

*/

// Import Module
import '../config/config.js';
import '../ui/menus/bahasa-nusa-menu.js';
import fs from 'fs';
import axios from 'axios';
import { saveEventToDatabase } from '../helpers/events.js';

// State management untuk user sessions
const userSessions = new Map();

// Helper functions
function generateEventId() {
    return Math.random().toString(36).substr(2, 8).toUpperCase();
}

function generatePassword() {
    const adjectives = ['WAYANG', 'BATIK', 'BUDAYA', 'NUSA', 'SENI'];
    const years = ['2024', '2025'];
    return adjectives[Math.floor(Math.random() * adjectives.length)] + years[Math.floor(Math.random() * years.length)];
}

function generateLinks(eventId) {
    const baseUrl = 'https://bahasa-nusa.vercel.app';
    return {
        audioInput: `${baseUrl}/s/${eventId}w`,
        viewerSubtitle: `${baseUrl}/v/${eventId}y`
    };
}

function formatDateTime(dateStr, timeStr) {
    const [day, month, year] = dateStr.split('/');
    const [hour, minute] = timeStr.split(':');
    return `${day} ${getMonthName(month)} ${year}, ${hour}:${minute}`;
}

function getMonthName(month) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    return months[parseInt(month) - 1] || month;
}

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
        // Tampilkan menu utama dulu
        const menuImage = fs.readFileSync(image);
        userSessions.set(sender, { step: 'menu', eventData: {} });
        return bahasaNusa.sendMessage(sender, {
            image: menuImage,
            caption: bahasaNusaMenu,
            mentions: [sender]
        }, { quoted: msg });
    }

    if (userInput === 'batal') {
        userSessions.delete(sender);
        const menuImage = fs.readFileSync(image);
        return bahasaNusa.sendMessage(sender, {
            image: menuImage,
            caption: bahasaNusaMenu + '\n\n❌ Proses pendaftaran dibatalkan. Anda dapat memulai ulang dengan mengetik "daftar".',
            mentions: [sender]
        }, { quoted: msg });
    }
    if (userInput === 'daftar') {
        // Mulai pendaftaran acara
        userSessions.set(sender, { step: 'ask_event_name', eventData: {} });
        return bahasaNusaReply(`*${mess.welcome}*\n\n>Kapan saja, Anda dapat mengirim "batal" untuk membatalkan dan kembali ke menu.`);
    }
    if (userInput === 'menu') {
        // Tampilkan menu utama
        const menuImage = fs.readFileSync(image);
        return bahasaNusa.sendMessage(sender, {
            image: menuImage,
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

*Kapan saja, Anda dapat mengirim "batal" untuk membatalkan dan kembali ke menu.*
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
            userSession.step = 'ask_date_time';
            userSessions.set(sender, userSession);
            return bahasaNusaReply(`*Bagus! "${body}" 🎭*\n\nKapan acara ini akan berlangsung?\n_Format: DD/MM/YYYY HH:MM_\n>Kapan saja, Anda dapat mengirim "batal" untuk membatalkan dan kembali ke menu.`);
            
        case 'ask_date_time':
            const dateTimeMatch = body.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})/);
            if (!dateTimeMatch) {
                return bahasaNusaReply(`*Format tanggal dan waktu tidak valid.*\n\nSilakan gunakan format: _DD/MM/YYYY HH:MM_\nContoh: _15/12/2024 19:00_\n>Kapan saja, Anda dapat mengirim "batal" untuk membatalkan dan kembali ke menu.`);
            }
            userSession.eventData.dateTime = body;
            userSession.step = 'ask_duration';
            userSessions.set(sender, userSession);
            return bahasaNusaReply(`*Estimasi durasi acara (dalam menit)?*\n>Kapan saja, Anda dapat mengirim "batal" untuk membatalkan dan kembali ke menu.`);
            
        case 'ask_duration':
            const duration = parseInt(body);
            if (isNaN(duration) || duration <= 0) {
                return bahasaNusaReply(`*Mohon masukkan durasi dalam angka (menit).*\nContoh: _120_\n>Kapan saja, Anda dapat mengirim "batal" untuk membatalkan dan kembali ke menu.`);
            }
            userSession.eventData.duration = duration;
            userSession.step = 'ask_payment_model';
            userSessions.set(sender, userSession);
            return bahasaNusaReply(`*Siapa yang akan menanggung biaya subtitle?*\n\n1️⃣ Penyelenggara (flat fee)\n2️⃣ Penonton (pay per view)\n>Kapan saja, Anda dapat mengirim "batal" untuk membatalkan dan kembali ke menu.`);
            
        case 'ask_payment_model':
            if (!['1', '2'].includes(body)) {
                return bahasaNusaReply(`*Pilihan tidak valid. Silakan pilih:*\n\n1️⃣ Penyelenggara (flat fee)\n2️⃣ Penonton (pay per view)\n>Kapan saja, Anda dapat mengirim "batal" untuk membatalkan dan kembali ke menu.`);
            }
            
            userSession.eventData.paymentModel = body === '1' ? 'Penyelenggara (flat fee)' : 'Pay per View';
            userSession.eventData.price = body === '1' ? 'Rp 50.000' : 'Rp 5.000';
            
            // Generate event details
            const eventId = generateEventId();
            const password = generatePassword();
            const links = generateLinks(eventId);
            const formattedDateTime = formatDateTime(...userSession.eventData.dateTime.split(' '));
            
            // Simpan data ke database (future ready)
            await saveEventToDatabase({
                name: userSession.eventData.name,
                dateTime: formattedDateTime,
                duration: userSession.eventData.duration,
                paymentModel: userSession.eventData.paymentModel,
                price: userSession.eventData.price,
                audioInput: links.audioInput,
                viewerSubtitle: links.viewerSubtitle,
                dashboardPassword: password,
                sender: sender
            });

            // Final summary
            const summary = `${mess.eventRegistered}\n\n*Nama Acara:* ${userSession.eventData.name}\n*Waktu:* ${formattedDateTime}\n*Durasi:* ${userSession.eventData.duration} menit\n*Model:* ${userSession.eventData.paymentModel}\n*Harga/penonton:* ${userSession.eventData.price}\n\n🔗 *Link Anda:*\n\n🎤 *Audio Input (Penyelenggara)*\n${links.audioInput}\n\n👁️ *Viewer Subtitle (Penonton)*\n${links.viewerSubtitle}\n\n🔐 *Password Dashboard:*\n*${password}*\n\nGunakan password ini untuk login ke dashboard penyelenggara`;

            // Reset user session
            userSessions.delete(sender);

            return bahasaNusaReply(summary);
            
        default:
            // Jika user mengirim pesan di luar flow
            if (!userInput.includes('mulai') && !userInput.includes('bantuan') && !userInput.includes('kontak')) {
                const menuImage = fs.readFileSync(image);
                return bahasaNusa.sendMessage(sender, {
                    image: menuImage,
                    caption: bahasaNusaMenu,
                    mentions: [sender]
                }, { quoted: msg });
            }
    }
}
