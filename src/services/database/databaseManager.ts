// src/services/database/databaseManager.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { MongoClient, Db, Collection } from 'mongodb';
import { config } from '../../config/config';
import { Logger } from '../../utils/logger';
import { MemoryEntry, MemoryTier } from '../memory/memoryManager';

export class DatabaseManager {
    private supabase: SupabaseClient | null = null;
    private mongoClient: MongoClient | null = null;
    private mongodb: Db | null = null;
    private logger: Logger;

    // Collections
    private memoriesCollection: Collection | null = null;
    private analyticsCollection: Collection | null = null;
    private preferencesCollection: Collection | null = null;

    constructor() {
        this.logger = new Logger('DatabaseManager');
    }

    async connect() {
        try {
            // Connect to Supabase if configured
            if (config.database.supabase.url && config.database.supabase.anonKey) {
                this.supabase = createClient(
                    config.database.supabase.url,
                    config.database.supabase.anonKey
                );
                this.logger.info('Connected to Supabase');
            }

            // Connect to MongoDB
            this.mongoClient = new MongoClient(config.database.mongodb.uri);
            await this.mongoClient.connect();
            this.mongodb = this.mongoClient.db('discord-bot');
            
            // Initialize collections
            this.memoriesCollection = this.mongodb.collection('memories');
            this.analyticsCollection = this.mongodb.collection('analytics');
            this.preferencesCollection = this.mongodb.collection('preferences');
            
            // Create indexes
            await this.createIndexes();
            
            this.logger.info('Connected to MongoDB');
        } catch (error) {
            this.logger.error('Database connection failed:', error);
            throw error;
        }
    }

    private async createIndexes() {
        if (!this.memoriesCollection || !this.analyticsCollection || !this.preferencesCollection) {
            return;
        }

        // Memory indexes
        await this.memoriesCollection.createIndex({ tier: 1, key: 1 });
        await this.memoriesCollection.createIndex({ 'entry.timestamp': -1 });
        
        // Analytics indexes
        await this.analyticsCollection.createIndex({ eventType: 1 });
        await this.analyticsCollection.createIndex({ timestamp: -1 });
        await this.analyticsCollection.createIndex({ userId: 1 });
        
        // Preferences indexes
        await this.preferencesCollection.createIndex({ userId: 1 });
    }

    // Memory operations
    async saveMemory(tier: MemoryTier, key: string, entry: MemoryEntry) {
        if (!this.memoriesCollection) {
            throw new Error('Database not connected');
        }

        await this.memoriesCollection.insertOne({
            tier,
            key,
            entry,
            createdAt: new Date()
        });

        // Also save to Supabase if available
        if (this.supabase) {
            try {
                await this.supabase.from('memories').insert({
                    tier,
                    key,
                    entry_data: entry,
                    created_at: new Date().toISOString()
                });
            } catch (error) {
                this.logger.warn('Failed to save to Supabase:', error);
            }
        }
    }

    async loadAllMemories(): Promise<any[]> {
        if (!this.memoriesCollection) {
            return [];
        }

        const memories = await this.memoriesCollection
            .find({})
            .sort({ 'entry.timestamp': 1 })
            .toArray();

        return memories;
    }

    async deleteMemory(tier: MemoryTier, key: string) {
        if (!this.memoriesCollection) {
            throw new Error('Database not connected');
        }

        await this.memoriesCollection.deleteMany({ tier, key });

        if (this.supabase) {
            try {
                await this.supabase
                    .from('memories')
                    .delete()
                    .match({ tier, key });
            } catch (error) {
                this.logger.warn('Failed to delete from Supabase:', error);
            }
        }
    }

    async deleteMemoryEntry(tier: MemoryTier, key: string, entryId: string) {
        if (!this.memoriesCollection) {
            throw new Error('Database not connected');
        }

        await this.memoriesCollection.deleteOne({
            tier,
            key,
            'entry.id': entryId
        });

        if (this.supabase) {
            try {
                await this.supabase
                    .from('memories')
                    .delete()
                    .match({ tier, key, 'entry_data.id': entryId });
            } catch (error) {
                this.logger.warn('Failed to delete from Supabase:', error);
            }
        }
    }

    async clearMemoryTier(tier: MemoryTier) {
        if (!this.memoriesCollection) {
            throw new Error('Database not connected');
        }

        await this.memoriesCollection.deleteMany({ tier });

        if (this.supabase) {
            try {
                await this.supabase
                    .from('memories')
                    .delete()
                    .match({ tier });
            } catch (error) {
                this.logger.warn('Failed to clear from Supabase:', error);
            }
        }
    }

    // Analytics operations
    async logEvent(eventType: string, data: any) {
        if (!this.analyticsCollection) {
            return;
        }

        await this.analyticsCollection.insertOne({
            eventType,
            data,
            timestamp: new Date()
        });

        if (this.supabase) {
            try {
                await this.supabase.from('analytics').insert({
                    event_type: eventType,
                    event_data: data,
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                this.logger.warn('Failed to log to Supabase:', error);
            }
        }
    }

    async getAnalytics(filter: any = {}, limit: number = 100): Promise<any[]> {
        if (!this.analyticsCollection) {
            return [];
        }

        return await this.analyticsCollection
            .find(filter)
            .sort({ timestamp: -1 })
            .limit(limit)
            .toArray();
    }

    // User preferences
    async saveUserPreference(userId: string, preference: string, value: any) {
        if (!this.preferencesCollection) {
            return;
        }

        await this.preferencesCollection.updateOne(
            { userId },
            { 
                $set: { 
                    [`preferences.${preference}`]: value,
                    updatedAt: new Date()
                } 
            },
            { upsert: true }
        );

        if (this.supabase) {
            try {
                await this.supabase.from('user_preferences').upsert({
                    user_id: userId,
                    preference,
                    value,
                    updated_at: new Date().toISOString()
                });
            } catch (error) {
                this.logger.warn('Failed to save preference to Supabase:', error);
            }
        }
    }

    async getUserPreferences(userId: string): Promise<any> {
        if (!this.preferencesCollection) {
            return {};
        }

        const doc = await this.preferencesCollection.findOne({ userId });
        return doc?.preferences || {};
    }

    // Stats aggregation
    async getStats(): Promise<any> {
        if (!this.analyticsCollection) {
            return {
                totalCommands: 0,
                uniqueUsers: 0,
                messagesProcessed: 0,
                aiGenerations: 0,
                avgResponseTime: 0,
                uptimePercentage: 100
            };
        }

        const [
            totalCommands,
            uniqueUsers,
            messagesProcessed,
            aiGenerations
        ] = await Promise.all([
            this.analyticsCollection.countDocuments({ eventType: 'command_executed' }),
            this.analyticsCollection.distinct('data.user').then(users => users.length),
            this.analyticsCollection.countDocuments({ eventType: 'message_received' }),
            this.analyticsCollection.countDocuments({ eventType: 'ai_generation' })
        ]);

        // Calculate average response time
        const responseTimes = await this.analyticsCollection
            .find({ eventType: 'response_time' })
            .toArray();
        
        const avgResponseTime = responseTimes.length > 0
            ? responseTimes.reduce((sum, r) => sum + r.data.time, 0) / responseTimes.length
            : 0;

        return {
            totalCommands,
            uniqueUsers,
            messagesProcessed,
            aiGenerations,
            avgResponseTime: Math.round(avgResponseTime),
            uptimePercentage: 99.9 // This would be calculated from actual uptime data
        };
    }

    async disconnect() {
        if (this.mongoClient) {
            await this.mongoClient.close();
        }
        this.logger.info('Database connections closed');
    }
}