import '../config/config.js';
import '../ui/menus/bahasa-nusa-menu.js';
import { saveEventToDatabase, saveUserIfNotExists, generatePassword, generateLinks, formatDateTime, getMonthName } from '../helpers/events.js';
import cuid from 'cuid';
import { languages } from '../helpers/enums.js';
import { TipePembayaranAcara, BIAYA_PENYELENGGARA, BIAYA_PENONTON } from '../helpers/enums.js';
import LLMFactory from '../services/llm/llm-factory.js';
import dotenv from 'dotenv';

dotenv.config();

// State management untuk user sessions
const userSessions = new Map();

// Initialize LLM client dengan factory pattern
const llm = LLMFactory;

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
        try {
            // Check availability of best provider
            const bestProvider = await llm.getBestAvailableProvider();
            console.log(`[LLM] Using provider: ${bestProvider}`);
        } catch (error) {
            console.warn(`[Validation] No LLM provider available, using fallback validation for ${step}`);
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
                    const nameResult = await llm.extractEventName(input);

                    // Check validation result
                    if (nameResult.isValid) {
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
                    const locationResult = await llm.extractLocation(input);

                    // Check validation result
                    if (locationResult.isValid) {
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
                    const dateTimeResult = await llm.validateDateTime(input);

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

                case 'ask_duration':
                    console.log(`[LLM] Extracting duration from: "${input}"`);
                    const durationResult = await llm.extractDuration(input);

                    if (durationResult.success) {
                        console.log(`[LLM] ✅ Duration: ${durationResult.durationMinutes} menit (${Math.round(durationResult.confidence * 100)}%)`);
                        return {
                            isValid: true,
                            value: durationResult.durationMinutes,
                            confidence: durationResult.confidence,
                            originalInput: input
                        };
                    } else {
                        console.log(`[LLM] ❌ Duration extraction failed: ${durationResult.error}`);
                        return {
                            isValid: false,
                            value: input,
                            confidence: durationResult.confidence,
                            error: durationResult.error || 'Durasi tidak dapat dipahami. Contoh: "1 jam setengah", "2 jam 15 menit", "90 menit"'
                        };
                    }

                case 'ask_language':
                    console.log(`[LLM] Parsing language selection from: "${input}"`);
                    const languageResult = await llm.parseLanguageSelection(input, languages);

                    if (languageResult.success) {
                        console.log(`[LLM] ✅ Language: ${languageResult.languageName} (${languageResult.languageCode}) (${Math.round(languageResult.confidence * 100)}%)`);
                        return {
                            isValid: true,
                            value: languageResult.languageCode,
                            displayName: languageResult.languageName,
                            confidence: languageResult.confidence,
                            originalInput: input
                        };
                    } else {
                        console.log(`[LLM] ❌ Language parsing failed: ${languageResult.error}`);
                        return {
                            isValid: false,
                            value: input,
                            confidence: languageResult.confidence,
                            error: languageResult.error || 'Pilihan bahasa tidak dikenali. Contoh: "1", "bahasa jawa", "indonesia"'
                        };
                    }

                case 'ask_payment_model':
                    console.log(`[LLM] Parsing payment selection from: "${input}"`);
                    const paymentResult = await llm.parsePaymentSelection(input);

                    if (paymentResult.success) {
                        console.log(`[LLM] ✅ Payment: ${paymentResult.paymentType} (${Math.round(paymentResult.confidence * 100)}%)`);
                        return {
                            isValid: true,
                            value: paymentResult.paymentType,
                            confidence: paymentResult.confidence,
                            originalInput: input
                        };
                    } else {
                        console.log(`[LLM] ❌ Payment parsing failed: ${paymentResult.error}`);
                        return {
                            isValid: false,
                            value: input,
                            confidence: paymentResult.confidence,
                            error: paymentResult.error || 'Pilihan pembayaran tidak dikenali. Contoh: "1", "penyelenggara", "penonton"'
                        };
                    }

                case 'konfirmasi_data':
                    console.log(`[LLM] Parsing confirmation from: "${input}"`);
                    const confirmationResult = await llm.parseConfirmation(input);

                    if (confirmationResult.success) {
                        console.log(`[LLM] ✅ Confirmation: ${confirmationResult.confirmed ? 'Ya' : 'Tidak'} (${Math.round(confirmationResult.confidence * 100)}%)`);
                        return {
                            isValid: true,
                            value: confirmationResult.confirmed,
                            confidence: confirmationResult.confidence,
                            originalInput: input
                        };
                    } else {
                        console.log(`[LLM] ❌ Confirmation parsing failed: ${confirmationResult.error}`);
                        return {
                            isValid: false,
                            value: input,
                            confidence: confirmationResult.confidence,
                            error: confirmationResult.error || 'Konfirmasi tidak dikenali. Contoh: "ya", "benar", "sudah", "tidak", "perbaiki"'
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
        } else if (step === 'ask_duration') {
            message += '\n\n*Contoh yang baik:*\n• 1 jam setengah\n• 2 jam 15 menit\n• 90 menit\n• Setengah jam';
        } else if (step === 'ask_language') {
            message += '\n\n*Contoh yang baik:*\n• 1 (untuk pilihan pertama)\n• Bahasa Jawa\n• Indonesia\n• Jawa';
        } else if (step === 'ask_payment_model') {
            message += '\n\n*Contoh yang baik:*\n• 1 (penyelenggara)\n• 2 (penonton)\n• Penyelenggara\n• Penonton';
        } else if (step === 'konfirmasi_data') {
            message += '\n\n*Contoh yang baik:*\n• 1 / Ya / Benar / Sudah\n• 2 / Tidak / Perbaiki / Salah';
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
            let dateTimePrompt = `*Kapan acara "${userSession.eventData.name}" di ${locationValidation.value} akan berlangsung?*\n\nMohon berikan informasi hari, tanggal, bulan, tahun, dan jam yang lengkap`;
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
            let durationPrompt = `*Berapa lama estimasi durasi acara "${userSession.eventData.name}"?*\n\nℹ️ Waktu acara: ${dateTimeValidation.value}\n\n> Untuk membatalkan proses pendaftaran, ketikkan "batal".`;

            return bahasaNusaReply(durationPrompt);

        case 'ask_duration':
            const durationValidation = await validateAndProcessInput(body, 'ask_duration');
            
            if (!durationValidation.isValid) {
                return handleValidationError(durationValidation, 'ask_duration');
            }
            
            userSession.eventData.duration = durationValidation.value;
            userSession.step = 'ask_language';
            userSession.retryCount = 0;
            userSessions.set(sender, userSession);
            // Tampilkan pilihan bahasa
            let langMsg = '*Pilih bahasa yang digunakan untuk audio input:*\n';
            languages.forEach((lang, idx) => {
                langMsg += `${idx + 1}. ${lang.namaBahasa}\n`;
            });
            langMsg += '\n\n> Untuk membatalkan proses pendaftaran, ketikkan "batal".';
            return bahasaNusaReply(langMsg);

        case 'ask_language':
            const languageValidation = await validateAndProcessInput(body, 'ask_language');
            
            if (!languageValidation.isValid) {
                return handleValidationError(languageValidation, 'ask_language');
            }
            
            userSession.eventData.kodeBahasa = languageValidation.value;
            userSession.step = 'ask_payment_model';
            userSession.retryCount = 0;
            userSessions.set(sender, userSession);
            return bahasaNusaReply(`*Siapa yang akan menanggung biaya subtitle?*\n\n1️⃣ Penyelenggara (flat fee)\n2️⃣ Penonton (pay per view)\n\n> Untuk membatalkan proses pendaftaran, ketikkan "batal".`);

        case 'ask_payment_model':
            const paymentValidation = await validateAndProcessInput(body, 'ask_payment_model');
            
            if (!paymentValidation.isValid) {
                return handleValidationError(paymentValidation, 'ask_payment_model');
            }
            
            userSession.eventData.tipePembayaran = paymentValidation.value;
            userSession.eventData.biayaPenyelenggara = paymentValidation.value === TipePembayaranAcara.PENYELENGGARA ? BIAYA_PENYELENGGARA : 0.0;
            userSession.eventData.biayaPenonton = paymentValidation.value === TipePembayaranAcara.PENONTON ? BIAYA_PENONTON : 0.0;
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

Anda bisa mengetik:
1️⃣ Sudah benar
2️⃣ Salah, perlu mengulang`;
            return bahasaNusaReply(recapMsg);

        case 'konfirmasi_data':
            const confirmationValidation = await validateAndProcessInput(body, 'konfirmasi_data');
            
            if (confirmationValidation.isValid) {
                if (confirmationValidation.value) {
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
                        `*Nama Acara:* ${userSession.eventData.name}\n` +
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
                } else {
                    userSessions.set(sender, { step: 'ask_event_name', eventData: {} });
                    return bahasaNusaReply('Baik, mari kita mulai dari awal.\n\n*Apa nama acara yang akan diselenggarakan?*\n\n> Untuk pembatalan proses pendaftaran, ketikkan "batal".');
                }
            } else {
                return handleValidationError(confirmationValidation, 'konfirmasi_data');
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
