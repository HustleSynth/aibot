// src/index.ts
import { Client, GatewayIntentBits, REST, Routes } from 'discord.js';
import { config } from './config/config';
import { CommandHandler } from './handlers/commandHandler';
import { MemoryManager } from './services/memory/memoryManager';
import { APIOrchestrator } from './services/ai/apiOrchestrator';
import { DatabaseManager } from './services/database/databaseManager';
import { AnalyticsService } from './services/analytics/analyticsService';
import { Logger } from './utils/logger';
import { registerCommands } from './commands/register';

class DiscordBot {
    private client: Client;
    private commandHandler: CommandHandler;
    private memoryManager: MemoryManager;
    private apiOrchestrator: APIOrchestrator;
    private databaseManager: DatabaseManager;
    private analyticsService: AnalyticsService;
    private logger: Logger;

    constructor() {
        this.logger = new Logger('DiscordBot');
        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
                GatewayIntentBits.GuildMembers,
                GatewayIntentBits.GuildVoiceStates,
                GatewayIntentBits.DirectMessages
            ]
        });

        this.databaseManager = new DatabaseManager();
        this.memoryManager = new MemoryManager(this.databaseManager);
        this.apiOrchestrator = new APIOrchestrator();
        this.analyticsService = new AnalyticsService(this.databaseManager);
        this.commandHandler = new CommandHandler(
            this.memoryManager,
            this.apiOrchestrator,
            this.analyticsService
        );
    }

    async start() {
        try {
            // Initialize services
            await this.databaseManager.connect();
            await this.memoryManager.initialize();
            await this.apiOrchestrator.initialize();
            
            // Register slash commands
            await this.registerSlashCommands();
            
            // Set up event handlers
            this.setupEventHandlers();
            
            // Login to Discord
            await this.client.login(config.discord.token);
            this.logger.info('Bot successfully started!');
        } catch (error) {
            this.logger.error('Failed to start bot:', error);
            process.exit(1);
        }
    }

    private async registerSlashCommands() {
        const rest = new REST({ version: '10' }).setToken(config.discord.token);
        
        try {
            const commands = registerCommands();
            await rest.put(
                Routes.applicationCommands(config.discord.clientId),
                { body: commands }
            );
            this.logger.info('Successfully registered slash commands');
        } catch (error) {
            this.logger.error('Failed to register slash commands:', error);
        }
    }

    private setupEventHandlers() {
        this.client.on('ready', () => {
            this.logger.info(`Logged in as ${this.client.user?.tag}!`);
            this.analyticsService.trackEvent('bot_ready', {
                guilds: this.client.guilds.cache.size
            });
        });

        this.client.on('interactionCreate', async (interaction) => {
            if (!interaction.isChatInputCommand()) return;
            
            try {
                await this.commandHandler.handleCommand(interaction);
                this.analyticsService.trackEvent('command_executed', {
                    command: interaction.commandName,
                    user: interaction.user.id,
                    guild: interaction.guildId
                });
            } catch (error) {
                this.logger.error('Command execution failed:', error);
                await interaction.reply({
                    content: 'An error occurred while executing this command.',
                    ephemeral: true
                });
            }
        });

        this.client.on('messageCreate', async (message) => {
            if (message.author.bot) return;
            
            // Handle contextual memory updates
            await this.memoryManager.updateContextualMemory(
                message.channelId,
                {
                    content: message.content,
                    userId: message.author.id,
                    timestamp: new Date()
                }
            );
            
            // Track message for analytics
            this.analyticsService.trackEvent('message_received', {
                channel: message.channelId,
                user: message.author.id
            });
        });

        this.client.on('error', (error) => {
            this.logger.error('Discord client error:', error);
        });
    }
}

// Start the bot
const bot = new DiscordBot();
bot.start().catch(console.error);

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('Shutting down gracefully...');
    process.exit(0);
});