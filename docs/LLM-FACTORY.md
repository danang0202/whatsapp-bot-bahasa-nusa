# LLM Factory System - WhatsApp Bot Bahasa Nusa

Sistem modular untuk mengelola berbagai provider LLM (Large Language Model) dengan fallback mechanism dan konfigurasi yang fleksibel.

## Struktur Folder

```
src/services/llm/
├── llm-factory.js          # Factory pattern untuk switching provider
├── openai-client.js        # OpenAI client menggunakan AI SDK
└── ollama/
    └── ollama-client.js    # Ollama client (existing, dipertahankan)
```

## Provider yang Didukung

### 1. OpenAI (Default)
- Menggunakan AI SDK (@ai-sdk/openai)
- Model: gpt-4o-mini (configurable)
- Reliable untuk production
- Memerlukan API key

### 2. Ollama (Fallback)
- Local LLM server
- Model: qwen2.5:7b (configurable)
- Gratis, tidak perlu API key
- Memerlukan Ollama server running

## Konfigurasi Environment

Tambahkan ke file `.env`:

```env
# LLM Configuration
LLM_PROVIDER=openai

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o-mini

# Ollama Configuration (fallback)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:7b
```

## Penggunaan

### 1. Factory Pattern

```javascript
import LLMFactory from './src/services/llm/llm-factory.js';

// Automatic provider selection (berdasarkan LLM_PROVIDER)
const result = await LLMFactory.extractEventName("Wayang Kulit Ramayana");

// Manual provider selection
const result = await LLMFactory.extractEventName("Wayang Kulit", "openai");

// Fallback otomatis jika provider utama gagal
const result = await LLMFactory.extractEventName("Tari Kecak", "ollama");
```

### 2. Availability Check

```javascript
// Check semua provider
const availability = await LLMFactory.checkAvailability();
// { openai: true, ollama: false }

// Get provider terbaik yang tersedia
const bestProvider = await LLMFactory.getBestAvailableProvider();
// "openai"
```

### 3. Extraction Methods

```javascript
// Extract event name
const eventResult = await LLMFactory.extractEventName("pertunjukan wayang kulit");
// { extracted: "Wayang Kulit", confidence: 0.9, isValid: true }

// Extract location
const locationResult = await LLMFactory.extractLocation("gedung kesenian jakarta");
// { extracted: "Gedung Kesenian Jakarta", confidence: 0.95, isValid: true }

// Validate datetime
const datetimeResult = await LLMFactory.validateDateTime("besok jam 7 malam");
// { success: true, extracted: "26/11/2024 19:00", confidence: 0.9 }
```

## Fitur Utama

### 1. Automatic Fallback
- Jika OpenAI gagal, otomatis coba Ollama
- Jika semua gagal, return error yang informatif
- Logging untuk debugging

### 2. Modular Design
- Mudah menambah provider baru
- Consistent interface untuk semua provider
- Singleton pattern untuk efisiensi

### 3. Robust Error Handling
- Graceful degradation jika provider tidak tersedia
- Detailed error messages
- Fallback ke basic validation

### 4. Configuration Flexibility
- Environment-based configuration
- Runtime provider switching
- Model configuration per provider

## Testing

Jalankan test untuk memvalidasi sistem:

```bash
node test-llm-factory.js
```

Test akan mencakup:
- Provider availability check
- Extraction accuracy untuk berbagai input
- Provider switching
- Error handling

## Migrasi dari Sistem Lama

Handler WhatsApp bot (`bahasa-nusa.js`) telah diupdate untuk menggunakan LLM Factory:

```javascript
// Lama
const ollama = new OllamaClient();
const result = await ollama.extractEventName(input);

// Baru
import LLMFactory from '../services/llm/llm-factory.js';
const result = await LLMFactory.extractEventName(input);
```

## Troubleshooting

### 1. OpenAI API Key
- Pastikan `OPENAI_API_KEY` di .env
- Verify API key valid di OpenAI dashboard
- Check quota/billing status

### 2. Ollama Connection
- Pastikan Ollama server running: `ollama serve`
- Check model downloaded: `ollama list`
- Verify base URL dan port

### 3. Provider Selection
- Set `LLM_PROVIDER=ollama` untuk force Ollama
- Set `LLM_PROVIDER=openai` untuk force OpenAI
- Leave empty untuk auto-detection

## Roadmap

- [ ] Support untuk Claude (Anthropic)
- [ ] Support untuk Gemini (Google)
- [ ] Caching untuk mengurangi API calls
- [ ] Batch processing untuk multiple inputs
- [ ] Performance monitoring dan analytics