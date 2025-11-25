import LLMFactory from './src/services/llm/llm-factory.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Contoh penggunaan LLM Factory untuk berbagai skenario
 */

// Contoh 1: Basic usage dengan provider default
async function example1_basicUsage() {
    console.log('📝 Example 1: Basic Usage\n');
    
    try {
        const eventName = await LLMFactory.extractEventName("Pertunjukan wayang kulit ramayana malam ini");
        console.log('Event Name Result:', eventName);
        
        const location = await LLMFactory.extractLocation("di gedung kesenian jakarta pusat");
        console.log('Location Result:', location);
        
        const datetime = await LLMFactory.validateDateTime("besok jam 8 malam");
        console.log('DateTime Result:', datetime);
        
    } catch (error) {
        console.error('Error:', error.message);
    }
}

// Contoh 2: Provider switching manual
async function example2_providerSwitching() {
    console.log('\n🔄 Example 2: Provider Switching\n');
    
    const testInput = "Festival Batik Nusantara 2024";
    
    try {
        // Coba OpenAI dulu
        console.log('Trying OpenAI...');
        const openaiResult = await LLMFactory.extractEventName(testInput, 'openai');
        console.log('OpenAI Result:', openaiResult);
        
    } catch (error) {
        console.log('OpenAI failed, trying Ollama...');
        try {
            const ollamaResult = await LLMFactory.extractEventName(testInput, 'ollama');
            console.log('Ollama Result:', ollamaResult);
        } catch (ollamaError) {
            console.log('All providers failed:', ollamaError.message);
        }
    }
}

// Contoh 3: Batch processing dengan error handling
async function example3_batchProcessing() {
    console.log('\n📦 Example 3: Batch Processing\n');
    
    const inputs = [
        "Wayang Kulit Ramayana",
        "acara budaya", // should be rejected
        "Pertunjukan Tari Kecak Bali",
        "event musik" // should be rejected
    ];
    
    const results = await Promise.allSettled(
        inputs.map(input => LLMFactory.extractEventName(input))
    );
    
    results.forEach((result, index) => {
        console.log(`\nInput: "${inputs[index]}"`);
        if (result.status === 'fulfilled') {
            const data = result.value;
            console.log(`✅ Valid: ${data.isValid}`);
            console.log(`📝 Extracted: ${data.extracted}`);
            console.log(`🎯 Confidence: ${Math.round(data.confidence * 100)}%`);
        } else {
            console.log(`❌ Error: ${result.reason.message}`);
        }
    });
}

// Contoh 4: Health check dan monitoring
async function example4_healthCheck() {
    console.log('\n🏥 Example 4: Health Check\n');
    
    try {
        // Check provider availability
        const availability = await LLMFactory.checkAvailability();
        console.log('Provider Availability:', availability);
        
        // Get best provider
        const bestProvider = await LLMFactory.getBestAvailableProvider();
        console.log('Best Provider:', bestProvider);
        
        // Test connectivity dengan simple request
        const testResult = await LLMFactory.extractEventName("Test Event");
        console.log('Connectivity Test:', {
            success: testResult.isValid,
            provider: process.env.LLM_PROVIDER || 'auto',
            responseTime: 'OK'
        });
        
    } catch (error) {
        console.error('Health Check Failed:', error.message);
    }
}

// Contoh 5: Configuration-based usage
async function example5_configBasedUsage() {
    console.log('\n⚙️  Example 5: Configuration-based Usage\n');
    
    // Simulasi berbagai konfigurasi
    const configs = [
        { provider: 'openai', description: 'Production with OpenAI' },
        { provider: 'ollama', description: 'Development with local Ollama' },
        { provider: null, description: 'Auto-detection mode' }
    ];
    
    for (const config of configs) {
        console.log(`\nTesting: ${config.description}`);
        try {
            const result = await LLMFactory.extractEventName(
                "Konser Gamelan Jawa Traditional", 
                config.provider
            );
            
            console.log(`✅ Success with ${config.provider || 'auto'}: ${result.extracted}`);
        } catch (error) {
            console.log(`❌ Failed with ${config.provider || 'auto'}: ${error.message}`);
        }
    }
}

// Contoh 6: Real-world scenario (WhatsApp bot simulation)
async function example6_whatsappBotSimulation() {
    console.log('\n📱 Example 6: WhatsApp Bot Simulation\n');
    
    const userInputs = [
        {
            step: 'event_name',
            input: "Mau daftar pertunjukan wayang kulit ramayana",
            user: "User A"
        },
        {
            step: 'location', 
            input: "di pendopo taman mini indonesia indah",
            user: "User A"
        },
        {
            step: 'datetime',
            input: "tanggal 25 desember 2024 jam 7 malam",
            user: "User A"
        }
    ];
    
    for (const userInput of userInputs) {
        console.log(`\n👤 ${userInput.user} (${userInput.step}): "${userInput.input}"`);
        
        try {
            let result;
            switch (userInput.step) {
                case 'event_name':
                    result = await LLMFactory.extractEventName(userInput.input);
                    break;
                case 'location':
                    result = await LLMFactory.extractLocation(userInput.input);
                    break;
                case 'datetime':
                    result = await LLMFactory.validateDateTime(userInput.input);
                    break;
            }
            
            const isValid = result.isValid || result.success;
            const extracted = result.extracted;
            
            if (isValid) {
                console.log(`🤖 Bot: Baik, ${userInput.step} Anda: "${extracted}"`);
            } else {
                console.log(`🤖 Bot: Mohon input yang lebih jelas untuk ${userInput.step}`);
                if (result.error) {
                    console.log(`   Error: ${result.error}`);
                }
            }
            
        } catch (error) {
            console.log(`🤖 Bot: Terjadi kesalahan, silakan coba lagi`);
            console.log(`   Error: ${error.message}`);
        }
    }
}

// Jalankan semua contoh
async function runAllExamples() {
    console.log('🚀 LLM Factory Usage Examples\n');
    console.log('='.repeat(50));
    
    await example1_basicUsage();
    await example2_providerSwitching();
    await example3_batchProcessing();
    await example4_healthCheck();
    await example5_configBasedUsage();
    await example6_whatsappBotSimulation();
    
    console.log('\n🎉 All examples completed!');
}

// Run examples jika file dijalankan langsung
if (import.meta.url === `file://${process.argv[1]}`) {
    runAllExamples().catch(console.error);
}

export {
    example1_basicUsage,
    example2_providerSwitching,
    example3_batchProcessing,
    example4_healthCheck,
    example5_configBasedUsage,
    example6_whatsappBotSimulation,
    runAllExamples
};