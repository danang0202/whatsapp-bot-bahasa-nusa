import '../config/config.js';
import '../ui/menus/bahasa-nusa-menu.js';
import { saveEventToDatabase, saveUserIfNotExists, generatePassword, generateLinks, formatDateTime, getMonthName } from '../helpers/events.js';
import cuid from 'cuid';
import { languages } from '../helpers/enums.js';
import { TipePembayaranAcara, BIAYA_PENYELENGGARA, BIAYA_PENONTON } from '../helpers/enums.js';
import OllamaClient from '../services/ollama/ollama-client.js';
import dotenv from 'dotenv';

dotenv.config();

// State management untuk user sessions
const userSessions = new Map();

// Initialize Ollama client
const ollama = new OllamaClient();

export default async (bahasaNusa, m) => {
    // Ambil nomor WhatsApp dari .env
    const nomorWhatsapp = process.env.NOMOR_WHATSAPP || '6285117656975';
    const msg = m.messages[0];
    if (!msg.message) return;

    const body = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
    const sender = msg.key.remoteJid;
    const pushname = msg.pushName || "BahasaNusa";

    // Get user session atau create new
    const userSession = userSessions.get(sender) || { step: 'welcome', eventData: {}, retryCount: 0 };

    // Helper function for LLM validation with retry logic
    const validateAndProcessInput = async (input, step) => {
        const ollamaAvailable = await ollama.isAvailable();
        if (!ollamaAvailable) {
            console.warn(`[Validation] Ollama not available, using fallback validation for ${step}`);
            return {
                isValid: input.trim().length > 2,
                value: input.trim(),
                confidence: 0.5,
                fallback: true,
                error: input.trim().length > 2 ? null : 'Input terlalu pendek'
            };
        }

        try {
            switch (step) {
                case 'ask_event_name':
                    console.log(`[LLM] Extracting event name from: "${input}"`);
                    const nameResult = await ollama.extractEventName(input);

                    // Check if extraction is meaningful and specific enough
                    const extractionWorked = nameResult.extracted !== input.trim() || nameResult.confidence > 0.8;
                    const isSpecificName = nameResult.extracted.length > 5 && !['acara', 'event', 'pertunjukan'].includes(nameResult.extracted.toLowerCase());

                    if (extractionWorked && isSpecificName) {
                        console.log(`[LLM] ✅ Event name: "${nameResult.extracted}" (${Math.round(nameResult.confidence * 100)}%)`);
                        return {
                            isValid: true,
                            value: nameResult.extracted,
                            confidence: nameResult.confidence,
                            originalInput: input
                        };
                    } else {
                        console.log(`[LLM] ❌ Event name extraction failed or unclear`);
                        return {
                            isValid: false,
                            value: input,
                            confidence: nameResult.confidence,
                            error: 'Nama acara tidak jelas. Mohon sebutkan nama acara yang lebih spesifik. Contoh: "Wayang Kulit Ramayana" atau "Pertunjukan Tari Kecak"'
                        };
                    }

                case 'ask_location':
                    console.log(`[LLM] Extracting location from: "${input}"`);
                    const locationResult = await ollama.extractLocation(input);

                    // Check if extraction is meaningful and specific enough
                    const locationWorked = locationResult.extracted !== input.trim() || locationResult.confidence > 0.8;
                    const isSpecificLocation = locationResult.extracted.length > 4 && !['sana', 'sini', 'tempat', 'lokasi'].includes(locationResult.extracted.toLowerCase());

                    if (locationWorked && isSpecificLocation) {
                        console.log(`[LLM] ✅ Location: "${locationResult.extracted}" (${Math.round(locationResult.confidence * 100)}%)`);
                        return {
                            isValid: true,
                            value: locationResult.extracted,
                            confidence: locationResult.confidence,
                            originalInput: input
                        };
                    } else {
                        console.log(`[LLM] ❌ Location extraction failed or unclear`);
                        return {
                            isValid: false,
                            value: input,
                            confidence: locationResult.confidence,
                            error: 'Lokasi tidak jelas. Mohon sebutkan tempat yang lebih spesifik. Contoh: "Gedung Kesenian Jakarta" atau "Pendopo Kahuripan, Sidoarjo"'
                        };
                    }

                case 'ask_date_time':
                    console.log(`[LLM] Validating datetime from: "${input}"`);
                    const dateTimeResult = await ollama.validateDateTime(input);

                    if (dateTimeResult.success) {
                        console.log(`[LLM] ✅ DateTime: "${dateTimeResult.extracted}" (${Math.round(dateTimeResult.confidence * 100)}%)`);
                        return {
                            isValid: true,
                            value: dateTimeResult.extracted,
                            confidence: dateTimeResult.confidence,
                            originalInput: input
                        };
                    } else {
                        console.log(`[LLM] ❌ DateTime validation failed: ${dateTimeResult.error}`);
                        return {
                            isValid: false,
                            value: input,
                            confidence: dateTimeResult.confidence,
                            error: dateTimeResult.error || 'Format tanggal tidak valid. Contoh: "25 November 2024 jam 7 malam", "besok jam 19:00", atau "30/12/2024 19:00"'
                        };
                    }

                default:
                    // For other fields like duration, language selection, etc.
                    return {
                        isValid: input.trim().length > 0,
                        value: input.trim(),
                        confidence: 0.9
                    };
            }
        } catch (error) {
            console.error(`[LLM] Error validating ${step}:`, error);
            return {
                isValid: false,
                value: input,
                confidence: 0.1,
                error: 'Terjadi kesalahan saat memproses input. Silakan coba lagi.'
            };
        }
    };

    // Helper function to handle validation errors with retry
    const handleValidationError = (validation, step) => {
        userSession.retryCount = (userSession.retryCount || 0) + 1;

        const errorMessage = validation.error || 'Input tidak valid';

        let message = `*Mohon maaf, ada yang perlu diperbaiki*\n\n${errorMessage}`;

        // Add specific examples based on step
        if (step === 'ask_event_name') {
            message += '\n\n*Contoh yang baik:*\n• Wayang Kulit Ramayana\n• Pertunjukan Tari Kecak\n• Festival Batik Nusantara\n• Konser Gamelan Jawa';
        } else if (step === 'ask_location') {
            message += '\n\n*Contoh yang baik:*\n• Gedung Kesenian Jakarta\n• Pendopo Kahuripan, Sidoarjo\n• Benteng Vredeburg Yogyakarta\n• Balai Budaya Surabaya';
        } else if (step === 'ask_date_time') {
            message += '\n\n*Contoh yang baik:*\n• 25 November 2024 jam 7 malam\n• Besok jam 19:00\n• 30/12/2024 19:00\n• Minggu depan jam 8 malam';
        }

        if (userSession.retryCount >= 3) {
            message += '\n\n⚠️ *Sudah 3 kali mencoba*\nJika masih kesulitan, ketik "bantuan" untuk panduan lengkap atau "kontak" untuk support.';
        } else {
            message += `\n\n🔄 *Percobaan ${userSession.retryCount}/3*\nSilakan coba lagi dengan format yang lebih jelas.`;
        }

        message += '\n\n> Untuk membatalkan proses pendaftaran, ketikkan "batal".';

        userSessions.set(sender, userSession);
        return bahasaNusaReply(message);
    };

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
        return bahasaNusaReply(`${mess.welcome}\n\n> Untuk membatalkan proses pendaftaran, ketikkan "batal".`);
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

*Untuk membatalkan proses pendaftaran, ketikkan "batal".*
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
            const nameValidation = await validateAndProcessInput(body, 'ask_event_name');

            if (!nameValidation.isValid) {
                return handleValidationError(nameValidation, 'ask_event_name');
            }

            userSession.eventData.name = nameValidation.value;
            userSession.eventData.originalNameInput = nameValidation.originalInput || body;
            userSession.step = 'ask_location';
            userSession.retryCount = 0;
            userSessions.set(sender, userSession);

            // Natural flow tanpa menunjukkan proses LLM
            let response = `*Lokasi acara "${nameValidation.value}" di mana?*\n\n_Contoh: Gedung Kesenian Jakarta, Pendopo Kahuripan Sidoarjo, atau Balai Budaya Surabaya_`;
            response += '\n\n> Untuk membatalkan proses pendaftaran, ketikkan "batal".';

            return bahasaNusaReply(response);

        case 'ask_location':
            const locationValidation = await validateAndProcessInput(body, 'ask_location');

            if (!locationValidation.isValid) {
                return handleValidationError(locationValidation, 'ask_location');
            }

            userSession.eventData.location = locationValidation.value;
            userSession.eventData.originalLocationInput = locationValidation.originalInput || body;
            userSession.step = 'ask_date_time';
            userSession.retryCount = 0;
            userSessions.set(sender, userSession);

            // Natural flow tanpa menunjukkan proses LLM
            let dateTimePrompt = `*Kapan acara "${userSession.eventData.name}" di ${locationValidation.value} akan berlangsung?*\n\nAnda bisa menuliskan dalam bahasa natural:\n• "25 November 2024 jam 7 malam"\n• "Besok jam 19:00"\n• "30/12/2024 20:00"`;
            dateTimePrompt += '\n\n> Untuk membatalkan proses pendaftaran, ketikkan "batal".';

            return bahasaNusaReply(dateTimePrompt);

        case 'ask_date_time':
            const dateTimeValidation = await validateAndProcessInput(body, 'ask_date_time');

            if (!dateTimeValidation.isValid) {
                return handleValidationError(dateTimeValidation, 'ask_date_time');
            }

            userSession.eventData.dateTime = dateTimeValidation.value;
            userSession.eventData.originalDateTimeInput = body;
            userSession.step = 'ask_duration';
            userSession.retryCount = 0;
            userSessions.set(sender, userSession);

            // Natural flow tanpa menunjukkan proses LLM
            let durationPrompt = `*Estimasi durasi acara "${userSession.eventData.name}" (dalam menit)?*\n\n_Contoh: 120 (untuk 2 jam), 90 (untuk 1.5 jam)_\n\nℹ️ Waktu acara: ${dateTimeValidation.value}\n\n> Untuk membatalkan proses pendaftaran, ketikkan "batal".`;

            return bahasaNusaReply(durationPrompt);

        case 'ask_duration':
            const duration = parseInt(body);
            if (isNaN(duration) || duration <= 0) {
                return bahasaNusaReply(`*Mohon masukkan durasi dalam angka (menit).*\n\n> Untuk membatalkan proses pendaftaran, ketikkan "batal".`);
            }
            userSession.eventData.duration = duration;
            userSession.step = 'ask_language';
            userSessions.set(sender, userSession);
            // Tampilkan pilihan bahasa
            let langMsg = '*Pilih bahasa yang digunakan untuk audio input:*\n';
            languages.forEach((lang, idx) => {
                langMsg += `${idx + 1}. ${lang.namaBahasa}\n`;
            });
            langMsg += '\nKetik angka sesuai pilihan Anda.\n_Contoh: 1_\n\n> Untuk membatalkan proses pendaftaran, ketikkan "batal".';
            return bahasaNusaReply(langMsg);

        case 'ask_language':
            const langIdx = parseInt(body) - 1;
            if (isNaN(langIdx) || langIdx < 0 || langIdx >= languages.length) {
                return bahasaNusaReply('Pilihan bahasa tidak valid. Silakan pilih angka yang sesuai.');
            }
            userSession.eventData.kodeBahasa = languages[langIdx].kodeBahasa;
            userSession.step = 'ask_payment_model';
            userSessions.set(sender, userSession);
            return bahasaNusaReply(`*Siapa yang akan menanggung biaya subtitle?*\n\n1️⃣ Penyelenggara (flat fee)\n2️⃣ Penonton (pay per view)\n\n> Untuk membatalkan proses pendaftaran, ketikkan "batal".`);

        case 'ask_payment_model':
            if (!['1', '2'].includes(body)) {
                return bahasaNusaReply(`*Pilihan tidak valid. Silakan pilih:*\n\n1️⃣ Penyelenggara (flat fee)\n2️⃣ Penonton (pay per view)\n\n> Untuk membatalkan proses pendaftaran, ketikkan "batal".`);
            }
            userSession.eventData.tipePembayaran = body === '1' ? TipePembayaranAcara.PENYELENGGARA : TipePembayaranAcara.PENONTON;
            userSession.eventData.biayaPenyelenggara = body === '1' ? BIAYA_PENYELENGGARA : 0.0;
            userSession.eventData.biayaPenonton = body === '2' ? BIAYA_PENONTON : 0.0;
            userSession.eventData.biayaTelahDibayarPenyelenggara = null;
            userSession.eventData.statusPembayaran = 'PENDING';
            userSession.step = 'konfirmasi_data';
            userSessions.set(sender, userSession);

            const recapMsg = `*🔍 Konfirmasi Data Acara*\n\n` +
                `*Nama Acara:* ${userSession.eventData.name}\n` +
                `*Lokasi:* ${userSession.eventData.location}\n` +
                `*Waktu:* ${userSession.eventData.dateTime}\n` +
                `*Durasi:* ${userSession.eventData.duration} menit\n` +
                `*Bahasa:* ${(languages.find(l => l.kodeBahasa === userSession.eventData.kodeBahasa) || {}).namaBahasa || '-'}\n` +
                `*Model Pembayaran:* ${userSession.eventData.tipePembayaran}\n` +
                `*Biaya Penonton:* ${userSession.eventData.biayaPenonton > 0 ? 'Rp ' + userSession.eventData.biayaPenonton.toLocaleString() : '-'}\n` +
                `*Biaya Penyelenggara:* ${userSession.eventData.biayaPenyelenggara > 0 ? 'Rp ' + userSession.eventData.biayaPenyelenggara.toLocaleString() : '-'}\n\n` +
                `*Apakah data sudah benar?*
1️⃣ Sudah benar
2️⃣ Perbaiki data

Ketik angka sesuai pilihan Anda.`;
            return bahasaNusaReply(recapMsg);

        case 'konfirmasi_data':
            if (['1', '2'].includes(body)) {
                if (body === '1') {
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
                    const summary = `🎉 *Sempuarna. Acara Berhasil Didaftarkan!*\n\n` +
                        `* Nama Acara:* ${userSession.eventData.name}\n` +
                        `*Lokasi:* ${userSession.eventData.location}\n` +
                        `*Waktu:* ${userSession.eventData.dateTime}\n` +
                        `*Durasi:* ${userSession.eventData.duration} menit\n` +
                        `*Bahasa:* ${(languages.find(l => l.kodeBahasa === userSession.eventData.kodeBahasa) || {}).namaBahasa || '-'}\n` +
                        `*Model:* ${userSession.eventData.tipePembayaran}\n` +
                        `*Harga/penonton:* ${userSession.eventData.biayaPenonton > 0 ? 'Rp ' + userSession.eventData.biayaPenonton.toLocaleString() : '-'}\n` +
                        `*Biaya Penyelenggara:* ${userSession.eventData.biayaPenyelenggara > 0 ? 'Rp ' + userSession.eventData.biayaPenyelenggara.toLocaleString() : '-'}\n` +
                        `🔗 *Link Anda:*\n\n` +
                        `🎤 *Audio Input (Penyelenggara)*\n${links.audioInput}\n\n` +
                        `👁️ *Viewer Subtitle (Penonton)*\n${links.viewerSubtitle}\n\n` +
                        `🔐 *Password Dashboard:*\n*${password}*\n\n` +
                        `Gunakan password ini untuk login ke dashboard penyelenggara`;
                    userSessions.delete(sender);
                    return bahasaNusaReply(summary);
                } else if (body === '2') {
                    userSessions.set(sender, { step: 'ask_event_name', eventData: {} });
                    return bahasaNusaReply('Baik, mari kita mulai dari awal.\n\n*Apa nama acara yang akan diselenggarakan?*\n\n> Untuk membatalkan proses pendaftaran, ketikkan "batal".');
                }
            } else {
                return bahasaNusaReply('Pilihan tidak valid. Silakan ketik 1 untuk konfirmasi, atau 2 untuk perbaiki data.');
            }

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
