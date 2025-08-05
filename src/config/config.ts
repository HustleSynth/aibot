// src/config/config.ts
import dotenv from 'dotenv';

dotenv.config();

export const config = {
    discord: {
        token: process.env.DISCORD_BOT_TOKEN || '',
        clientId: process.env.DISCORD_CLIENT_ID || ''
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
        evictionPolicy: 'FIFO'
    },
    
    apiProviders: {
        huggingface: {
            apiKey: process.env.HUGGINGFACE_API_KEY || '',
            models: ['microsoft/DialoGPT-medium', 'gpt2', 'EleutherAI/gpt-neo-2.7B']
        },
        cohere: {
            apiKey: process.env.COHERE_API_KEY || ''
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
            apiKey: process.env.GROQ_API_KEY || ''
        },
        googleAI: {
            apiKey: process.env.GOOGLE_AI_API_KEY || ''
        },
        mistral: {
            apiKey: process.env.MISTRAL_API_KEY || ''
        },
        openrouter: {
            apiKey: process.env.OPENROUTER_API_KEY || ''
        }
    },
    
    features: {
        analytics: {
            enabled: true,
            retentionDays: 30
        },
        moderation: {
            enabled: true,
            autoModThreshold: 0.8
        },
        voice: {
            enabled: true,
            maxDuration: 300 // seconds
        }
    },
    
    performance: {
        apiTimeout: 30000, // ms
        maxConcurrentRequests: 10,
        rateLimitWindow: 60000, // ms
        rateLimitMax: 100
    },
    
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        format: 'json'
    }
};

// Validate required config
export function validateConfig() {
    const required = [
        config.discord.token,
        config.discord.clientId
    ];
    
    if (required.some(val => !val)) {
        throw new Error('Missing required configuration. Check your .env file.');
    }
}