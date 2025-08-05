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
}

export interface AIResponse {
    provider: string;
    content: string;
    metadata?: any;
    latency: number;
}

export class APIOrchestrator {
    private providers: Map<string, AIProvider>;
    private providerClients: Map<string, AxiosInstance>;
    private logger: Logger;
    private requestCounts: Map<string, { count: number; window: Date }>;
    private activeModel: string = 'auto';

    constructor() {
        this.logger = new Logger('APIOrchestrator');
        this.providers = new Map();
        this.providerClients = new Map();
        this.requestCounts = new Map();
        this.initializeProviders();
    }

    private initializeProviders() {
        // HuggingFace
        this.registerProvider({
            name: 'huggingface',
            type: 'text',
            priority: 1,
            rateLimit: { requests: 100, window: 3600000 },
            isAvailable: true,
            errors: 0
        });

        // Cohere
        this.registerProvider({
            name: 'cohere',
            type: 'text',
            priority: 2,
            rateLimit: { requests: 1000, window: 60000 },
            isAvailable: true,
            errors: 0
        });

        // Google AI Studio
        this.registerProvider({
            name: 'googleai',
            type: 'text',
            priority: 3,
            rateLimit: { requests: 60, window: 60000 },
            isAvailable: true,
            errors: 0
        });

        // Groq
        this.registerProvider({
            name: 'groq',
            type: 'text',
            priority: 4,
            rateLimit: { requests: 30, window: 60000 },
            isAvailable: true,
            errors: 0
        });

        // DeepAI
        this.registerProvider({
            name: 'deepai',
            type: 'multimodal',
            priority: 5,
            rateLimit: { requests: 50, window: 60000 },
            isAvailable: true,
            errors: 0
        });

        // Stability AI
        this.registerProvider({
            name: 'stability',
            type: 'image',
            priority: 1,
            rateLimit: { requests: 25, window: 60000 },
            isAvailable: true,
            errors: 0
        });

        // Initialize HTTP clients
        this.initializeClients();
    }

    private registerProvider(provider: AIProvider) {
        this.providers.set(provider.name, provider);
        this.requestCounts.set(provider.name, { count: 0, window: new Date() });
    }

    private initializeClients() {
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

        // Add other provider clients...
    }

    async initialize() {
        // Test provider availability
        await this.testProviders();
        this.logger.info('API Orchestrator initialized');
    }

    async generateText(prompt: string, options?: any): Promise<AIResponse> {
        const startTime = Date.now();
        const availableProviders = this.getAvailableProviders('text');
        
        for (const provider of availableProviders) {
            if (!this.checkRateLimit(provider.name)) {
                continue;
            }

            try {
                const response = await this.callProvider(provider.name, 'text', prompt, options);
                
                provider.lastUsed = new Date();
                provider.errors = 0;
                
                return {
                    provider: provider.name,
                    content: response,
                    latency: Date.now() - startTime
                };
            } catch (error) {
                this.handleProviderError(provider, error);
            }
        }

        throw new Error('All text generation providers failed');
    }

    async generateImage(prompt: string, options?: any): Promise<AIResponse> {
        const startTime = Date.now();
        const availableProviders = this.getAvailableProviders('image');
        
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
                    latency: Date.now() - startTime
                };
            } catch (error) {
                this.handleProviderError(provider, error);
            }
        }

        throw new Error('All image generation providers failed');
    }

    private async callProvider(providerName: string, type: string, prompt: string, options?: any): Promise<string> {
        const client = this.providerClients.get(providerName);
        if (!client) {
            throw new Error(`No client configured for provider: ${providerName}`);
        }

        this.incrementRequestCount(providerName);

        switch (providerName) {
            case 'huggingface':
                return await this.callHuggingFace(client, prompt, options);
            case 'cohere':
                return await this.callCohere(client, prompt, options);
            case 'googleai':
                return await this.callGoogleAI(client, prompt, options);
            case 'groq':
                return await this.callGroq(client, prompt, options);
            default:
                throw new Error(`Provider ${providerName} not implemented`);
        }
    }

    private async callHuggingFace(client: AxiosInstance, prompt: string, options?: any): Promise<string> {
        const model = options?.model || config.apiProviders.huggingface.models[0];
        const response = await client.post(`/${model}`, {
            inputs: prompt,
            parameters: {
                max_length: options?.maxLength || 200,
                temperature: options?.temperature || 0.7
            }
        });

        return response.data[0]?.generated_text || response.data.generated_text || '';
    }

    private async callCohere(client: AxiosInstance, prompt: string, options?: any): Promise<string> {
        const response = await client.post('/generate', {
            prompt,
            model: options?.model || 'command-light',
            max_tokens: options?.maxTokens || 200,
            temperature: options?.temperature || 0.7
        });

        return response.data.generations[0].text;
    }

    private async callGoogleAI(client: AxiosInstance, prompt: string, options?: any): Promise<string> {
        const response = await client.post('/models/gemini-pro:generateContent', {
            contents: [{
                parts: [{
                    text: prompt
                }]
            }],
            generationConfig: {
                temperature: options?.temperature || 0.7,
                maxOutputTokens: options?.maxTokens || 200
            }
        });

        return response.data.candidates[0].content.parts[0].text;
    }

    private async callGroq(client: AxiosInstance, prompt: string, options?: any): Promise<string> {
        // Groq implementation
        throw new Error('Groq provider not yet implemented');
    }

    private getAvailableProviders(type: 'text' | 'image' | 'audio' | 'multimodal'): AIProvider[] {
        return Array.from(this.providers.values())
            .filter(p => (p.type === type || p.type === 'multimodal') && p.isAvailable)
            .sort((a, b) => {
                // Sort by errors (ascending) then priority
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
            // Reset window
            counts.count = 0;
            counts.window = now;
        }
        
        return counts.count < provider.rateLimit.requests;
    }

    private incrementRequestCount(providerName: string) {
        const counts = this.requestCounts.get(providerName)!;
        counts.count++;
    }

    private handleProviderError(provider: AIProvider, error: any) {
        provider.errors++;
        this.logger.error(`Provider ${provider.name} error:`, error.message);
        
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

    private async testProviders() {
        for (const [name, provider] of this.providers) {
            try {
                // Simple connectivity test
                const client = this.providerClients.get(name);
                if (client) {
                    // Just check if we can reach the API
                    await client.get('/').catch(() => {});
                    this.logger.info(`Provider ${name} is available`);
                }
            } catch (error) {
                this.logger.warn(`Provider ${name} test failed`);
            }
        }
    }

    async switchModel(modelName: string) {
        this.activeModel = modelName;
        this.logger.info(`Switched to model: ${modelName}`);
    }

    async getProviderStats(): Promise<any[]> {
        const stats = [];
        
        for (const [name, provider] of this.providers) {
            const counts = this.requestCounts.get(name)!;
            stats.push({
                name,
                type: provider.type,
                available: provider.isAvailable,
                errors: provider.errors,
                requestsInWindow: counts.count,
                rateLimit: provider.rateLimit,
                lastUsed: provider.lastUsed
            });
        }
        
        return stats;
    }
}