import LLMFactory from '../src/services/llm/llm-factory.js';
import { languages } from '../src/helpers/enums.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Test natural language processing untuk semua input
 */
async function testNaturalLanguageProcessing() {
    console.log('🧠 Testing Natural Language Processing\n');
    console.log('=' .repeat(60));

    try {
        // Test 1: Duration Extraction
        console.log('\n1️⃣ Testing Duration Extraction:');
        console.log('-' .repeat(40));
        
        const durationInputs = [
            '1 jam setengah',
            '2 jam 15 menit',
            '90 menit',
            'setengah jam',
            'seperempat jam',
            '3 jam',
            '45 menit',
            'sejam',
            'dua jam lebih 30 menit'
        ];

        for (const input of durationInputs) {
            console.log(`\nInput: "${input}"`);
            try {
                const result = await LLMFactory.extractDuration(input);
                if (result.success) {
                    console.log(`✅ Extracted: ${result.durationMinutes} menit`);
                    console.log(`   Confidence: ${Math.round(result.confidence * 100)}%`);
                } else {
                    console.log(`❌ Failed: ${result.error}`);
                }
            } catch (error) {
                console.log(`💥 Error: ${error.message}`);
            }
        }

        // Test 2: Language Selection
        console.log('\n\n2️⃣ Testing Language Selection:');
        console.log('-' .repeat(40));
        
        const languageInputs = [
            '1',
            'bahasa jawa',
            'jawa',
            'indonesia',
            '2',
            'bahasa indonesia',
            'Jawa Ngoko',
            'invalid language'
        ];

        for (const input of languageInputs) {
            console.log(`\nInput: "${input}"`);
            try {
                const result = await LLMFactory.parseLanguageSelection(input, languages);
                if (result.success) {
                    console.log(`✅ Selected: ${result.languageName} (${result.languageCode})`);
                    console.log(`   Confidence: ${Math.round(result.confidence * 100)}%`);
                } else {
                    console.log(`❌ Failed: ${result.error}`);
                }
            } catch (error) {
                console.log(`💥 Error: ${error.message}`);
            }
        }

        // Test 3: Payment Selection
        console.log('\n\n3️⃣ Testing Payment Selection:');
        console.log('-' .repeat(40));
        
        const paymentInputs = [
            '1',
            '2',
            'penyelenggara',
            'penonton',
            'flat fee',
            'pay per view',
            'organizer pays',
            'audience pays',
            'invalid option'
        ];

        for (const input of paymentInputs) {
            console.log(`\nInput: "${input}"`);
            try {
                const result = await LLMFactory.parsePaymentSelection(input);
                if (result.success) {
                    console.log(`✅ Selected: ${result.paymentType}`);
                    console.log(`   Confidence: ${Math.round(result.confidence * 100)}%`);
                } else {
                    console.log(`❌ Failed: ${result.error}`);
                }
            } catch (error) {
                console.log(`💥 Error: ${error.message}`);
            }
        }

        // Test 4: Confirmation
        console.log('\n\n4️⃣ Testing Confirmation:');
        console.log('-' .repeat(40));
        
        const confirmationInputs = [
            '1',
            '2',
            'ya',
            'tidak',
            'benar',
            'salah',
            'sudah',
            'belum',
            'oke',
            'perbaiki',
            'yes',
            'no',
            'setuju',
            'revisi'
        ];

        for (const input of confirmationInputs) {
            console.log(`\nInput: "${input}"`);
            try {
                const result = await LLMFactory.parseConfirmation(input);
                if (result.success) {
                    console.log(`✅ Confirmed: ${result.confirmed ? 'Ya' : 'Tidak'}`);
                    console.log(`   Confidence: ${Math.round(result.confidence * 100)}%`);
                } else {
                    console.log(`❌ Failed: ${result.error}`);
                }
            } catch (error) {
                console.log(`💥 Error: ${error.message}`);
            }
        }

        // Test 5: Integration Test - Complete Flow
        console.log('\n\n5️⃣ Integration Test - Complete Natural Flow:');
        console.log('-' .repeat(50));
        
        const completeFlow = [
            { step: 'event_name', input: 'Pertunjukan wayang kulit ramayana di balai desa' },
            { step: 'location', input: 'di gedung kesenian jakarta pusat' },
            { step: 'datetime', input: 'besok jam 8 malam' },
            { step: 'duration', input: '1 jam setengah' },
            { step: 'language', input: 'bahasa jawa' },
            { step: 'payment', input: 'penyelenggara yang bayar' },
            { step: 'confirmation', input: 'ya, sudah benar' }
        ];

        console.log('\n🎭 Simulating complete user journey...\n');

        for (const flow of completeFlow) {
            console.log(`👤 User (${flow.step}): "${flow.input}"`);
            
            try {
                let result;
                switch (flow.step) {
                    case 'event_name':
                        result = await LLMFactory.extractEventName(flow.input);
                        if (result.isValid) {
                            console.log(`🤖 Bot: Baik, nama acara: "${result.extracted}"`);
                        } else {
                            console.log(`🤖 Bot: Mohon sebutkan nama acara yang lebih spesifik`);
                        }
                        break;
                        
                    case 'location':
                        result = await LLMFactory.extractLocation(flow.input);
                        if (result.isValid) {
                            console.log(`🤖 Bot: Lokasi acara: "${result.extracted}"`);
                        } else {
                            console.log(`🤖 Bot: Mohon sebutkan lokasi yang lebih jelas`);
                        }
                        break;
                        
                    case 'datetime':
                        result = await LLMFactory.validateDateTime(flow.input);
                        if (result.success) {
                            console.log(`🤖 Bot: Waktu acara: "${result.extracted}"`);
                        } else {
                            console.log(`🤖 Bot: Format tanggal tidak valid`);
                        }
                        break;
                        
                    case 'duration':
                        result = await LLMFactory.extractDuration(flow.input);
                        if (result.success) {
                            console.log(`🤖 Bot: Durasi acara: ${result.durationMinutes} menit`);
                        } else {
                            console.log(`🤖 Bot: Durasi tidak dapat dipahami`);
                        }
                        break;
                        
                    case 'language':
                        result = await LLMFactory.parseLanguageSelection(flow.input, languages);
                        if (result.success) {
                            console.log(`🤖 Bot: Bahasa audio: ${result.languageName}`);
                        } else {
                            console.log(`🤖 Bot: Pilihan bahasa tidak dikenali`);
                        }
                        break;
                        
                    case 'payment':
                        result = await LLMFactory.parsePaymentSelection(flow.input);
                        if (result.success) {
                            console.log(`🤖 Bot: Model pembayaran: ${result.paymentType}`);
                        } else {
                            console.log(`🤖 Bot: Pilihan pembayaran tidak dikenali`);
                        }
                        break;
                        
                    case 'confirmation':
                        result = await LLMFactory.parseConfirmation(flow.input);
                        if (result.success) {
                            if (result.confirmed) {
                                console.log(`🤖 Bot: Terima kasih! Acara berhasil didaftarkan 🎉`);
                            } else {
                                console.log(`🤖 Bot: Baik, mari perbaiki data...`);
                            }
                        } else {
                            console.log(`🤖 Bot: Konfirmasi tidak dikenali`);
                        }
                        break;
                }
                
            } catch (error) {
                console.log(`🤖 Bot: Terjadi kesalahan, silakan coba lagi`);
            }
            
            console.log(''); // Empty line for spacing
        }

        console.log('\n🎉 Natural Language Processing Test Completed!');

    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

// Run test jika file dijalankan langsung
if (import.meta.url === `file://${process.argv[1]}`) {
    testNaturalLanguageProcessing();
}

export { testNaturalLanguageProcessing };