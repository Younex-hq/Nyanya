import Dexie, { type Table } from 'dexie';
import type { Session, Tag } from '../models/types.ts';

export class PomodoroDB extends Dexie {
    sessions!: Table<Session, number>;
    tags!: Table<Tag, number>;

    constructor() {
        super('PomodoroDB');
        this.version(1).stores({
            sessions: '++id, label, is_break, end, archived',
            tags: '++id, name, color'
        });
    }
}

export const db = new PomodoroDB();

export class StorageService {
    static async initDefaults() {
        const count = await db.tags.count();
        if (count === 0) {
            await db.tags.bulkAdd([
                { name: 'Study', color: '#4CAF50', focusTime: 25, breakTime: 5, longBreakTime: 15, sessionsBeforeLongBreak: 4 },
                { name: 'onLaptop', color: '#2196F3', focusTime: 30, breakTime: 5, longBreakTime: 20, sessionsBeforeLongBreak: 3 },
            ]);
        }
    }

    static async getTags(): Promise<Tag[]> {
        return await db.tags.toArray();
    }

    static async getTagByName(name: string): Promise<Tag | undefined> {
        return await db.tags.where('name').equals(name).first();
    }

    static async saveTag(tag: Tag): Promise<number | undefined> {
        if (tag.id) {
            await db.tags.update(tag.id, tag);
            return tag.id;
        } else {
            return await db.tags.add(tag);
        }
    }

    static async deleteTag(id: number): Promise<void> {
        await db.tags.delete(id);
    }

    static async saveSession(session: Session): Promise<number | undefined> {
        if (session.id) {
            await db.sessions.update(session.id, session);
            return session.id;
        } else {
            return await db.sessions.add(session);
        }
    }
    
    static async updateSession(id: number, modifications: Partial<Session>): Promise<void> {
        await db.sessions.update(id, modifications);
    }

    static async getSessions(): Promise<Session[]> {
        return await db.sessions.toArray();
    }

    static async exportData(tagsToExport?: string[]): Promise<void> {
        let sessions = await this.getSessions();
        if (tagsToExport && tagsToExport.length > 0) {
            sessions = sessions.filter(s => tagsToExport.includes(s.label));
        }

        const data = JSON.stringify(sessions.map(s => {
            const copy = { ...s };
            delete copy.id;
            return copy;
        }), null, 2);

        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pomodoro_export_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    static async importData(jsonData: string): Promise<void> {
        try {
            const data = JSON.parse(jsonData);
            if (Array.isArray(data)) {
                // Ensure some basic validation
                const validSessions = data.filter(s => s.end && s.label && typeof s.duration === 'number');
                await db.sessions.bulkAdd(validSessions);
            }
        } catch (e) {
            console.error('Failed to import data:', e);
            throw e;
        }
    }

    static async clearSessions(): Promise<void> {
        await db.sessions.clear();
    }
}
