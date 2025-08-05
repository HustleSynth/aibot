// src/commands/register.ts
import { SlashCommandBuilder } from 'discord.js';

export function registerCommands() {
    return [
        // Opt-in command
        new SlashCommandBuilder()
            .setName('optin')
            .setDescription('Opt-in to a feature')
            .addStringOption(option =>
                option.setName('feature')
                    .setDescription('Feature to opt into')
                    .setRequired(true)
                    .addChoices(
                        { name: 'Memory', value: 'memory' },
                        { name: 'Analytics', value: 'analytics' },
                        { name: 'Contextual Memory', value: 'contextual' },
                        { name: 'Personality Memory', value: 'personality' },
                        { name: 'Individual Memory', value: 'individual' },
                        { name: 'Connections Memory', value: 'connections' }
                    )
            ),

        // Opt-out command
        new SlashCommandBuilder()
            .setName('optout')
            .setDescription('Opt-out of a feature')
            .addStringOption(option =>
                option.setName('feature')
                    .setDescription('Feature to opt out of')
                    .setRequired(true)
                    .addChoices(
                        { name: 'Memory', value: 'memory' },
                        { name: 'Analytics', value: 'analytics' },
                        { name: 'Contextual Memory', value: 'contextual' },
                        { name: 'Personality Memory', value: 'personality' },
                        { name: 'Individual Memory', value: 'individual' },
                        { name: 'Connections Memory', value: 'connections' }
                    )
            ),

        // Memory command
        new SlashCommandBuilder()
            .setName('memory')
            .setDescription('Manage memory')
            .addStringOption(option =>
                option.setName('action')
                    .setDescription('Action to perform')
                    .setRequired(true)
                    .addChoices(
                        { name: 'Status', value: 'status' },
                        { name: 'Preview', value: 'preview' },
                        { name: 'Clear', value: 'clear' },
                        { name: 'Remove', value: 'remove' }
                    )
            )
            .addStringOption(option =>
                option.setName('tier')
                    .setDescription('Memory tier')
                    .setRequired(false)
                    .addChoices(
                        { name: 'Contextual', value: 'contextual' },
                        { name: 'Personality', value: 'personality' },
                        { name: 'Individual', value: 'individual' },
                        { name: 'Connections', value: 'connections' }
                    )
            )
            .addIntegerOption(option =>
                option.setName('index')
                    .setDescription('Memory index to remove')
                    .setRequired(false)
            ),

        // Data command
        new SlashCommandBuilder()
            .setName('data')
            .setDescription('Manage your data')
            .addStringOption(option =>
                option.setName('action')
                    .setDescription('Action to perform')
                    .setRequired(true)
                    .addChoices(
                        { name: 'Export', value: 'export' },
                        { name: 'Delete', value: 'delete' }
                    )
            ),

        // Settings command
        new SlashCommandBuilder()
            .setName('settings')
            .setDescription('Update bot settings')
            .addStringOption(option =>
                option.setName('option')
                    .setDescription('Setting to change')
                    .setRequired(true)
            )
            .addStringOption(option =>
                option.setName('value')
                    .setDescription('New value')
                    .setRequired(true)
            ),

        // Ping command
        new SlashCommandBuilder()
            .setName('ping')
            .setDescription('Check bot latency'),

        // Uptime command
        new SlashCommandBuilder()
            .setName('uptime')
            .setDescription('Check bot uptime'),

        // Status command
        new SlashCommandBuilder()
            .setName('status')
            .setDescription('Check bot status'),

        // Stats command
        new SlashCommandBuilder()
            .setName('stats')
            .setDescription('View bot statistics'),

        // Model command
        new SlashCommandBuilder()
            .setName('model')
            .setDescription('Manage AI models')
            .addStringOption(option =>
                option.setName('action')
                    .setDescription('Action to perform')
                    .setRequired(true)
                    .addChoices(
                        { name: 'List', value: 'list' },
                        { name: 'Switch', value: 'switch' }
                    )
            )
            .addStringOption(option =>
                option.setName('model_name')
                    .setDescription('Model name (for switch action)')
                    .setRequired(false)
            ),

        // Feedback command
        new SlashCommandBuilder()
            .setName('feedback')
            .setDescription('Send feedback')
            .addStringOption(option =>
                option.setName('message')
                    .setDescription('Your feedback')
                    .setRequired(true)
            ),

        // Bug report command
        new SlashCommandBuilder()
            .setName('bugreport')
            .setDescription('Report a bug')
            .addStringOption(option =>
                option.setName('description')
                    .setDescription('Bug description')
                    .setRequired(true)
            )
            .addStringOption(option =>
                option.setName('screenshot_url')
                    .setDescription('Screenshot URL (optional)')
                    .setRequired(false)
            ),

        // Debug command (admin only)
        new SlashCommandBuilder()
            .setName('debug')
            .setDescription('Debug information (admin only)')
            .addIntegerOption(option =>
                option.setName('limit')
                    .setDescription('Number of entries to show')
                    .setRequired(false)
            ),

        // Audit command (admin only)
        new SlashCommandBuilder()
            .setName('audit')
            .setDescription('Audit user activity (admin only)')
            .addStringOption(option =>
                option.setName('user_id')
                    .setDescription('User ID to audit')
                    .setRequired(true)
            )
            .addIntegerOption(option =>
                option.setName('limit')
                    .setDescription('Number of entries')
                    .setRequired(false)
            ),

        // Pause command (admin only)
        new SlashCommandBuilder()
            .setName('pause')
            .setDescription('Pause bot operations (admin only)'),

        // Resume command (admin only)
        new SlashCommandBuilder()
            .setName('resume')
            .setDescription('Resume bot operations (admin only)'),

        // Broadcast command (admin only)
        new SlashCommandBuilder()
            .setName('broadcast')
            .setDescription('Broadcast message to all servers (admin only)')
            .addStringOption(option =>
                option.setName('message')
                    .setDescription('Message to broadcast')
                    .setRequired(true)
            ),

        // Vault command
        new SlashCommandBuilder()
            .setName('vault')
            .setDescription('Check vault status')
            .addStringOption(option =>
                option.setName('action')
                    .setDescription('Action to perform')
                    .setRequired(true)
                    .addChoices(
                        { name: 'Status', value: 'status' }
                    )
            )
    ].map(command => command.toJSON());
}