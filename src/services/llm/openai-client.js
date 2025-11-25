import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';
import dotenv from 'dotenv';

dotenv.config();

/**
 * OpenAI Client untuk ekstraksi dan validasi menggunakan AI SDK
 */
class OpenAIClient {
    constructor() {
        this.model = openai(process.env.OPENAI_MODEL || 'gpt-4o-mini');
        this.apiKey = process.env.OPENAI_API_KEY;
        
        if (!this.apiKey) {
            console.warn('[OpenAI] API key not found in environment variables');
        }
    }

    /**
     * Check if OpenAI is available
     * @returns {boolean}
     */
    async isAvailable() {
        if (!this.apiKey) {
            return false;
        }

        try {
            // Test with simple request
            await generateText({
                model: this.model,
                prompt: 'Test connection',
                maxTokens: 5
            });
            return true;
        } catch (error) {
            console.warn('[OpenAI] Availability check failed:', error.message);
            return false;
        }
    }

    /**
     * Extract event name from user input
     * @param {string} input - User input text
     * @returns {Object} { extracted, confidence, isValid }
     */
    async extractEventName(input) {
        try {
            console.log(`[OpenAI] Extracting event name from: "${input}"`);

            const prompt = `Ekstrak nama acara dari input pengguna berikut. Berikan nama acara yang spesifik dan jelas.

INPUT: "${input}"

ATURAN:
1. Ekstrak nama acara budaya, seni, atau pertunjukan
2. Jika tidak ada nama spesifik, tolak dengan confidence rendah
3. Hindari nama generik seperti "acara", "event", "pertunjukan" saja
4. Prioritaskan nama yang mencerminkan jenis seni/budaya

Response harus dalam format JSON murni tanpa markdown:
{
  "extracted": "nama acara yang diekstrak",
  "confidence": 0.9,
  "isValid": true,
  "reasoning": "penjelasan singkat"
}

Contoh yang BAIK:
- "Wayang Kulit Ramayana"
- "Pertunjukan Tari Kecak"
- "Festival Batik Nusantara"

Contoh yang BURUK (tolak):
- "acara"
- "pertunjukan"
- "event budaya"`;

            const result = await generateText({
                model: this.model,
                prompt: prompt,
                maxTokens: 200
            });

            // Clean response dari markdown formatting
            let cleanResponse = result.text.trim();
            if (cleanResponse.includes('```json')) {
                cleanResponse = cleanResponse.replace(/```json\n?/g, '').replace(/```/g, '').trim();
            }
            if (cleanResponse.includes('```')) {
                cleanResponse = cleanResponse.replace(/```/g, '').trim();
            }

            const parsed = JSON.parse(cleanResponse);
            
            // Validasi tambahan
            const isSpecific = parsed.extracted && 
                             parsed.extracted.length > 5 && 
                             !['acara', 'event', 'pertunjukan'].includes(parsed.extracted.toLowerCase());
                             
            return {
                extracted: parsed.extracted || input.trim(),
                confidence: isSpecific ? parsed.confidence : Math.min(parsed.confidence, 0.3),
                isValid: isSpecific && parsed.confidence > 0.7,
                reasoning: parsed.reasoning,
                originalInput: input
            };
        } catch (error) {
            console.error('[OpenAI] Error extracting event name:', error);
            
            // Fallback: basic validation
            const isReasonableEventName = input.trim().length > 5 && 
                                        !['acara', 'event', 'pertunjukan'].some(word => 
                                            input.toLowerCase().includes(word) && input.toLowerCase().split(' ').length <= 2
                                        );
                                        
            return {
                extracted: input.trim(),
                confidence: isReasonableEventName ? 0.6 : 0.1,
                isValid: isReasonableEventName,
                error: isReasonableEventName ? null : 'Nama acara tidak spesifik',
                fallback: true
            };
        }
    }

    /**
     * Extract location from user input
     * @param {string} input - User input text
     * @returns {Object} { extracted, confidence, isValid }
     */
    async extractLocation(input) {
        try {
            console.log(`[OpenAI] Extracting location from: "${input}"`);

            const prompt = `Ekstrak lokasi/tempat dari input pengguna berikut. Berikan nama tempat yang spesifik.

INPUT: "${input}"

ATURAN:
1. Ekstrak nama tempat yang spesifik (gedung, pendopo, balai, dll)
2. Jika ada alamat lengkap, sertakan kota/daerah
3. Hindari kata umum seperti "sana", "sini", "tempat", "lokasi"
4. Prioritaskan venue budaya/seni

Response harus dalam format JSON murni tanpa markdown:
{
  "extracted": "nama tempat yang diekstrak",
  "confidence": 0.9,
  "isValid": true,
  "reasoning": "penjelasan singkat"
}

Contoh yang BAIK:
- "Gedung Kesenian Jakarta"
- "Pendopo Kahuripan, Sidoarjo"
- "Benteng Vredeburg Yogyakarta"

Contoh yang BURUK (tolak):
- "sana"
- "tempat"
- "lokasi"`;

            const result = await generateText({
                model: this.model,
                prompt: prompt,
                maxTokens: 200
            });

            // Clean response dari markdown formatting
            let cleanResponse = result.text.trim();
            if (cleanResponse.includes('```json')) {
                cleanResponse = cleanResponse.replace(/```json\n?/g, '').replace(/```/g, '').trim();
            }
            if (cleanResponse.includes('```')) {
                cleanResponse = cleanResponse.replace(/```/g, '').trim();
            }

            const parsed = JSON.parse(cleanResponse);
            
            // Validasi tambahan
            const isSpecific = parsed.extracted && 
                             parsed.extracted.length > 4 && 
                             !['sana', 'sini', 'tempat', 'lokasi'].includes(parsed.extracted.toLowerCase());
                             
            return {
                extracted: parsed.extracted || input.trim(),
                confidence: isSpecific ? parsed.confidence : Math.min(parsed.confidence, 0.3),
                isValid: isSpecific && parsed.confidence > 0.7,
                reasoning: parsed.reasoning,
                originalInput: input
            };
        } catch (error) {
            console.error('[OpenAI] Error extracting location:', error);
            
            // Fallback: basic validation
            const isReasonableLocation = input.trim().length > 4 && 
                                       !['sana', 'sini', 'tempat', 'lokasi'].some(word => 
                                           input.toLowerCase().includes(word) && input.toLowerCase().split(' ').length <= 2
                                       );
                                       
            return {
                extracted: input.trim(),
                confidence: isReasonableLocation ? 0.6 : 0.1,
                isValid: isReasonableLocation,
                error: isReasonableLocation ? null : 'Lokasi tidak spesifik',
                fallback: true
            };
        }
    }

    /**
     * Validate and extract datetime from user input
     * @param {string} input - User input text
     * @returns {Object} { success, extracted, confidence, error }
     */
    async validateDateTime(input) {
        try {
            console.log(`[OpenAI] Validating datetime from: "${input}"`);

            const currentDate = new Date().toISOString().split('T')[0];
            const currentTime = new Date().toLocaleTimeString('id-ID', { hour12: false });

            const prompt = `Parse tanggal dan waktu dari input pengguna dalam bahasa Indonesia. Tanggal hari ini: ${currentDate}, waktu sekarang: ${currentTime}.

INPUT: "${input}"

ATURAN:
1. Parse tanggal dalam format DD/MM/YYYY
2. Parse waktu dalam format HH:MM (24 jam)
3. Handle bahasa natural: "besok", "minggu depan", "jam 7 malam", dll
4. Waktu "malam" = +12 jam jika < 12
5. Minimal tanggal harus hari ini atau masa depan

Response harus dalam format JSON murni tanpa markdown:
{
  "success": true,
  "extracted": "DD/MM/YYYY HH:MM",
  "confidence": 0.9,
  "error": null,
  "reasoning": "penjelasan parsing"
}

Contoh input yang valid:
- "25 November 2024 jam 7 malam" → "25/11/2024 19:00"
- "besok jam 19:00" → (tanggal besok) "19:00"
- "30/12/2024 20:00" → "30/12/2024 20:00"`;

            const result = await generateText({
                model: this.model,
                prompt: prompt,
                maxTokens: 300
            });

            // Clean response dari markdown formatting
            let cleanResponse = result.text.trim();
            if (cleanResponse.includes('```json')) {
                cleanResponse = cleanResponse.replace(/```json\n?/g, '').replace(/```/g, '').trim();
            }
            if (cleanResponse.includes('```')) {
                cleanResponse = cleanResponse.replace(/```/g, '').trim();
            }

            const parsed = JSON.parse(cleanResponse);
            
            // Validasi format tanggal
            if (parsed.success && parsed.extracted) {
                const dateTimeRegex = /^\d{1,2}\/\d{1,2}\/\d{4} \d{1,2}:\d{1,2}$/;
                if (!dateTimeRegex.test(parsed.extracted)) {
                    parsed.success = false;
                    parsed.error = 'Format tanggal tidak valid';
                }
            }
            
            return {
                success: parsed.success,
                extracted: parsed.extracted || input.trim(),
                confidence: parsed.confidence || 0.1,
                error: parsed.error,
                reasoning: parsed.reasoning,
                originalInput: input
            };
        } catch (error) {
            console.error('[OpenAI] Error validating datetime:', error);
            
            // Fallback: basic date pattern check
            const hasDatePattern = /\d{1,2}[\/-]\d{1,2}[\/-]\d{4}/.test(input) || 
                                 /\d{1,2}\s+(januari|februari|maret|april|mei|juni|juli|agustus|september|oktober|november|desember)\s+\d{4}/i.test(input) ||
                                 /(besok|minggu\s+depan|hari\s+ini)/i.test(input);
                                 
            return {
                success: hasDatePattern,
                extracted: input.trim(),
                confidence: hasDatePattern ? 0.5 : 0.1,
                error: hasDatePattern ? null : 'Format tanggal tidak dikenali',
                fallback: true
            };
        }
    }

    /**
     * Extract duration from natural language input
     * @param {string} input - User input text
     * @returns {Object} { success, durationMinutes, confidence, error }
     */
    async extractDuration(input) {
        try {
            console.log(`[OpenAI] Extracting duration from: "${input}"`);

            const prompt = `Ekstrak durasi waktu dari input pengguna dan konversi ke menit.

INPUT: "${input}"

ATURAN:
1. Konversi semua durasi ke menit (integer)
2. Handle bahasa natural: "1 jam setengah", "2 jam 15 menit", "90 menit", dll
3. Setengah jam = 30 menit, seperempat jam = 15 menit
4. Durasi minimal 15 menit, maksimal 720 menit (12 jam)

Response harus dalam format JSON murni tanpa markdown:
{
  "success": true,
  "durationMinutes": 90,
  "confidence": 0.9,
  "error": null,
  "reasoning": "penjelasan konversi"
}

Contoh konversi:
- "1 jam setengah" → 90 menit
- "2 jam 15 menit" → 135 menit
- "90 menit" → 90 menit
- "setengah jam" → 30 menit`;

            const result = await generateText({
                model: this.model,
                prompt: prompt,
                maxTokens: 200
            });

            // Clean response dari markdown formatting
            let cleanResponse = result.text.trim();
            if (cleanResponse.includes('```json')) {
                cleanResponse = cleanResponse.replace(/```json\n?/g, '').replace(/```/g, '').trim();
            }
            if (cleanResponse.includes('```')) {
                cleanResponse = cleanResponse.replace(/```/g, '').trim();
            }

            const parsed = JSON.parse(cleanResponse);
            
            // Validasi durasi dalam range yang wajar
            const isValidDuration = parsed.durationMinutes >= 15 && parsed.durationMinutes <= 720;
            
            return {
                success: parsed.success && isValidDuration,
                durationMinutes: parsed.durationMinutes,
                confidence: isValidDuration ? parsed.confidence : 0.3,
                error: isValidDuration ? parsed.error : 'Durasi harus antara 15 menit sampai 12 jam',
                reasoning: parsed.reasoning,
                originalInput: input
            };
        } catch (error) {
            console.error('[OpenAI] Error extracting duration:', error);
            
            // Fallback: basic number extraction
            const numbers = input.match(/\d+/g);
            const hasHourWord = /jam|hour/i.test(input);
            const hasMinuteWord = /menit|minute/i.test(input);
            
            if (numbers && numbers.length > 0) {
                const firstNum = parseInt(numbers[0]);
                let estimatedMinutes = firstNum;
                
                if (hasHourWord && !hasMinuteWord) {
                    estimatedMinutes = firstNum * 60; // Convert hours to minutes
                }
                
                const isReasonable = estimatedMinutes >= 15 && estimatedMinutes <= 720;
                
                return {
                    success: isReasonable,
                    durationMinutes: isReasonable ? estimatedMinutes : null,
                    confidence: isReasonable ? 0.6 : 0.1,
                    error: isReasonable ? null : 'Durasi tidak dapat dipahami',
                    fallback: true
                };
            }
            
            return {
                success: false,
                durationMinutes: null,
                confidence: 0.1,
                error: 'Durasi tidak dapat diproses'
            };
        }
    }

    /**
     * Parse language selection from natural input
     * @param {string} input - User input text
     * @param {Array} availableLanguages - Array of language objects
     * @returns {Object} { success, languageCode, languageName, confidence }
     */
    async parseLanguageSelection(input, availableLanguages) {
        try {
            console.log(`[OpenAI] Parsing language selection from: "${input}"`);

            const languageOptions = availableLanguages.map((lang, idx) => 
                `${idx + 1}. ${lang.namaBahasa} (kode: ${lang.kodeBahasa})`
            ).join('\n');

            const prompt = `Parse pilihan bahasa dari input pengguna.

INPUT: "${input}"

PILIHAN BAHASA TERSEDIA:
${languageOptions}

ATURAN:
1. Cocokkan input dengan nama bahasa atau nomor pilihan
2. Return kode bahasa yang sesuai
3. Handle variasi nama: "jawa"/"bahasa jawa", "indonesia"/"bahasa indonesia"
4. Handle nomor: "1", "2", "3", dll

Response harus dalam format JSON murni tanpa markdown:
{
  "success": true,
  "languageCode": "jv",
  "languageName": "Bahasa Jawa",
  "confidence": 0.9,
  "reasoning": "penjelasan matching"
}`;

            const result = await generateText({
                model: this.model,
                prompt: prompt,
                maxTokens: 150
            });

            // Clean response dari markdown formatting
            let cleanResponse = result.text.trim();
            if (cleanResponse.includes('```json')) {
                cleanResponse = cleanResponse.replace(/```json\n?/g, '').replace(/```/g, '').trim();
            }
            if (cleanResponse.includes('```')) {
                cleanResponse = cleanResponse.replace(/```/g, '').trim();
            }

            const parsed = JSON.parse(cleanResponse);
            
            // Validate that the language code exists in available languages
            const foundLanguage = availableLanguages.find(lang => lang.kodeBahasa === parsed.languageCode);
            
            return {
                success: parsed.success && !!foundLanguage,
                languageCode: foundLanguage?.kodeBahasa || null,
                languageName: foundLanguage?.namaBahasa || null,
                confidence: foundLanguage ? parsed.confidence : 0.2,
                reasoning: parsed.reasoning,
                originalInput: input
            };
        } catch (error) {
            console.error('[OpenAI] Error parsing language selection:', error);
            
            // Fallback: basic matching
            const inputLower = input.toLowerCase().trim();
            
            // Try number matching first
            const numberMatch = inputLower.match(/^(\d+)$/);
            if (numberMatch) {
                const index = parseInt(numberMatch[1]) - 1;
                if (index >= 0 && index < availableLanguages.length) {
                    const lang = availableLanguages[index];
                    return {
                        success: true,
                        languageCode: lang.kodeBahasa,
                        languageName: lang.namaBahasa,
                        confidence: 0.9,
                        fallback: true
                    };
                }
            }
            
            // Try name matching
            for (const lang of availableLanguages) {
                const langNameLower = lang.namaBahasa.toLowerCase();
                if (langNameLower.includes(inputLower) || inputLower.includes(langNameLower.split(' ').pop())) {
                    return {
                        success: true,
                        languageCode: lang.kodeBahasa,
                        languageName: lang.namaBahasa,
                        confidence: 0.7,
                        fallback: true
                    };
                }
            }
            
            return {
                success: false,
                languageCode: null,
                languageName: null,
                confidence: 0.1,
                error: 'Pilihan bahasa tidak dikenali'
            };
        }
    }

    /**
     * Parse payment model selection
     * @param {string} input - User input text
     * @returns {Object} { success, paymentType, confidence }
     */
    async parsePaymentSelection(input) {
        try {
            console.log(`[OpenAI] Parsing payment selection from: "${input}"`);

            const prompt = `Parse pilihan model pembayaran dari input pengguna.

INPUT: "${input}"

PILIHAN TERSEDIA:
1. Penyelenggara (flat fee) - penyelenggara menanggung biaya
2. Penonton (pay per view) - penonton bayar per view

ATURAN:
1. Cocokkan input dengan pilihan yang tersedia
2. Handle nomor: "1", "2"
3. Handle kata kunci: "penyelenggara", "penonton", "flat fee", "pay per view"

Response harus dalam format JSON murni tanpa markdown:
{
  "success": true,
  "paymentType": "PENYELENGGARA",
  "confidence": 0.9,
  "reasoning": "penjelasan matching"
}`;

            const result = await generateText({
                model: this.model,
                prompt: prompt,
                maxTokens: 150
            });

            // Clean response dari markdown formatting
            let cleanResponse = result.text.trim();
            if (cleanResponse.includes('```json')) {
                cleanResponse = cleanResponse.replace(/```json\n?/g, '').replace(/```/g, '').trim();
            }
            if (cleanResponse.includes('```')) {
                cleanResponse = cleanResponse.replace(/```/g, '').trim();
            }

            const parsed = JSON.parse(cleanResponse);
            
            // Validate payment type
            const validTypes = ['PENYELENGGARA', 'PENONTON'];
            const isValidType = validTypes.includes(parsed.paymentType);
            
            return {
                success: parsed.success && isValidType,
                paymentType: isValidType ? parsed.paymentType : null,
                confidence: isValidType ? parsed.confidence : 0.2,
                reasoning: parsed.reasoning,
                originalInput: input
            };
        } catch (error) {
            console.error('[OpenAI] Error parsing payment selection:', error);
            
            // Fallback: basic matching
            const inputLower = input.toLowerCase().trim();
            
            if (inputLower === '1' || inputLower.includes('penyelenggara') || inputLower.includes('flat')) {
                return {
                    success: true,
                    paymentType: 'PENYELENGGARA',
                    confidence: 0.8,
                    fallback: true
                };
            } else if (inputLower === '2' || inputLower.includes('penonton') || inputLower.includes('pay per view')) {
                return {
                    success: true,
                    paymentType: 'PENONTON',
                    confidence: 0.8,
                    fallback: true
                };
            }
            
            return {
                success: false,
                paymentType: null,
                confidence: 0.1,
                error: 'Pilihan pembayaran tidak dikenali'
            };
        }
    }

    /**
     * Parse confirmation response
     * @param {string} input - User input text
     * @returns {Object} { success, confirmed, confidence }
     */
    async parseConfirmation(input) {
        try {
            console.log(`[OpenAI] Parsing confirmation from: "${input}"`);

            const prompt = `Parse konfirmasi dari input pengguna.

INPUT: "${input}"

PILIHAN TERSEDIA:
1. Sudah benar / Konfirmasi positif
2. Perbaiki data / Konfirmasi negatif

ATURAN:
1. Deteksi apakah user mengkonfirmasi (ya/benar/sudah/1) atau menolak (tidak/salah/perbaiki/2)
2. Handle variasi bahasa natural

Response harus dalam format JSON murni tanpa markdown:
{
  "success": true,
  "confirmed": true,
  "confidence": 0.9,
  "reasoning": "penjelasan interpretasi"
}`;

            const result = await generateText({
                model: this.model,
                prompt: prompt,
                maxTokens: 150
            });

            // Clean response dari markdown formatting
            let cleanResponse = result.text.trim();
            if (cleanResponse.includes('```json')) {
                cleanResponse = cleanResponse.replace(/```json\n?/g, '').replace(/```/g, '').trim();
            }
            if (cleanResponse.includes('```')) {
                cleanResponse = cleanResponse.replace(/```/g, '').trim();
            }

            const parsed = JSON.parse(cleanResponse);
            
            return {
                success: parsed.success,
                confirmed: parsed.confirmed,
                confidence: parsed.confidence,
                reasoning: parsed.reasoning,
                originalInput: input
            };
        } catch (error) {
            console.error('[OpenAI] Error parsing confirmation:', error);
            
            // Fallback: basic matching
            const inputLower = input.toLowerCase().trim();
            
            const positiveWords = ['1', 'ya', 'yes', 'benar', 'sudah', 'oke', 'ok', 'setuju'];
            const negativeWords = ['2', 'tidak', 'no', 'salah', 'belum', 'perbaiki'];
            
            if (positiveWords.some(word => inputLower.includes(word))) {
                return {
                    success: true,
                    confirmed: true,
                    confidence: 0.8,
                    fallback: true
                };
            } else if (negativeWords.some(word => inputLower.includes(word))) {
                return {
                    success: true,
                    confirmed: false,
                    confidence: 0.8,
                    fallback: true
                };
            }
            
            return {
                success: false,
                confirmed: null,
                confidence: 0.1,
                error: 'Konfirmasi tidak dikenali'
            };
        }
    }

    /**
     * Batch validation untuk semua data event
     * @param {Object} eventData - { name, location, dateTime }
     * @returns {Object} Validation results
     */
    async validateEventData(eventData) {
        try {
            const results = await Promise.all([
                this.extractEventName(eventData.name),
                this.extractLocation(eventData.location),
                this.validateDateTime(eventData.dateTime)
            ]);

            return {
                eventName: results[0],
                location: results[1],
                dateTime: results[2],
                allValid: results.every(r => r.isValid || r.success)
            };
        } catch (error) {
            console.error('[OpenAI] Error in batch validation:', error);
            throw error;
        }
    }
}

export default OpenAIClient;