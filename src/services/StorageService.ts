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
                { name: 'Pomodoro', color: 'rgb(189, 226, 255)', focusTime: 25, breakTime: 5, longBreakTime: 15, sessionsBeforeLongBreak: 4 },
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
        let tags = await this.getTags();

        if (tagsToExport && tagsToExport.length > 0) {
            sessions = sessions.filter(s => tagsToExport.includes(s.label));
            tags = tags.filter(t => tagsToExport.includes(t.name));
        }

        const exportObj = {
            sessions: sessions.map(s => {
                const copy = { ...s };
                delete copy.id;
                return copy;
            }),
            tags: tags.map(t => {
                const copy = { ...t };
                delete copy.id;
                return copy;
            })
        };

        const data = JSON.stringify(exportObj, null, 2);

        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pomodoro_full_export_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    static async importData(jsonData: string): Promise<void> {
        try {
            const data = JSON.parse(jsonData);
            
            // Handle Old Format (Array of sessions)
            if (Array.isArray(data)) {
                const validSessions = data.filter(s => s.end && s.label && typeof s.duration === 'number');
                for (const s of validSessions) {
                    const existing = await db.sessions.where('end').equals(s.end).first();
                    if (existing) {
                        await db.sessions.delete(existing.id!);
                    }
                    delete s.id; // ensure we don't try to use an old ID
                    await db.sessions.add(s);
                }
                return;
            }

            // Handle New Format (Object with sessions and tags)
            if (data.sessions || data.tags) {
                if (data.tags && Array.isArray(data.tags)) {
                    for (const t of data.tags) {
                        const existing = await db.tags.where('name').equals(t.name).first();
                        if (existing) {
                            await db.tags.update(existing.id!, t);
                        } else {
                            delete t.id; // ensure we don't try to use an old ID
                            await db.tags.add(t);
                        }
                    }
                    
                    // Ensure "Pomodoro" tag is always present
                    const pomodoro = await db.tags.where('name').equals('Pomodoro').first();
                    if (!pomodoro) {
                        await db.tags.add({
                            name: 'Pomodoro',
                            color: 'rgb(189, 226, 255)',
                            focusTime: 25,
                            breakTime: 5,
                            longBreakTime: 15,
                            sessionsBeforeLongBreak: 4
                        });
                    }
                }

                if (data.sessions && Array.isArray(data.sessions)) {
                    for (const s of data.sessions) {
                        const existing = await db.sessions.where('end').equals(s.end).first();
                        if (existing) {
                            await db.sessions.delete(existing.id!);
                        }
                        delete s.id; // ensure we don't try to use an old ID
                        await db.sessions.add(s);
                    }
                }
            }
        } catch (e) {
            console.error('Failed to import data:', e);
            throw e;
        }
    }

    static async clearAllData(): Promise<void> {
        await db.sessions.clear();
        await db.tags.clear();
        await this.initDefaults();
    }
}
