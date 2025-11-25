import LLMFactory from '../src/services/llm/llm-factory.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Test LLM Factory dengan berbagai provider
 */
async function testLLMFactory() {
    console.log('🧪 Testing LLM Factory System\n');

    try {
        // Test availability check
        console.log('1. Checking provider availability...');
        const availability = await LLMFactory.checkAvailability();
        console.log('Provider status:', availability);
        
        // Get best available provider
        try {
            const bestProvider = await LLMFactory.getBestAvailableProvider();
            console.log(`✅ Best available provider: ${bestProvider}\n`);
        } catch (error) {
            console.log(`❌ No providers available: ${error.message}\n`);
            return;
        }

        // Test inputs
        const testCases = [
            {
                type: 'event_name',
                inputs: [
                    'Wayang Kulit Ramayana malam ini',
                    'pertunjukan tari kecak bali',
                    'acara budaya',
                    'Festival Batik Nusantara 2024'
                ]
            },
            {
                type: 'location',
                inputs: [
                    'Gedung Kesenian Jakarta',
                    'di pendopo kahuripan sidoarjo',
                    'sana aja',
                    'Benteng Vredeburg Yogyakarta'
                ]
            },
            {
                type: 'datetime',
                inputs: [
                    '25 November 2024 jam 7 malam',
                    'besok jam 19:00',
                    'kemarin',
                    '30/12/2024 20:00'
                ]
            }
        ];

        // Test each type
        for (const testCase of testCases) {
            console.log(`\n2. Testing ${testCase.type.toUpperCase()} extraction:`);
            console.log('=' .repeat(50));

            for (const input of testCase.inputs) {
                console.log(`\nInput: "${input}"`);
                
                try {
                    let result;
                    switch (testCase.type) {
                        case 'event_name':
                            result = await LLMFactory.extractEventName(input);
                            break;
                        case 'location':
                            result = await LLMFactory.extractLocation(input);
                            break;
                        case 'datetime':
                            result = await LLMFactory.validateDateTime(input);
                            break;
                    }

                    console.log(`✓ Extracted: "${result.extracted || result.value}"`);
                    console.log(`✓ Valid: ${result.isValid || result.success}`);
                    console.log(`✓ Confidence: ${Math.round((result.confidence || 0) * 100)}%`);
                    
                    if (result.error) {
                        console.log(`⚠️  Error: ${result.error}`);
                    }
                    if (result.reasoning) {
                        console.log(`💭 Reasoning: ${result.reasoning}`);
                    }
                } catch (error) {
                    console.log(`❌ Error: ${error.message}`);
                }
            }
        }

        // Test provider switching
        console.log('\n\n3. Testing provider switching:');
        console.log('=' .repeat(50));
        
        const providers = ['openai', 'ollama'];
        
        for (const provider of providers) {
            console.log(`\nTesting with ${provider.toUpperCase()} provider:`);
            try {
                const result = await LLMFactory.extractEventName('Wayang Kulit Ramayana', provider);
                console.log(`✅ ${provider}: ${result.extracted} (${Math.round(result.confidence * 100)}%)`);
            } catch (error) {
                console.log(`❌ ${provider}: ${error.message}`);
            }
        }

        console.log('\n🎉 LLM Factory testing completed!');

    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

// Run test jika file dijalankan langsung
if (import.meta.url === `file://${process.argv[1]}`) {
    testLLMFactory();
}

export { testLLMFactory };