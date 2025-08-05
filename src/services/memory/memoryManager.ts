// src/services/memory/memoryManager.ts
import { DatabaseManager } from '../database/databaseManager';
import { Logger } from '../../utils/logger';
import { config } from '../../config/config';

export interface MemoryEntry {
    id: string;
    data: any;
    timestamp: Date;
    metadata?: Record<string, any>;
}

export type MemoryTier = 'contextual' | 'personality' | 'individual' | 'connections';

export class MemoryManager {
    private memories: Map<MemoryTier, Map<string, MemoryEntry[]>>;
    private logger: Logger;
    private maxEntries = config.memory.maxEntries;

    constructor(private databaseManager: DatabaseManager) {
        this.logger = new Logger('MemoryManager');
        this.memories = new Map([
            ['contextual', new Map()],
            ['personality', new Map()],
            ['individual', new Map()],
            ['connections', new Map()]
        ]);
    }

    async initialize() {
        try {
            // Load persisted memories from database
            await this.loadPersistedMemories();
            this.logger.info('Memory manager initialized');
        } catch (error) {
            this.logger.error('Failed to initialize memory manager:', error);
        }
    }

    async updateContextualMemory(channelId: string, data: any) {
        await this.addMemory('contextual', channelId, data);
    }

    async updatePersonalityMemory(userId: string, trait: any) {
        await this.addMemory('personality', userId, trait);
    }

    async updateIndividualMemory(userId: string, interaction: any) {
        await this.addMemory('individual', userId, interaction);
    }

    async updateConnectionsMemory(connectionId: string, linkData: any) {
        await this.addMemory('connections', connectionId, linkData);
    }

    private async addMemory(tier: MemoryTier, key: string, data: any) {
        const tierMemory = this.memories.get(tier)!;
        
        if (!tierMemory.has(key)) {
            tierMemory.set(key, []);
        }

        const entries = tierMemory.get(key)!;
        const entry: MemoryEntry = {
            id: this.generateId(),
            data,
            timestamp: new Date()
        };

        entries.push(entry);

        // Apply FIFO eviction if needed
        if (entries.length > this.maxEntries) {
            const removed = entries.shift();
            this.logger.debug(`Evicted memory entry from ${tier}:${key}`, removed);
        }

        // Persist to database
        await this.persistMemory(tier, key, entry);
    }

    async getMemory(tier: MemoryTier, key: string, limit?: number): Promise<MemoryEntry[]> {
        const tierMemory = this.memories.get(tier)!;
        const entries = tierMemory.get(key) || [];
        
        if (limit) {
            return entries.slice(-limit);
        }
        
        return entries;
    }

    async clearMemory(tier: MemoryTier, key?: string) {
        const tierMemory = this.memories.get(tier)!;
        
        if (key) {
            tierMemory.delete(key);
            await this.databaseManager.deleteMemory(tier, key);
        } else {
            tierMemory.clear();
            await this.databaseManager.clearMemoryTier(tier);
        }
        
        this.logger.info(`Cleared memory for ${tier}${key ? `:${key}` : ''}`);
    }

    async removeMemoryEntry(tier: MemoryTier, key: string, index: number) {
        const tierMemory = this.memories.get(tier)!;
        const entries = tierMemory.get(key);
        
        if (!entries || index < 0 || index >= entries.length) {
            throw new Error('Invalid memory index');
        }
        
        const removed = entries.splice(index, 1)[0];
        await this.databaseManager.deleteMemoryEntry(tier, key, removed.id);
        
        return removed;
    }

    async getMemoryStatus(): Promise<Record<MemoryTier, { entries: number; keys: number }>> {
        const status: any = {};
        
        for (const [tier, tierMemory] of this.memories.entries()) {
            let totalEntries = 0;
            for (const entries of tierMemory.values()) {
                totalEntries += entries.length;
            }
            
            status[tier] = {
                entries: totalEntries,
                keys: tierMemory.size
            };
        }
        
        return status;
    }

    async exportUserData(userId: string): Promise<any> {
        const userData: any = {
            contextual: [],
            personality: await this.getMemory('personality', userId),
            individual: await this.getMemory('individual', userId),
            connections: []
        };

        // Get contextual memories where user participated
        for (const [channelId, entries] of this.memories.get('contextual')!) {
            const userEntries = entries.filter(e => e.data.userId === userId);
            if (userEntries.length > 0) {
                userData.contextual.push({ channelId, entries: userEntries });
            }
        }

        // Get connections involving the user
        for (const [connectionId, entries] of this.memories.get('connections')!) {
            if (connectionId.includes(userId)) {
                userData.connections.push({ connectionId, entries });
            }
        }

        return userData;
    }

    private async loadPersistedMemories() {
        const memories = await this.databaseManager.loadAllMemories();
        
        for (const memory of memories) {
            const tierMemory = this.memories.get(memory.tier as MemoryTier);
            if (tierMemory) {
                if (!tierMemory.has(memory.key)) {
                    tierMemory.set(memory.key, []);
                }
                tierMemory.get(memory.key)!.push(memory.entry);
            }
        }
    }

    private async persistMemory(tier: MemoryTier, key: string, entry: MemoryEntry) {
        try {
            await this.databaseManager.saveMemory(tier, key, entry);
        } catch (error) {
            this.logger.error(`Failed to persist memory to database:`, error);
        }
    }

    private generateId(): string {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    // Advanced memory analysis methods
    async analyzeUserPersonality(userId: string): Promise<any> {
        const personality = await this.getMemory('personality', userId);
        const individual = await this.getMemory('individual', userId);
        
        // Aggregate personality traits and interaction patterns
        const analysis = {
            dominantTraits: this.extractDominantTraits(personality),
            interactionFrequency: this.calculateInteractionFrequency(individual),
            preferredTopics: this.extractPreferredTopics(individual),
            sentimentTrend: this.analyzeSentimentTrend(individual)
        };
        
        return analysis;
    }

    private extractDominantTraits(personality: MemoryEntry[]): string[] {
        const traitCounts = new Map<string, number>();
        
        for (const entry of personality) {
            if (entry.data.trait) {
                const count = traitCounts.get(entry.data.trait) || 0;
                traitCounts.set(entry.data.trait, count + 1);
            }
        }
        
        return Array.from(traitCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([trait]) => trait);
    }

    private calculateInteractionFrequency(interactions: MemoryEntry[]): number {
        if (interactions.length === 0) return 0;
        
        const firstInteraction = interactions[0].timestamp;
        const lastInteraction = interactions[interactions.length - 1].timestamp;
        const daysDiff = (lastInteraction.getTime() - firstInteraction.getTime()) / (1000 * 60 * 60 * 24);
        
        return interactions.length / (daysDiff || 1);
    }

    private extractPreferredTopics(interactions: MemoryEntry[]): string[] {
        // This would involve NLP analysis in a real implementation
        // For now, return placeholder
        return ['general', 'support', 'fun'];
    }

    private analyzeSentimentTrend(interactions: MemoryEntry[]): string {
        // This would involve sentiment analysis in a real implementation
        return 'positive';
    }
}