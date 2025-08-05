// src/services/ai/apiOrchestrator.ts
import { Logger } from '../../utils/logger';
import { config } from '../../config/config';
import axios, { AxiosInstance } from 'axios';

export interface AIProvider {
    name: string;
    type: 'text' | 'image' | 'audio' | 'multimodal';
    priority: number;
    rateLimit: {
        requests: number;
        window: number; // ms
    };
    isAvailable: boolean;
    lastUsed?: Date;
    errors: number;
    successRate: number;
}

export interface AIResponse {
    provider: string;
    content: string;
    model?: string;
    metadata?: any;
    latency: number;
    cached?: boolean;
}

export interface GenerationOptions {
    model?: string;
    maxTokens?: number;
    temperature?: number;
    topP?: number;
    topK?: number;
    maxLength?: number;
    systemPrompt?: string;
    stream?: boolean;
}

export class APIOrchestrator {
    private providers: Map<string, AIProvider>;
    private providerClients: Map<string, AxiosInstance>;
    private logger: Logger;
    private requestCounts: Map<string, { count: number; window: Date }>;
    private responseCache: Map<string, { response: AIResponse; timestamp: number }>;
    private activeModel: string = 'auto';
    private stats: Map<string, { total: number; success: number; totalLatency: number }>;

    constructor() {
        this.logger = new Logger('APIOrchestrator');
        this.providers = new Map();
        this.providerClients = new Map();
        this.requestCounts = new Map();
        this.responseCache = new Map();
        this.stats = new Map();
        this.initializeProviders();
    }

    private initializeProviders(): void {
        // OpenRouter (Priority 1 for free models)
        this.registerProvider({
            name: 'openrouter',
            type: 'text',
            priority: 1,
            rateLimit: { requests: 200, window: 60000 },
            isAvailable: !!config.apiProviders.openrouter.apiKey,
            errors: 0,
            successRate: 100
        });

        // HuggingFace
        this.registerProvider({
            name: 'huggingface',
            type: 'text',
            priority: 2,
            rateLimit: { requests: 100, window: 3600000 },
            isAvailable: !!config.apiProviders.huggingface.apiKey,
            errors: 0,
            successRate: 100
        });

        // Cohere
        this.registerProvider({
            name: 'cohere',
            type: 'text',
            priority: 3,
            rateLimit: { requests: 1000, window: 60000 },
            isAvailable: !!config.apiProviders.cohere.apiKey,
            errors: 0,
            successRate: 100
        });

        // Google AI Studio
        this.registerProvider({
            name: 'googleai',
            type: 'text',
            priority: 4,
            rateLimit: { requests: 60, window: 60000 },
            isAvailable: !!config.apiProviders.googleAI.apiKey,
            errors: 0,
            successRate: 100
        });

        // Groq
        this.registerProvider({
            name: 'groq',
            type: 'text',
            priority: 5,
            rateLimit: { requests: 30, window: 60000 },
            isAvailable: !!config.apiProviders.groq.apiKey,
            errors: 0,
            successRate: 100
        });

        // Mistral
        this.registerProvider({
            name: 'mistral',
            type: 'text',
            priority: 6,
            rateLimit: { requests: 100, window: 60000 },
            isAvailable: !!config.apiProviders.mistral.apiKey,
            errors: 0,
            successRate: 100
        });

        // DeepAI
        this.registerProvider({
            name: 'deepai',
            type: 'multimodal',
            priority: 7,
            rateLimit: { requests: 50, window: 60000 },
            isAvailable: !!config.apiProviders.deepai.apiKey,
            errors: 0,
            successRate: 100
        });

        // Stability AI
        this.registerProvider({
            name: 'stability',
            type: 'image',
            priority: 1,
            rateLimit: { requests: 25, window: 60000 },
            isAvailable: !!config.apiProviders.stability.apiKey,
            errors: 0,
            successRate: 100
        });

        // Initialize HTTP clients
        this.initializeClients();
    }

    private registerProvider(provider: AIProvider): void {
        this.providers.set(provider.name, provider);
        this.requestCounts.set(provider.name, { count: 0, window: new Date() });
        this.stats.set(provider.name, { total: 0, success: 0, totalLatency: 0 });
    }

