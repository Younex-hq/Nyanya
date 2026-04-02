import type { Session } from '../models/types.ts';

export class StatisticsHelpers {
    static getTodaySessions(sessions: Session[]): Session[] {
        const todayStr = new Date().toISOString().split('T')[0];
        return sessions.filter(s => s.end.startsWith(todayStr));
    }

    static getFocusTimeMin(sessions: Session[]): number {
        return sessions.filter(s => !s.is_break).reduce((acc, s) => acc + s.duration, 0);
    }

    static getBreakTimeMin(sessions: Session[]): number {
        return sessions.filter(s => s.is_break).reduce((acc, s) => acc + s.duration, 0);
    }

    static getInterruptionsMin(sessions: Session[]): number {
        return sessions.reduce((acc, s) => acc + s.interruptions, 0);
    }

    static filterByRange(sessions: Session[], range: 'today' | 'week' | 'month' | 'total'): Session[] {
        const now = new Date();
        if (range === 'total') return sessions;

        return sessions.filter(s => {
            const date = new Date(s.end);
            const diffDays = (now.getTime() - date.getTime()) / (1000 * 3600 * 24);
            if (range === 'today') return diffDays < 1 && now.getDate() === date.getDate();
            if (range === 'week') return diffDays <= 7;
            if (range === 'month') return diffDays <= 30;
            return true;
        });
    }

    static groupByDayAndTag(sessions: Session[]): Record<string, Record<string, number>> {
        const grouped: Record<string, Record<string, number>> = {};
        for (const s of sessions) {
            if (s.is_break) continue;
            const day = s.end.split('T')[0];
            if (!grouped[day]) grouped[day] = {};
            if (!grouped[day][s.label]) grouped[day][s.label] = 0;
            grouped[day][s.label] += s.duration;
        }
        return grouped;
    }

    static getProductiveHoursVector(sessions: Session[], numHours = 24): {hour: number, duration: number, label: string}[] {
        const focusSessions = sessions.filter(s => !s.is_break);
        const map: { [hour: number]: { duration: number, label: string } } = {};
        for (const s of focusSessions) {
            const hour = new Date(s.end).getHours();
            if(!map[hour]) map[hour] = { duration: 0, label: s.label };
            map[hour].duration += s.duration;
        }
        
        return Array.from({length: numHours}).map((_, i) => ({
            hour: i,
            duration: map[i]?.duration || 0,
            label: map[i]?.label || ''
        }));
    }

    static formatDecimalMinutesToHHMMSS(decimalMinutes: number): string {
        const totalSeconds = Math.floor(decimalMinutes * 60);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        
        const mStr = minutes.toString().padStart(2, '0');
        const sStr = seconds.toString().padStart(2, '0');
        
        if (hours > 0) {
            return `${hours.toString().padStart(2, '0')}:${mStr}:${sStr}`;
        }
        return `${mStr}:${sStr}`;
    }

    static getYearlyFocusData(sessions: Session[]): Record<string, number> {
        const data: Record<string, number> = {};
        for (const s of sessions) {
            if (s.is_break) continue;
            const dateStr = s.end.split('T')[0];
            data[dateStr] = (data[dateStr] || 0) + s.duration;
        }
        return data;
    }
}
