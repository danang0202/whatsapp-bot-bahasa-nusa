/**
 * Test File for Ollama LLM Event Data Extraction
 * Simple test untuk validasi extractEventName, extractLocation, validateDateTime
 */

import OllamaClient from './src/services/ollama/ollama-client.js';
import dotenv from 'dotenv';

dotenv.config();

console.log('🧪 Testing Ollama LLM Event Data Extraction');
console.log('============================================\n');

async function runTests() {
  const ollama = new OllamaClient();
  
  // Check Ollama availability
  const available = await ollama.isAvailable();
  if (!available) {
    console.log('❌ Ollama not available. Make sure Ollama is running.');
    return;
  }
  
  console.log(`✅ Ollama available. Using model: ${ollama.model}\n`);
  
  // Test cases
  const testCases = [
    {
      name: 'Formal Event Registration',
      eventName: 'Nama Event : Wayang Kulit Ramayana',
      location: 'Acara ini dilaksanakan di Pendopo Kahuripan, Desa Sidorejo',
      dateTime: 'Hari Selasa, 25 November 2025 jam 19 WIB'
    },
    {
      name: 'Casual Style Input',
      eventName: 'pertunjukan tari gambyong',
      location: 'gedung kesenian jakarta',
      dateTime: 'besok jam 7 malam'
    },
    {
      name: 'Mixed Format Input',
      eventName: 'Event: Festival Batik Nusantara',
      location: 'Lokasi: Benteng Vredeburg Yogyakarta',
      dateTime: '30 Desember 2024'
    }
  ];
  
  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    console.log(`📋 Test Case ${i + 1}: ${testCase.name}`);
    console.log('─'.repeat(50));
    
    try {
      // Test individual functions
      console.log(`🎭 Event Name Input: "${testCase.eventName}"`);
      const nameResult = await ollama.extractEventName(testCase.eventName);
      console.log(`   Output: "${nameResult.extracted}" (${Math.round(nameResult.confidence * 100)}%)`);
      if (nameResult.error) console.log(`   Error: ${nameResult.error}`);
      
      console.log(`📍 Location Input: "${testCase.location}"`);
      const locationResult = await ollama.extractLocation(testCase.location);
      console.log(`   Output: "${locationResult.extracted}" (${Math.round(locationResult.confidence * 100)}%)`);
      if (locationResult.error) console.log(`   Error: ${locationResult.error}`);
      
      console.log(`⏰ DateTime Input: "${testCase.dateTime}"`);
      const dateTimeResult = await ollama.validateDateTime(testCase.dateTime);
      if (dateTimeResult.success) {
        console.log(`   Output: "${dateTimeResult.extracted}" (${Math.round(dateTimeResult.confidence * 100)}%)`);
      } else {
        console.log(`   ❌ Failed: ${dateTimeResult.error}`);
      }
      
      // Test batch validation
      console.log('\n🔄 Testing batch validation...');
      const batchResult = await ollama.validateEventData(
        testCase.eventName,
        testCase.location,
        testCase.dateTime
      );
      
      console.log(`📊 Overall Success: ${batchResult.overallSuccess ? '✅' : '❌'}`);
      
    } catch (error) {
      console.log(`❌ Test failed: ${error.message}`);
    }
    
    console.log('\n' + '='.repeat(50) + '\n');
  }
  
  // Test edge cases
  console.log('🔍 Edge Cases:');
  console.log('─'.repeat(20));
  
  const edgeCases = [
    { type: 'Event Name', input: 'wayang' },
    { type: 'Location', input: 'jakarta' },
    { type: 'DateTime', input: 'invalid date format' }
  ];
  
  for (const edge of edgeCases) {
    console.log(`${edge.type}: "${edge.input}"`);
    try {
      let result;
      switch (edge.type) {
        case 'Event Name':
          result = await ollama.extractEventName(edge.input);
          break;
        case 'Location':
          result = await ollama.extractLocation(edge.input);
          break;
        case 'DateTime':
          result = await ollama.validateDateTime(edge.input);
          break;
      }
      
      const status = result.success ? '✅' : '❌';
      console.log(`  ${status} "${result.extracted}" (${Math.round(result.confidence * 100)}%)`);
      if (result.error) console.log(`     Error: ${result.error}`);
      
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`);
    }
  }
  
  console.log('\n🎉 Testing completed!');
  console.log('\n💡 Tip: Ganti model di .env dengan OLLAMA_MODEL=nama-model-lain untuk test model berbeda');
}

runTests().catch(console.error);