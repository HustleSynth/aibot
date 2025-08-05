// src/handlers/commandHandler.ts
import { ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { MemoryManager } from '../services/memory/memoryManager';
import { APIOrchestrator } from '../services/ai/apiOrchestrator';
import { AnalyticsService } from '../services/analytics/analyticsService';
import { Logger } from '../utils/logger';

export class CommandHandler {
    private logger: Logger;
    private startTime: Date;
    private isPaused: boolean = false;

    constructor(
        private memoryManager: MemoryManager,
        private apiOrchestrator: APIOrchestrator,
        private analyticsService: AnalyticsService
    ) {
        this.logger = new Logger('CommandHandler');
        this.startTime = new Date();
    }

    async handleCommand(interaction: ChatInputCommandInteraction) {
        if (this.isPaused && interaction.commandName !== 'resume') {
            await interaction.reply({
                content: 'Bot is currently paused. Only admins can resume operations.',
                ephemeral: true
            });
            return;
        }

        const { commandName } = interaction;

        switch (commandName) {
            case 'optin':
                await this.handleOptIn(interaction);
                break;
            case 'optout':
                await this.handleOptOut(interaction);
                break;
            case 'memory':
                await this.handleMemory(interaction);
                break;
            case 'data':
                await this.handleData(interaction);
                break;
            case 'settings':
                await this.handleSettings(interaction);
                break;
            case 'ping':
                await this.handlePing(interaction);
                break;
            case 'uptime':
                await this.handleUptime(interaction);
                break;
            case 'status':
                await this.handleStatus(interaction);
                break;
            case 'stats':
                await this.handleStats(interaction);
                break;
            case 'model':
                await this.handleModel(interaction);
                break;
            case 'feedback':
                await this.handleFeedback(interaction);
                break;
            case 'bugreport':
                await this.handleBugReport(interaction);
                break;
            case 'debug':
                await this.handleDebug(interaction);
                break;
            case 'audit':
                await this.handleAudit(interaction);
                break;
            case 'pause':
                await this.handlePause(interaction);
                break;
            case 'resume':
                await this.handleResume(interaction);
                break;
            case 'broadcast':
                await this.handleBroadcast(interaction);
                break;
            case 'vault':
                await this.handleVault(interaction);
                break;
            default:
                await interaction.reply({
                    content: 'Unknown command',
                    ephemeral: true
                });
        }
    }

    private async handleOptIn(interaction: ChatInputCommandInteraction) {
        const feature = interaction.options.getString('feature', true);
        const userId = interaction.user.id;

        // Store user preference
        await this.analyticsService.updateUserPreference(userId, feature, true);

        await interaction.reply({
            content: `✅ You have opted in to **${feature}**`,
            ephemeral: true
        });
    }

    private async handleOptOut(interaction: ChatInputCommandInteraction) {
        const feature = interaction.options.getString('feature', true);
        const userId = interaction.user.id;

        // Store user preference
        await this.analyticsService.updateUserPreference(userId, feature, false);

        await interaction.reply({
            content: `❌ You have opted out of **${feature}**`,
            ephemeral: true
        });
    }

    private async handleMemory(interaction: ChatInputCommandInteraction) {
        const action = interaction.options.getString('action', true);
        const tier = interaction.options.getString('tier') as any;
        const index = interaction.options.getInteger('index');

        switch (action) {
            case 'status':
                const status = await this.memoryManager.getMemoryStatus();
                const embed = new EmbedBuilder()
                    .setTitle('Memory Status')
                    .setColor(0x0099ff)
                    .addFields(
                        Object.entries(status).map(([tierName, stats]) => ({
                            name: tierName.charAt(0).toUpperCase() + tierName.slice(1),
                            value: `Entries: ${stats.entries}\nKeys: ${stats.keys}`,
                            inline: true
                        }))
                    );
                await interaction.reply({ embeds: [embed] });
                break;

            case 'preview':
                if (!tier) {
                    await interaction.reply({
                        content: 'Please specify a memory tier to preview',
                        ephemeral: true
                    });
                    return;
                }
                
                const key = tier === 'contextual' ? interaction.channelId : interaction.user.id;
                const memories = await this.memoryManager.getMemory(tier, key, 5);
                
                if (memories.length === 0) {
                    await interaction.reply({
                        content: `No memories found in ${tier} tier`,
                        ephemeral: true
                    });
                    return;
                }

                const memoryList = memories.map((m, i) => 
                    `**${i + 1}.** ${JSON.stringify(m.data).substring(0, 100)}...`
                ).join('\n');

                await interaction.reply({
                    content: `**${tier} Memory Preview:**\n${memoryList}`,
                    ephemeral: true
                });
                break;

            case 'clear':
                if (!tier) {
                    await interaction.reply({
                        content: 'Please specify a memory tier to clear',
                        ephemeral: true
                    });
                    return;
                }

                const clearKey = tier === 'contextual' ? interaction.channelId : interaction.user.id;
                await this.memoryManager.clearMemory(tier, clearKey);
                
                await interaction.reply({
                    content: `✅ Cleared ${tier} memory`,
                    ephemeral: true
                });
                break;

            case 'remove':
                if (!tier || index === null) {
                    await interaction.reply({
                        content: 'Please specify both tier and index',
                        ephemeral: true
                    });
                    return;
                }

                const removeKey = tier === 'contextual' ? interaction.channelId : interaction.user.id;
                try {
                    await this.memoryManager.removeMemoryEntry(tier, removeKey, index);
                    await interaction.reply({
                        content: `✅ Removed entry at index ${index} from ${tier} memory`,
                        ephemeral: true
                    });
                } catch (error) {
                    await interaction.reply({
                        content: `❌ Failed to remove entry: ${error}`,
                        ephemeral: true
                    });
                }
                break;
        }
    }

    private async handleData(interaction: ChatInputCommandInteraction) {
        const action = interaction.options.getString('action', true);
        const userId = interaction.user.id;

        switch (action) {
            case 'export':
                const userData = await this.memoryManager.exportUserData(userId);
                
                // Create a JSON file and send it
                const dataStr = JSON.stringify(userData, null, 2);
                const buffer = Buffer.from(dataStr, 'utf-8');
                
                await interaction.reply({
                    content: 'Here is your exported data:',
                    files: [{
                        attachment: buffer,
                        name: `user_data_${userId}_${Date.now()}.json`
                    }],
                    ephemeral: true
                });
                break;

            case 'delete':
                // Clear all user data
                await this.memoryManager.clearMemory('personality', userId);
                await this.memoryManager.clearMemory('individual', userId);
                
                await interaction.reply({
                    content: '✅ All your data has been deleted',
                    ephemeral: true
                });
                break;
        }
    }

    private async handlePing(interaction: ChatInputCommandInteraction) {
        const ping = Date.now() - interaction.createdTimestamp;
        await interaction.reply(`🏓 Pong! Latency: ${ping}ms`);
    }

    private async handleUptime(interaction: ChatInputCommandInteraction) {
        const uptime = Date.now() - this.startTime.getTime();
        const days = Math.floor(uptime / (1000 * 60 * 60 * 24));
        const hours = Math.floor((uptime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));
        
        await interaction.reply(`⏰ Uptime: ${days}d ${hours}h ${minutes}m`);
    }

    private async handleStatus(interaction: ChatInputCommandInteraction) {
        const memoryStatus = await this.memoryManager.getMemoryStatus();
        const providerStats = await this.apiOrchestrator.getProviderStats();
        
        const embed = new EmbedBuilder()
            .setTitle('Bot Status')
            .setColor(0x00ff00)
            .addFields(
                { name: 'Status', value: this.isPaused ? '⏸️ Paused' : '✅ Active', inline: true },
                { name: 'Servers', value: interaction.client.guilds.cache.size.toString(), inline: true },
                { name: 'Users', value: interaction.client.users.cache.size.toString(), inline: true },
                { name: 'Memory Usage', value: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`, inline: true },
                { name: 'Active Providers', value: providerStats.filter(p => p.available).length.toString(), inline: true }
            );
        
        await interaction.reply({ embeds: [embed] });
    }

    private async handleStats(interaction: ChatInputCommandInteraction) {
        const stats = await this.analyticsService.getStats();
        
        const embed = new EmbedBuilder()
            .setTitle('Bot Statistics')
            .setColor(0x0099ff)
            .addFields(
                { name: 'Total Commands', value: stats.totalCommands.toString(), inline: true },
                { name: 'Unique Users', value: stats.uniqueUsers.toString(), inline: true },
                { name: 'Messages Processed', value: stats.messagesProcessed.toString(), inline: true },
                { name: 'AI Generations', value: stats.aiGenerations.toString(), inline: true },
                { name: 'Average Response Time', value: `${stats.avgResponseTime}ms`, inline: true },
                { name: 'Uptime %', value: `${stats.uptimePercentage}%`, inline: true }
            );
        
        await interaction.reply({ embeds: [embed] });
    }

    private async handleModel(interaction: ChatInputCommandInteraction) {
        const action = interaction.options.getString('action', true);
        
        switch (action) {
            case 'list':
                const providers = await this.apiOrchestrator.getProviderStats();
                const list = providers.map(p => 
                    `• **${p.name}** (${p.type}) - ${p.available ? '✅ Available' : '❌ Unavailable'}`
                ).join('\n');
                
                await interaction.reply({
                    content: `**Available Models:**\n${list}`,
                    ephemeral: true
                });
                break;

            case 'switch':
                const modelName = interaction.options.getString('model_name');
                if (!modelName) {
                    await interaction.reply({
                        content: 'Please specify a model name',
                        ephemeral: true
                    });
                    return;
                }
                
                await this.apiOrchestrator.switchModel(modelName);
                await interaction.reply({
                    content: `✅ Switched to model: ${modelName}`,
                    ephemeral: true
                });
                break;
        }
    }

    private async handleSettings(interaction: ChatInputCommandInteraction) {
        // This would be more complex in a real implementation
        await interaction.reply({
            content: 'Settings command is under development',
            ephemeral: true
        });
    }

    private async handleFeedback(interaction: ChatInputCommandInteraction) {
        const message = interaction.options.getString('message', true);
        
        // Log feedback
        this.logger.info('User feedback received:', {
            userId: interaction.user.id,
            message
        });
        
        await interaction.reply({
            content: '✅ Thank you for your feedback!',
            ephemeral: true
        });
    }

    private async handleBugReport(interaction: ChatInputCommandInteraction) {
        const description = interaction.options.getString('description', true);
        const screenshot = interaction.options.getString('screenshot_url');
        
        // Log bug report
        this.logger.error('Bug report received:', {
            userId: interaction.user.id,
            description,
            screenshot
        });
        
        await interaction.reply({
            content: '✅ Bug report submitted. Thank you for helping improve the bot!',
            ephemeral: true
        });
    }

    private async handleDebug(interaction: ChatInputCommandInteraction) {
        // Check admin permission
        if (!this.isAdmin(interaction.user.id)) {
            await interaction.reply({
                content: 'This command requires administrator permissions',
                ephemeral: true
            });
            return;
        }

        const debugInfo = {
            memoryStatus: await this.memoryManager.getMemoryStatus(),
            providers: await this.apiOrchestrator.getProviderStats(),
            uptime: Date.now() - this.startTime.getTime(),
            memoryUsage: process.memoryUsage()
        };

        await interaction.reply({
            content: `\`\`\`json\n${JSON.stringify(debugInfo, null, 2)}\n\`\`\``,
            ephemeral: true
        });
    }

    private async handleAudit(interaction: ChatInputCommandInteraction) {
        // Check admin permission
        if (!this.isAdmin(interaction.user.id)) {
            await interaction.reply({
                content: 'This command requires administrator permissions',
                ephemeral: true
            });
            return;
        }

        const userId = interaction.options.getString('user_id', true);
        const limit = interaction.options.getInteger('limit') || 10;

        const userData = await this.memoryManager.exportUserData(userId);
        const analysis = await this.memoryManager.analyzeUserPersonality(userId);

        await interaction.reply({
            content: `**Audit for user ${userId}:**\n\`\`\`json\n${JSON.stringify(analysis, null, 2)}\n\`\`\``,
            ephemeral: true
        });
    }

    private async handlePause(interaction: ChatInputCommandInteraction) {
        if (!this.isAdmin(interaction.user.id)) {
            await interaction.reply({
                content: 'This command requires administrator permissions',
                ephemeral: true
            });
            return;
        }

        this.isPaused = true;
        await interaction.reply('⏸️ Bot operations paused');
    }

    private async handleResume(interaction: ChatInputCommandInteraction) {
        if (!this.isAdmin(interaction.user.id)) {
            await interaction.reply({
                content: 'This command requires administrator permissions',
                ephemeral: true
            });
            return;
        }

        this.isPaused = false;
        await interaction.reply('▶️ Bot operations resumed');
    }

    private async handleBroadcast(interaction: ChatInputCommandInteraction) {
        if (!this.isAdmin(interaction.user.id)) {
            await interaction.reply({
                content: 'This command requires administrator permissions',
                ephemeral: true
            });
            return;
        }

        const message = interaction.options.getString('message', true);
        
        // This would broadcast to all servers in a real implementation
        await interaction.reply({
            content: `📢 Broadcast queued: "${message}"`,
            ephemeral: true
        });
    }

    private async handleVault(interaction: ChatInputCommandInteraction) {
        // Placeholder for vault functionality
        await interaction.reply({
            content: '🔐 Vault Status: Secure\n\nVault functionality coming soon!',
            ephemeral: true
        });
    }

    private isAdmin(userId: string): boolean {
        // In a real implementation, this would check against a list of admin IDs
        // or check Discord permissions
        return process.env.ADMIN_IDS?.split(',').includes(userId) || false;
    }
}