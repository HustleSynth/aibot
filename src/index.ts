// src/index.ts
import { Client, GatewayIntentBits, Partials, ActivityType } from 'discord.js';
import { config, validateConfig } from './config/config';
import { Logger } from './utils/logger';
import { DatabaseManager } from './services/database/databaseManager';
import { MemoryManager } from './services/memory/memoryManager';
import { APIOrchestrator } from './services/ai/apiOrchestrator';
import { CommandHandler } from './handlers/commandHandler';
import { MessageHandler } from './handlers/messageHandler';
import { AnalyticsService } from './services/analytics/analyticsService';
import { HealthMonitor } from './utils/healthMonitor';
import { registerCommands } from './utils/registerCommands';

// Initialize services
const logger = new Logger('Main');
let client: Client;
let isShuttingDown = false;

// Error handlers
process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    gracefulShutdown(1);
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Graceful shutdown
async function gracefulShutdown(code: number = 0) {
    if (isShuttingDown) return;
    isShuttingDown = true;
    
    logger.info('Initiating graceful shutdown...');
    
    try {
        if (client) {
            client.destroy();
        }
        
        // Close database connections
        await DatabaseManager.getInstance().close();
        
        // Save memory state
        await MemoryManager.getInstance().saveState();
        
        logger.info('Shutdown complete');
        process.exit(code);
    } catch (error) {
        logger.error('Error during shutdown:', error);
        process.exit(1);
    }
}

// Signal handlers
process.on('SIGINT', () => gracefulShutdown(0));
process.on('SIGTERM', () => gracefulShutdown(0));

// Main bot initialization
async function initializeBot() {
    try {
        // Validate configuration
        validateConfig();
        logger.info('Configuration validated');
        
        // Initialize database
        await DatabaseManager.getInstance().initialize();
        logger.info('Database initialized');
        
        // Initialize memory manager
        await MemoryManager.getInstance().initialize();
        logger.info('Memory manager initialized');
        
        // Initialize API orchestrator
        await APIOrchestrator.getInstance().initialize();
        logger.info('API orchestrator initialized');
        
        // Initialize analytics
        if (config.features.analytics.enabled) {
            await AnalyticsService.getInstance().initialize();
            logger.info('Analytics service initialized');
        }
        
        // Create Discord client
        client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
                GatewayIntentBits.DirectMessages,
                GatewayIntentBits.GuildMembers,
                GatewayIntentBits.GuildVoiceStates,
                GatewayIntentBits.GuildMessageReactions
            ],
            partials: [
                Partials.Channel,
                Partials.Message,
                Partials.User,
                Partials.GuildMember,
                Partials.Reaction
            ],
            allowedMentions: {
                parse: ['users', 'roles'],
                repliedUser: true
            }
        });
        
        // Initialize handlers
        const commandHandler = new CommandHandler(client);
        const messageHandler = new MessageHandler(client);
        
        // Set up event handlers
        client.once('ready', async () => {
            if (!client.user) return;
            
            logger.info(`Bot logged in as ${client.user.tag}`);
            
            // Set bot activity
            client.user.setActivity('with AI models', { 
                type: ActivityType.Playing 
            });
            
            // Register slash commands
            await registerCommands(client);
            logger.info('Slash commands registered');
            
            // Initialize handlers
            await commandHandler.initialize();
            await messageHandler.initialize();
            
            // Start health monitoring
            const healthMonitor = new HealthMonitor(client);
            healthMonitor.start();
            
            logger.info('Bot is fully operational');
            
            // Log startup stats
            const stats = await APIOrchestrator.getInstance().getProviderStats();
            logger.info('Available AI providers:', stats.filter(s => s.available).map(s => s.name));
        });
        
        // Error handling
        client.on('error', (error) => {
            logger.error('Discord client error:', error);
        });
        
        client.on('warn', (warning) => {
            logger.warn('Discord client warning:', warning);
        });
        
        // Shard events (if sharding)
        client.on('shardError', (error, shardId) => {
            logger.error(`Shard ${shardId} error:`, error);
        });
        
        client.on('shardReconnecting', (shardId) => {
            logger.info(`Shard ${shardId} reconnecting...`);
        });
        
        client.on('shardReady', (shardId) => {
            logger.info(`Shard ${shardId} ready`);
        });
        
        client.on('shardDisconnect', (event, shardId) => {
            logger.warn(`Shard ${shardId} disconnected:`, event);
        });
        
        // Rate limit handling
        client.on('rateLimit', (rateLimitData) => {
            logger.warn('Rate limit hit:', {
                timeout: rateLimitData.timeout,
                limit: rateLimitData.limit,
                method: rateLimitData.method,
                path: rateLimitData.path,
                route: rateLimitData.route
            });
        });
        
        // Guild events
        client.on('guildCreate', async (guild) => {
            logger.info(`Joined new guild: ${guild.name} (${guild.id})`);
            
            // Send welcome message
            const defaultChannel = guild.systemChannel || 
                guild.channels.cache.find(ch => ch.isTextBased() && ch.permissionsFor(guild.members.me!)?.has('SendMessages'));
            
            if (defaultChannel && defaultChannel.isTextBased()) {
                await defaultChannel.send({
                    embeds: [{
                        title: '👋 Hello! I\'m your AI-powered Discord bot',
                        description: 'I\'m equipped with multiple AI models and advanced memory systems to provide the best experience.',
                        fields: [
                            {
                                name: '🚀 Getting Started',
                                value: 'Use `/help` to see all available commands'
                            },
                            {
                                name: '🧠 AI Models',
                                value: 'I can use OpenRouter (DeepSeek), Google AI, HuggingFace, and more!'
                            },
                            {
                                name: '💾 Memory System',
                                value: 'I remember conversations and learn from interactions'
                            },
                            {
                                name: '🛡️ Privacy',
                                value: 'Use `/optin` and `/optout` to control data features'
                            }
                        ],
                        color: 0x7289DA,
                        footer: {
                            text: 'Powered by OpenRouter & Multiple AI Providers'
                        }
                    }]
                });
            }
            
            // Track analytics
            if (config.features.analytics.enabled) {
                await AnalyticsService.getInstance().trackEvent('guild_join', {
                    guildId: guild.id,
                    guildName: guild.name,
                    memberCount: guild.memberCount
                });
            }
        });
        
        client.on('guildDelete', async (guild) => {
            logger.info(`Left guild: ${guild.name} (${guild.id})`);
            
            // Clean up guild data
            await DatabaseManager.getInstance().cleanupGuildData(guild.id);
            
            // Track analytics
            if (config.features.analytics.enabled) {
                await AnalyticsService.getInstance().trackEvent('guild_leave', {
                    guildId: guild.id,
                    guildName: guild.name
                });
            }
        });
        
        // Connect to Discord
        logger.info('Connecting to Discord...');
        await client.login(config.discord.token);
        
    } catch (error) {
        logger.error('Failed to initialize bot:', error);
        await gracefulShutdown(1);
    }
}

// Singleton getter for other modules
export function getClient(): Client {
    if (!client) {
        throw new Error('Discord client not initialized');
    }
    return client;
}

// Start the bot
initializeBot().catch((error) => {
    logger.error('Fatal error during startup:', error);
    process.exit(1);
});