// src/config/config.ts
import dotenv from 'dotenv';

dotenv.config();

export const config = {
    discord: {
        token: process.env.DISCORD_BOT_TOKEN || '',
        clientId: process.env.DISCORD_CLIENT_ID || '',
        adminIds: process.env.ADMIN_IDS?.split(',') || []
    },
    
    database: {
        supabase: {
            url: process.env.SUPABASE_URL || '',
            anonKey: process.env.SUPABASE_ANON_KEY || ''
        },
        mongodb: {
            uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/discord-bot'
        }
    },
    
    memory: {
        maxEntries: 200,
        evictionPolicy: 'FIFO' as const,
        tiers: {
            contextual: { enabled: true, maxSize: 200 },
            personality: { enabled: true, maxSize: 200 },
            individual: { enabled: true, maxSize: 200 },
            connections: { enabled: true, maxSize: 200 }
        }
    },
    
    apiProviders: {
        huggingface: {
            apiKey: process.env.HUGGINGFACE_API_KEY || '',
            models: [
                'microsoft/DialoGPT-medium',
                'gpt2',
                'EleutherAI/gpt-neo-2.7B',
                'EleutherAI/gpt-j-6B'
            ]
        },
        cohere: {
            apiKey: process.env.COHERE_API_KEY || '',
            models: ['command-light', 'command', 'command-nightly']
        },
        deepai: {
            apiKey: process.env.DEEPAI_API_KEY || ''
        },
        stability: {
            apiKey: process.env.STABILITY_API_KEY || ''
        },
        replicate: {
            apiKey: process.env.REPLICATE_API_KEY || ''
        },
        assemblyai: {
            apiKey: process.env.ASSEMBLYAI_API_KEY || ''
        },
        elevenlabs: {
            apiKey: process.env.ELEVENLABS_API_KEY || ''
        },
        groq: {
            apiKey: process.env.GROQ_API_KEY || '',
            models: ['mixtral-8x7b-32768', 'llama2-70b-4096']
        },
        googleAI: {
            apiKey: process.env.GOOGLE_AI_API_KEY || '',
            models: ['gemini-pro', 'gemini-pro-vision']
        },
        mistral: {
            apiKey: process.env.MISTRAL_API_KEY || '',
            models: ['mistral-tiny', 'mistral-small', 'mistral-medium']
        },
        openrouter: {
            apiKey: process.env.OPENROUTER_API_KEY || '',
            models: [
                'deepseek/deepseek-chat-v3-0324:free',
                'meta-llama/llama-3.2-1b-instruct:free',
                'meta-llama/llama-3.2-3b-instruct:free',
                'meta-llama/llama-3.1-8b-instruct:free',
                'google/gemma-2-9b-it:free',
                'mistralai/mistral-7b-instruct:free',
                'microsoft/phi-3-mini-128k-instruct:free',
                'huggingfaceh4/zephyr-7b-beta:free',
                'openchat/openchat-7b:free',
                'undi95/toppy-m-7b:free'
            ],
            defaultModel: 'deepseek/deepseek-chat-v3-0324:free'
        }
    },
    
    features: {
        analytics: {
            enabled: true,
            retentionDays: 30,
            trackingLevel: 'full' // 'full', 'anonymous', 'none'
        },
        moderation: {
            enabled: true,
            autoModThreshold: 0.8,
            flaggedWords: [],
            immuneRoles: []
        },
        voice: {
            enabled: true,
            maxDuration: 300, // seconds
            supportedFormats: ['mp3', 'wav', 'ogg']
        },
        privacy: {
            gdprCompliant: true,
            dataRetentionDays: 90,
            allowDataExport: true,
            allowDataDeletion: true
        }
    },
    
    performance: {
        apiTimeout: 30000, // ms
        maxConcurrentRequests: 10,
        rateLimitWindow: 60000, // ms
        rateLimitMax: 100,
        cacheEnabled: true,
        cacheTTL: 3600000 // 1 hour
    },
    
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        format: 'json',
        logToFile: true,
        logRotation: {
            maxSize: '10m',
            maxFiles: 5,
            compress: true
        }
    },
    
    deployment: {
        environment: process.env.NODE_ENV || 'development',
        port: process.env.PORT || 3000,
        healthCheckInterval: 60000, // ms
        autoRestart: true,
        maxMemoryUsage: 512 // MB
    }
};

// Validate required config
export function validateConfig(): void {
    const required = [
        { name: 'Discord Token', value: config.discord.token },
        { name: 'Discord Client ID', value: config.discord.clientId }
    ];
    
    const missing = required.filter(item => !item.value);
    
    if (missing.length > 0) {
        const missingNames = missing.map(item => item.name).join(', ');
        throw new Error(`Missing required configuration: ${missingNames}. Check your .env file.`);
    }
    
    // Warn about missing optional API keys
    const apiKeys = [
        { name: 'OpenRouter', value: config.apiProviders.openrouter.apiKey },
        { name: 'HuggingFace', value: config.apiProviders.huggingface.apiKey },
        { name: 'Google AI', value: config.apiProviders.googleAI.apiKey }
    ];
    
    const missingKeys = apiKeys.filter(key => !key.value);
    if (missingKeys.length > 0) {
        console.warn('⚠️  Missing API keys for:', missingKeys.map(k => k.name).join(', '));
        console.warn('   Some features will be limited.');
    }
}

// Export helper functions
export const isProduction = () => config.deployment.environment === 'production';
export const isDevelopment = () => config.deployment.environment === 'development';
export const hasOpenRouter = () => !!config.apiProviders.openrouter.apiKey;