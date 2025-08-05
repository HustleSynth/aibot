// src/utils/logger.ts
import winston from 'winston';
import { config } from '../config/config';

export class Logger {
    private logger: winston.Logger;

    constructor(context: string) {
        this.logger = winston.createLogger({
            level: config.logging.level,
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.errors({ stack: true }),
                winston.format.json()
            ),
            defaultMeta: { service: 'discord-bot', context },
            transports: [
                new winston.transports.Console({
                    format: winston.format.combine(
                        winston.format.colorize(),
                        winston.format.simple()
                    )
                }),
                new winston.transports.File({ 
                    filename: 'logs/error.log', 
                    level: 'error' 
                }),
                new winston.transports.File({ 
                    filename: 'logs/combined.log' 
                })
            ]
        });
    }

    info(message: string, meta?: any) {
        this.logger.info(message, meta);
    }

    error(message: string, error?: any) {
        this.logger.error(message, error);
    }

    warn(message: string, meta?: any) {
        this.logger.warn(message, meta);
    }

    debug(message: string, meta?: any) {
        this.logger.debug(message, meta);
    }
}

// src/services/analytics/analyticsService.ts
import { DatabaseManager } from '../database/databaseManager';
import { Logger } from '../../utils/logger';

export class AnalyticsService {
    private logger: Logger;

    constructor(private databaseManager: DatabaseManager) {
        this.logger = new Logger('AnalyticsService');
    }

    async trackEvent(eventType: string, data: any) {
        try {
            await this.databaseManager.logEvent(eventType, {
                ...data,
                timestamp: new Date()
            });
        } catch (error) {
            this.logger.error('Failed to track event:', error);
        }
    }

    async trackResponseTime(commandName: string, responseTime: number) {
        await this.trackEvent('response_time', {
            command: commandName,
            time: responseTime
        });
    }

    async trackAIGeneration(provider: string, type: string, latency: number) {
        await this.trackEvent('ai_generation', {
            provider,
            type,
            latency
        });
    }

    async updateUserPreference(userId: string, preference: string, value: any) {
        await this.databaseManager.saveUserPreference(userId, preference, value);
        await this.trackEvent('preference_updated', {
            userId,
            preference,
            value
        });
    }

    async getUserPreferences(userId: string): Promise<any> {
        return await this.databaseManager.getUserPreferences(userId);
    }

    async getStats(): Promise<any> {
        return await this.databaseManager.getStats();
    }

    async generateReport(startDate: Date, endDate: Date): Promise<any> {
        const events = await this.databaseManager.getAnalytics({
            timestamp: {
                $gte: startDate,
                $lte: endDate
            }
        });

        // Aggregate data
        const report = {
            period: {
                start: startDate,
                end: endDate
            },
            totalEvents: events.length,
            eventsByType: this.groupByType(events),
            userActivity: this.analyzeUserActivity(events),
            aiUsage: this.analyzeAIUsage(events),
            performance: this.analyzePerformance(events)
        };

        return report;
    }

    private groupByType(events: any[]): Record<string, number> {
        const grouped: Record<string, number> = {};
        
        for (const event of events) {
            grouped[event.eventType] = (grouped[event.eventType] || 0) + 1;
        }
        
        return grouped;
    }

    private analyzeUserActivity(events: any[]): any {
        const userEvents = events.filter(e => e.data?.userId);
        const uniqueUsers = new Set(userEvents.map(e => e.data.userId));
        
        return {
            uniqueUsers: uniqueUsers.size,
            totalInteractions: userEvents.length,
            averageInteractionsPerUser: userEvents.length / uniqueUsers.size
        };
    }

    private analyzeAIUsage(events: any[]): any {
        const aiEvents = events.filter(e => e.eventType === 'ai_generation');
        const byProvider: Record<string, number> = {};
        let totalLatency = 0;
        
        for (const event of aiEvents) {
            byProvider[event.data.provider] = (byProvider[event.data.provider] || 0) + 1;
            totalLatency += event.data.latency || 0;
        }
        
        return {
            totalGenerations: aiEvents.length,
            byProvider,
            averageLatency: aiEvents.length > 0 ? totalLatency / aiEvents.length : 0
        };
    }

    private analyzePerformance(events: any[]): any {
        const responseEvents = events.filter(e => e.eventType === 'response_time');
        let totalTime = 0;
        
        for (const event of responseEvents) {
            totalTime += event.data.time || 0;
        }
        
        return {
            averageResponseTime: responseEvents.length > 0 ? totalTime / responseEvents.length : 0,
            totalResponses: responseEvents.length
        };
    }
}

// src/utils/helpers.ts
export function sanitizeInput(input: string): string {
    // Remove potentially harmful characters
    return input.replace(/[<>]/g, '');
}

export function truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
}

export function formatBytes(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

export function formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
}

export async function retry<T>(
    fn: () => Promise<T>,
    maxAttempts: number = 3,
    delay: number = 1000
): Promise<T> {
    let lastError: any;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            if (attempt < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, delay * attempt));
            }
        }
    }
    
    throw lastError;
}