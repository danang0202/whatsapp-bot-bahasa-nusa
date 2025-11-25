import OllamaClient from './ollama/ollama-client.js';
import OpenAIClient from './openai-client.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Factory pattern untuk memilih LLM provider
 * Memungkinkan switching antara Ollama dan OpenAI
 */
class LLMFactory {
    constructor() {
        this.providers = {
            'ollama': OllamaClient,
            'openai': OpenAIClient
        };
        
        // Default provider dari environment variable
        this.defaultProvider = process.env.LLM_PROVIDER || 'openai';
        this.instance = null;
    }

    /**
     * Get LLM client instance
     * @param {string} provider - 'ollama' atau 'openai'
     * @returns {Object} LLM client instance
     */
    getClient(provider = null) {
        const selectedProvider = provider || this.defaultProvider;
        
        if (!this.providers[selectedProvider]) {
            throw new Error(`LLM provider '${selectedProvider}' not supported. Available: ${Object.keys(this.providers).join(', ')}`);
        }

        // Singleton pattern untuk setiap provider
        if (!this.instance || this.instance.constructor !== this.providers[selectedProvider]) {
            this.instance = new this.providers[selectedProvider]();
        }

        return this.instance;
    }

    /**
     * Check availability of all providers
     * @returns {Object} Status availability untuk setiap provider
     */
    async checkAvailability() {
        const status = {};
        
        for (const [name, ClientClass] of Object.entries(this.providers)) {
            try {
                const client = new ClientClass();
                status[name] = await client.isAvailable();
            } catch (error) {
                status[name] = false;
            }
        }
        
        return status;
    }

    /**
     * Get best available provider
     * @returns {string} Nama provider yang tersedia
     */
    async getBestAvailableProvider() {
        const availability = await this.checkAvailability();
        
        // Priority: OpenAI first (more reliable), then Ollama
        const priorities = ['openai', 'ollama'];
        
        for (const provider of priorities) {
            if (availability[provider]) {
                return provider;
            }
        }
        
        throw new Error('No LLM provider available');
    }

    /**
     * Extract event name with fallback providers
     * @param {string} input - User input
     * @param {string} provider - Preferred provider
     * @returns {Object} Extraction result
     */
    async extractEventName(input, provider = null) {
        try {
            const client = this.getClient(provider);
            return await client.extractEventName(input);
        } catch (error) {
            console.warn(`[LLM] ${provider || this.defaultProvider} failed for event name extraction:`, error.message);
            
            // Fallback to other provider
            const fallbackProvider = provider === 'openai' ? 'ollama' : 'openai';
            try {
                const fallbackClient = this.getClient(fallbackProvider);
                console.log(`[LLM] Trying fallback provider: ${fallbackProvider}`);
                return await fallbackClient.extractEventName(input);
            } catch (fallbackError) {
                console.error(`[LLM] All providers failed for event name extraction`);
                throw new Error('LLM extraction failed');
            }
        }
    }

    /**
     * Extract location with fallback providers
     * @param {string} input - User input
     * @param {string} provider - Preferred provider
     * @returns {Object} Extraction result
     */
    async extractLocation(input, provider = null) {
        try {
            const client = this.getClient(provider);
            return await client.extractLocation(input);
        } catch (error) {
            console.warn(`[LLM] ${provider || this.defaultProvider} failed for location extraction:`, error.message);
            
            // Fallback to other provider
            const fallbackProvider = provider === 'openai' ? 'ollama' : 'openai';
            try {
                const fallbackClient = this.getClient(fallbackProvider);
                console.log(`[LLM] Trying fallback provider: ${fallbackProvider}`);
                return await fallbackClient.extractLocation(input);
            } catch (fallbackError) {
                console.error(`[LLM] All providers failed for location extraction`);
                throw new Error('LLM extraction failed');
            }
        }
    }

    /**
     * Validate datetime with fallback providers
     * @param {string} input - User input
     * @param {string} provider - Preferred provider
     * @returns {Object} Validation result
     */
    async validateDateTime(input, provider = null) {
        try {
            const client = this.getClient(provider);
            return await client.validateDateTime(input);
        } catch (error) {
            console.warn(`[LLM] ${provider || this.defaultProvider} failed for datetime validation:`, error.message);
            
            // Fallback to other provider
            const fallbackProvider = provider === 'openai' ? 'ollama' : 'openai';
            try {
                const fallbackClient = this.getClient(fallbackProvider);
                console.log(`[LLM] Trying fallback provider: ${fallbackProvider}`);
                return await fallbackClient.validateDateTime(input);
            } catch (fallbackError) {
                console.error(`[LLM] All providers failed for datetime validation`);
                throw new Error('LLM validation failed');
            }
        }
    }
}

// Export singleton instance
export default new LLMFactory();