/**
 * Ollama Client for LLM-based Event Data Extraction
 * Handles extraction of event name, location, and datetime using LLM
 */
export default class OllamaClient {
  constructor() {
    this.baseUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
    this.model = process.env.OLLAMA_MODEL || 'llama3.2:3b';
  }

  async isAvailable() {
    try {
      const response = await fetch(`${this.baseUrl}/api/version`);
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  async generate(prompt, options = {}) {
    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          prompt,
          stream: false,
          options: {
            temperature: options.temperature || 0.0,
            top_p: options.top_p || 0.9,
          }
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.response || '';
    } catch (error) {
      console.error('Ollama generate error:', error);
      throw error;
    }
  }

  /**
   * Extract event name using LLM
   */
  async extractEventName(input) {
    const prompt = `TUGAS: Ekstrak nama event/pertunjukan dari teks.

INPUT: "${input}"

INSTRUKSI:
- Ambil HANYA nama event/pertunjukan
- Hapus kata "Event:", "Nama Event:", "Acara:" jika ada
- Berikan jawaban bersih tanpa penjelasan

CONTOH:
Input: "Event: Wayang Kulit Ramayana"
Output: Wayang Kulit Ramayana

Input: "pertunjukan tari gambyong"  
Output: pertunjukan tari gambyong

OUTPUT:`;

    try {
      const response = await this.generate(prompt);
      const cleaned = response
        .trim()
        .replace(/^["']|["']$/g, '')
        .replace(/^(Event|Nama Event|Acara|Output)\s*[:\-]?\s*/i, '')
        .trim();
      
      if (cleaned && cleaned.length > 2) {
        return {
          success: true,
          confidence: 0.85,
          extracted: cleaned,
          originalInput: input
        };
      }
      
      // Fallback
      return {
        success: true,
        confidence: 0.60,
        extracted: input.trim(),
        originalInput: input
      };
      
    } catch (error) {
      console.error('Event name extraction error:', error);
      return {
        success: true,
        confidence: 0.50,
        extracted: input.trim(),
        originalInput: input,
        error: error.message
      };
    }
  }

  /**
   * Extract location using LLM
   */
  async extractLocation(input) {
    const prompt = `TUGAS: Ekstrak nama lokasi/tempat dari teks.

INPUT: "${input}"

INSTRUKSI:
- Ambil HANYA nama lokasi/tempat
- Hapus kata "Lokasi:", "Tempat:", "Di", "dilaksanakan di" jika ada
- Berikan jawaban bersih tanpa penjelasan

CONTOH:
Input: "Lokasi: Gedung Serbaguna Jakarta"
Output: Gedung Serbaguna Jakarta

Input: "Acara dilaksanakan di Pendopo Kahuripan"
Output: Pendopo Kahuripan

Input: "jakarta"
Output: jakarta

OUTPUT:`;

    try {
      const response = await this.generate(prompt);
      const cleaned = response
        .trim()
        .replace(/^["']|["']$/g, '')
        .replace(/^(Lokasi|Tempat|Di|Location|Output)\s*[:\-]?\s*/i, '')
        .trim();
      
      if (cleaned && cleaned.length > 2) {
        return {
          success: true,
          confidence: 0.85,
          extracted: cleaned,
          originalInput: input
        };
      }
      
      // Fallback
      return {
        success: true,
        confidence: 0.60,
        extracted: input.trim(),
        originalInput: input
      };
      
    } catch (error) {
      console.error('Location extraction error:', error);
      return {
        success: true,
        confidence: 0.50,
        extracted: input.trim(),
        originalInput: input,
        error: error.message
      };
    }
  }

  /**
   * Validate and convert datetime using LLM
   */
  async validateDateTime(input) {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    const prompt = `TUGAS: Konversi tanggal dan waktu ke format DD/MM/YYYY HH:MM

INPUT: "${input}"

INFORMASI HARI INI: ${today.getDate()}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}
BESOK: ${tomorrow.getDate()}/${(tomorrow.getMonth() + 1).toString().padStart(2, '0')}/${tomorrow.getFullYear()}

INSTRUKSI:
- Ubah ke format DD/MM/YYYY HH:MM
- Bulan: Januari=01, Februari=02, Maret=03, April=04, Mei=05, Juni=06, Juli=07, Agustus=08, September=09, Oktober=10, November=11, Desember=12
- Jika tidak ada waktu disebutkan, gunakan 19:00
- Jika tidak ada tahun, gunakan 2025
- "besok" gunakan tanggal besok
- "malam" untuk jam < 12, tambah 12

CONTOH:
Input: "25 November 2024 jam 7 malam"
Output: 25/11/2024 19:00

Input: "besok jam 8 malam"
Output: ${tomorrow.getDate().toString().padStart(2, '0')}/${(tomorrow.getMonth() + 1).toString().padStart(2, '0')}/${tomorrow.getFullYear()} 20:00

Input: "30 Desember"
Output: 30/12/2025 19:00

OUTPUT:`;

    try {
      const response = await this.generate(prompt);
      const cleaned = response
        .trim()
        .replace(/^["']|["']$/g, '')
        .replace(/^(Output|Result|Hasil)\s*[:\-]?\s*/i, '')
        .trim();
      
      // Validate format DD/MM/YYYY HH:MM
      const dateRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s(\d{1,2}):(\d{2})$/;
      const match = cleaned.match(dateRegex);
      
      if (match) {
        const [, day, month, year, hour, minute] = match;
        const dayNum = parseInt(day);
        const monthNum = parseInt(month);
        const yearNum = parseInt(year);
        const hourNum = parseInt(hour);
        const minuteNum = parseInt(minute);
        
        // Validate ranges
        if (dayNum >= 1 && dayNum <= 31 && 
            monthNum >= 1 && monthNum <= 12 && 
            yearNum >= 2024 && yearNum <= 2030 &&
            hourNum >= 0 && hourNum <= 23 &&
            minuteNum >= 0 && minuteNum <= 59) {
          
          return {
            success: true,
            confidence: 0.90,
            extracted: cleaned,
            originalInput: input
          };
        }
      }
      
      return {
        success: false,
        confidence: 0.30,
        extracted: input,
        originalInput: input,
        error: "Format tanggal tidak valid dari LLM: " + cleaned
      };
      
    } catch (error) {
      console.error('DateTime validation error:', error);
      return {
        success: false,
        confidence: 0.20,
        extracted: input,
        originalInput: input,
        error: "LLM error: " + error.message
      };
    }
  }

  /**
   * Validate all event data at once
   */
  async validateEventData(eventName, location, dateTime) {
    console.log('🧠 Starting LLM validation...');
    
    const results = await Promise.all([
      this.extractEventName(eventName),
      this.extractLocation(location), 
      this.validateDateTime(dateTime)
    ]);
    
    const [nameResult, locationResult, dateTimeResult] = results;
    
    console.log(`✅ Event Name: "${nameResult.extracted}" (${Math.round(nameResult.confidence * 100)}%)`);
    console.log(`✅ Location: "${locationResult.extracted}" (${Math.round(locationResult.confidence * 100)}%)`);
    
    if (dateTimeResult.success) {
      console.log(`✅ DateTime: "${dateTimeResult.extracted}" (${Math.round(dateTimeResult.confidence * 100)}%)`);
    } else {
      console.log(`❌ DateTime: ${dateTimeResult.error}`);
    }
    
    return {
      eventName: nameResult,
      location: locationResult,
      dateTime: dateTimeResult,
      overallSuccess: nameResult.success && locationResult.success && dateTimeResult.success
    };
  }
}