    private initializeClients(): void {
        // OpenRouter client
        if (config.apiProviders.openrouter.apiKey) {
            this.providerClients.set('openrouter', axios.create({
                baseURL: 'https://openrouter.ai/api/v1',
                headers: {
                    'Authorization': `Bearer ${config.apiProviders.openrouter.apiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': 'https://github.com/yourusername/discord-bot',
                    'X-Title': 'Discord AI Bot'
                },
                timeout: config.performance.apiTimeout
            }));
        }

        // HuggingFace client
        if (config.apiProviders.huggingface.apiKey) {
            this.providerClients.set('huggingface', axios.create({
                baseURL: 'https://api-inference.huggingface.co/models',
                headers: {
                    'Authorization': `Bearer ${config.apiProviders.huggingface.apiKey}`
                },
                timeout: config.performance.apiTimeout
            }));
        }

        // Cohere client
        if (config.apiProviders.cohere.apiKey) {
            this.providerClients.set('cohere', axios.create({
                baseURL: 'https://api.cohere.ai/v1',
                headers: {
                    'Authorization': `Bearer ${config.apiProviders.cohere.apiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: config.performance.apiTimeout
            }));
        }

        // Google AI client
        if (config.apiProviders.googleAI.apiKey) {
            this.providerClients.set('googleai', axios.create({
                baseURL: 'https://generativelanguage.googleapis.com/v1beta',
                params: {
                    key: config.apiProviders.googleAI.apiKey
                },
                timeout: config.performance.apiTimeout
            }));
        }

        // Groq client
        if (config.apiProviders.groq.apiKey) {
            this.providerClients.set('groq', axios.create({
                baseURL: 'https://api.groq.com/openai/v1',
                headers: {
                    'Authorization': `Bearer ${config.apiProviders.groq.apiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: config.performance.apiTimeout
            }));
        }

        // Mistral client
        if (config.apiProviders.mistral.apiKey) {
            this.providerClients.set('mistral', axios.create({
                baseURL: 'https://api.mistral.ai/v1',
                headers: {
                    'Authorization': `Bearer ${config.apiProviders.mistral.apiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: config.performance.apiTimeout
            }));
        }
    }

    async initialize(): Promise<void> {
        await this.testProviders();
        this.startCacheCleanup();
        this.logger.info('API Orchestrator initialized with providers:', 
            Array.from(this.providers.keys()).filter(p => this.providers.get(p)?.isAvailable));
    }

    async generateText(prompt: string, options?: GenerationOptions): Promise<AIResponse> {
        // Check cache first
        const cacheKey = this.getCacheKey(prompt, options);
        const cached = this.getFromCache(cacheKey);
        if (cached) {
            return { ...cached, cached: true };
        }

        const startTime = Date.now();
        const availableProviders = this.getAvailableProviders('text');
        
        if (availableProviders.length === 0) {
            throw new Error('No text generation providers available');
        }

        let lastError: Error | null = null;
        
        for (const provider of availableProviders) {
            if (!this.checkRateLimit(provider.name)) {
                this.logger.warn(`Rate limit reached for ${provider.name}`);
                continue;
            }

            try {
                const response = await this.callProvider(provider.name, 'text', prompt, options);
                
                provider.lastUsed = new Date();
                provider.errors = 0;
                
                const aiResponse: AIResponse = {
                    provider: provider.name,
                    content: response,
                    model: options?.model,
                    latency: Date.now() - startTime
                };

                // Update stats
                this.updateStats(provider.name, true, aiResponse.latency);
                
                // Cache response
                this.cacheResponse(cacheKey, aiResponse);
                
                return aiResponse;
            } catch (error: any) {
                lastError = error;
                this.handleProviderError(provider, error);
                this.updateStats(provider.name, false, Date.now() - startTime);
            }
        }

        throw new Error(`All text generation providers failed. Last error: ${lastError?.message}`);
    }

    async generateImage(prompt: string, options?: GenerationOptions): Promise<AIResponse> {
        const startTime = Date.now();
        const availableProviders = this.getAvailableProviders('image');
        
        if (availableProviders.length === 0) {
            throw new Error('No image generation providers available');
        }

        for (const provider of availableProviders) {
            if (!this.checkRateLimit(provider.name)) {
                continue;
            }

            try {
                const response = await this.callProvider(provider.name, 'image', prompt, options);
                
                provider.lastUsed = new Date();
                provider.errors = 0;
                
                return {
                    provider: provider.name,
                    content: response,
                    model: options?.model,
                    latency: Date.now() - startTime
                };
            } catch (error: any) {
                this.handleProviderError(provider, error);
            }
        }

        throw new Error('All image generation providers failed');
    }

    private async callProvider(providerName: string, type: string, prompt: string, options?: GenerationOptions): Promise<string> {
        const client = this.providerClients.get(providerName);
        if (!client) {
            throw new Error(`No client configured for provider: ${providerName}`);
        }

        this.incrementRequestCount(providerName);

        switch (providerName) {
            case 'openrouter':
                return await this.callOpenRouter(client, prompt, options);
            case 'huggingface':
                return await this.callHuggingFace(client, prompt, options);
            case 'cohere':
                return await this.callCohere(client, prompt, options);
            case 'googleai':
                return await this.callGoogleAI(client, prompt, options);
            case 'groq':
                return await this.callGroq(client, prompt, options);
            case 'mistral':
                return await this.callMistral(client, prompt, options);
            default:
                throw new Error(`Provider ${providerName} not implemented`);
        }
    }

    private async callOpenRouter(client: AxiosInstance, prompt: string, options?: GenerationOptions): Promise<string> {
        try {
            const model = options?.model || config.apiProviders.openrouter.defaultModel;
            
            const messages = [
                ...(options?.systemPrompt ? [{ role: 'system', content: options.systemPrompt }] : []),
                { role: 'user', content: prompt }
            ];

            const response = await client.post('/chat/completions', {
                model: model,
                messages: messages,
                max_tokens: options?.maxTokens || 2048,
                temperature: options?.temperature || 0.7,
                top_p: options?.topP || 0.9,
                stream: options?.stream || false
            });

            if (response.data?.choices?.[0]?.message?.content) {
                return response.data.choices[0].message.content.trim();
            }
            
            throw new Error('Invalid response format from OpenRouter');
        } catch (error: any) {
            if (error.response?.status === 402) {
                throw new Error('OpenRouter: Insufficient credits or payment required');
            } else if (error.response?.status === 429) {
                throw new Error('OpenRouter: Rate limit exceeded');
            } else if (error.response?.data?.error) {
                throw new Error(`OpenRouter: ${error.response.data.error.message || 'Unknown error'}`);
            }
            throw error;
        }
    }

    private async callHuggingFace(client: AxiosInstance, prompt: string, options?: GenerationOptions): Promise<string> {
        const model = options?.model || config.apiProviders.huggingface.models[0];
        const response = await client.post(`/${model}`, {
            inputs: prompt,
            parameters: {
                max_length: options?.maxLength || 200,
                temperature: options?.temperature || 0.7,
                top_p: options?.topP || 0.9,
                do_sample: true
            }
        });

        return response.data[0]?.generated_text || response.data.generated_text || '';
    }

    private async callCohere(client: AxiosInstance, prompt: string, options?: GenerationOptions): Promise<string> {
        const response = await client.post('/generate', {
            prompt,
            model: options?.model || 'command-light',
            max_tokens: options?.maxTokens || 200,
            temperature: options?.temperature || 0.7
        });

        return response.data.generations[0].text.trim();
    }

    private async callGoogleAI(client: AxiosInstance, prompt: string, options?: GenerationOptions): Promise<string> {
        const response = await client.post('/models/gemini-pro:generateContent', {
            contents: [{
                parts: [{
                    text: prompt
                }]
            }],
            generationConfig: {
                temperature: options?.temperature || 0.7,
                maxOutputTokens: options?.maxTokens || 200,
                topP: options?.topP || 0.9
            }
        });

        return response.data.candidates[0].content.parts[0].text;
    }

    private async callGroq(client: AxiosInstance, prompt: string, options?: GenerationOptions): Promise<string> {
        const response = await client.post('/chat/completions', {
            model: options?.model || 'mixtral-8x7b-32768',
            messages: [
                { role: 'user', content: prompt }
            ],
            max_tokens: options?.maxTokens || 1024,
            temperature: options?.temperature || 0.7
        });

        return response.data.choices[0].message.content;
    }

    private async callMistral(client: AxiosInstance, prompt: string, options?: GenerationOptions): Promise<string> {
        const response = await client.post('/chat/completions', {
            model: options?.model || 'mistral-tiny',
            messages: [
                { role: 'user', content: prompt }
            ],
            max_tokens: options?.maxTokens || 1024,
            temperature: options?.temperature || 0.7
        });

        return response.data.choices[0].message.content;
    }

    private getAvailableProviders(type: 'text' | 'image' | 'audio' | 'multimodal'): AIProvider[] {
        return Array.from(this.providers.values())
            .filter(p => (p.type === type || p.type === 'multimodal') && p.isAvailable)
            .sort((a, b) => {
                // Sort by success rate first, then errors, then priority
                if (a.successRate !== b.successRate) return b.successRate - a.successRate;
                if (a.errors !== b.errors) return a.errors - b.errors;
                return a.priority - b.priority;
            });
    }

    private checkRateLimit(providerName: string): boolean {
        const provider = this.providers.get(providerName)!;
        const counts = this.requestCounts.get(providerName)!;
        
        const now = new Date();
        const windowElapsed = now.getTime() - counts.window.getTime();
        
        if (windowElapsed >= provider.rateLimit.window) {
            counts.count = 0;
            counts.window = now;
        }
        
        return counts.count < provider.rateLimit.requests;
    }

    private incrementRequestCount(providerName: string): void {
        const counts = this.requestCounts.get(providerName)!;
        counts.count++;
    }

    private handleProviderError(provider: AIProvider, error: any): void {
        provider.errors++;
        this.logger.error(`Provider ${provider.name} error:`, error.message);
        
        // Update success rate
        const stats = this.stats.get(provider.name);
        if (stats && stats.total > 0) {
            provider.successRate = (stats.success / stats.total) * 100;
        }
        
        // Disable provider after 5 consecutive errors
        if (provider.errors >= 5) {
            provider.isAvailable = false;
            this.logger.warn(`Provider ${provider.name} disabled due to repeated errors`);
            
            // Re-enable after 5 minutes
            setTimeout(() => {
                provider.isAvailable = true;
                provider.errors = 0;
                this.logger.info(`Provider ${provider.name} re-enabled`);
            }, 300000);
        }
    }

    private updateStats(providerName: string, success: boolean, latency: number): void {
        const stats = this.stats.get(providerName)!;
        stats.total++;
        if (success) stats.success++;
        stats.totalLatency += latency;
        
        const provider = this.providers.get(providerName)!;
        provider.successRate = (stats.success / stats.total) * 100;
    }

    private getCacheKey(prompt: string, options?: GenerationOptions): string {
        return `${prompt}-${JSON.stringify(options || {})}`;
    }

    private getFromCache(key: string): AIResponse | null {
        if (!config.performance.cacheEnabled) return null;
        
        const cached = this.responseCache.get(key);
        if (!cached) return null;
        
        const age = Date.now() - cached.timestamp;
        if (age > config.performance.cacheTTL) {
            this.responseCache.delete(key);
            return null;
        }
        
        return cached.response;
    }

    private cacheResponse(key: string, response: AIResponse): void {
        if (!config.performance.cacheEnabled) return;
        
        this.responseCache.set(key, {
            response,
            timestamp: Date.now()
        });
    }

    private startCacheCleanup(): void {
        setInterval(() => {
            const now = Date.now();
            for (const [key, cached] of this.responseCache.entries()) {
                if (now - cached.timestamp > config.performance.cacheTTL) {
                    this.responseCache.delete(key);
                }
            }
        }, 60000); // Clean every minute
    }

    private async testProviders(): Promise<void> {
        for (const [name, provider] of this.providers) {
            if (!provider.isAvailable) continue;
            
            try {
                const client = this.providerClients.get(name);
                if (client) {
                    // Simple connectivity test
                    if (name === 'openrouter') {
                        await client.get('/models');
                    } else {
                        await client.get('/').catch(() => {});
                    }
                    this.logger.info(`✓ Provider ${name} is available`);
                }
            } catch (error) {
                this.logger.warn(`✗ Provider ${name} test failed`);
                provider.isAvailable = false;
            }
        }
    }

    async switchModel(modelName: string): Promise<void> {
        this.activeModel = modelName;
        this.logger.info(`Switched to model: ${modelName}`);
    }

    async getProviderStats(): Promise<any[]> {
        const stats = [];
        
        for (const [name, provider] of this.providers) {
            const counts = this.requestCounts.get(name)!;
            const providerStats = this.stats.get(name)!;
            
            stats.push({
                name,
                type: provider.type,
                available: provider.isAvailable,
                errors: provider.errors,
                successRate: provider.successRate.toFixed(2) + '%',
                requestsInWindow: counts.count,
                rateLimit: provider.rateLimit,
                lastUsed: provider.lastUsed,
                totalRequests: providerStats.total,
                avgLatency: providerStats.total > 0 
                    ? Math.round(providerStats.totalLatency / providerStats.total) 
                    : 0
            });
        }
        
        return stats.sort((a, b) => b.totalRequests - a.totalRequests);
    }

    async listAvailableModels(): Promise<{ provider: string; models: string[] }[]> {
        const result = [];
        
        if (config.apiProviders.openrouter.apiKey) {
            result.push({
                provider: 'openrouter',
                models: config.apiProviders.openrouter.models
            });
        }
        
        if (config.apiProviders.huggingface.apiKey) {
            result.push({
                provider: 'huggingface',
                models: config.apiProviders.huggingface.models
            });
        }
        
        if (config.apiProviders.googleAI.apiKey) {
            result.push({
                provider: 'googleai',
                models: config.apiProviders.googleAI.models
            });
        }
        
        if (config.apiProviders.groq.apiKey) {
            result.push({
                provider: 'groq',
                models: config.apiProviders.groq.models
            });
        }
        
        if (config.apiProviders.mistral.apiKey) {
            result.push({
                provider: 'mistral',
                models: config.apiProviders.mistral.models
            });
        }
        
        return result;
    }
}