import type { Tag, TimerState } from '../models/types.ts';
import { StorageService } from './StorageService.ts';

export class TimerService extends EventTarget {
    private state: TimerState = 'Idle';
    public activeTag: Tag | null = null;
    
    public targetDurationMinutes = 25;
    
    // For counting down during Focus/Break
    public timeRemainingSeconds = 0;
    
    // For counting up during IdleAfterFocus
    public idleSeconds = 0;
    
    // For counting up during pause
    public interruptionSeconds = 0;
    
    private currentSessionNotes = '';
    
    private intervalId: number | null = null;
    private pauseIntervalId: number | null = null;
    private lastTickAt = 0;
    private lastPauseTickAt = 0;
    
    // Track how many continuous sessions without long break
    private sessionCount = 0;

    constructor() {
        super();
        document.addEventListener('visibilitychange', () => {
            if (this.intervalId && (this.state === 'Focus' || this.state === 'Break' || this.state === 'IdleAfterFocus')) {
                this.startTicker();
            }
            if (this.pauseIntervalId && this.state === 'FocusPaused') {
                this.startPausingTicker();
            }
        });
    }

    setTag(tag: Tag) {
        const canSwitchDirectly = (this.state === 'Idle' || this.state === 'IdleAfterFocus');
        const isPausedDuringFocus = (this.state === 'FocusPaused');

        if (!canSwitchDirectly && !isPausedDuringFocus) return;

        if (isPausedDuringFocus) {
            this.stopPausingTicker();
            
            // Calculate actual duration in minutes
            const elapsedSeconds = (this.targetDurationMinutes * 60) - this.timeRemainingSeconds;
            const actualDurationMinutes = Math.max(1 / 60, elapsedSeconds / 60);

            // Save partial session only if it's at least 59 seconds
            if (elapsedSeconds >= 59) {
                StorageService.saveSession({
                    end: new Date().toISOString(),
                    duration: actualDurationMinutes,
                    interruptions: this.interruptionSeconds / 60,
                    label: this.activeTag?.name || 'Default',
                    notes: this.currentSessionNotes,
                    is_break: false,
                    archived: false
                });
            }
            this.currentSessionNotes = '';
            this.state = 'Idle';
        }

        this.activeTag = tag;
        this.targetDurationMinutes = tag.focusTime;
        this.timeRemainingSeconds = tag.focusTime * 60;
        this.interruptionSeconds = 0;
        this.notify();
    }

    setNotes(notes: string) {
        this.currentSessionNotes = notes;
    }

    getState() {
        return this.state;
    }

    startFocus() {
        if (this.state === 'Idle' || this.state === 'IdleAfterFocus') {
            if (!this.activeTag) return;
            this.state = 'Focus';
            this.targetDurationMinutes = this.activeTag.focusTime;
            this.timeRemainingSeconds = this.activeTag.focusTime * 60;
            this.interruptionSeconds = 0;
            this.idleSeconds = 0;
            this.startTicker();
        } else if (this.state === 'FocusPaused') {
            this.state = 'Focus';
            this.stopPausingTicker();
            this.startTicker();
        }
        this.notify();
    }

    pauseFocus() {
        if (this.state === 'Focus') {
            this.state = 'FocusPaused';
            this.stopTicker();
            this.startPausingTicker();
            this.notify();
        }
    }

    restartFocus() {
        if (this.state === 'FocusPaused' || this.state === 'Focus') {
            this.stopTicker();
            this.stopPausingTicker();
            this.state = 'Focus';
            this.timeRemainingSeconds = this.activeTag ? this.activeTag.focusTime * 60 : 25 * 60;
            this.interruptionSeconds = 0;
            this.startTicker();
            this.notify();
        }
    }

    skipFocusToBreak() {
        if (this.state === 'FocusPaused' || this.state === 'Focus') {
            this.stopTicker();
            this.stopPausingTicker();
            
            // Calculate actual duration in minutes
            const elapsedSeconds = (this.targetDurationMinutes * 60) - this.timeRemainingSeconds;
            const actualDurationMinutes = Math.max(1 / 60, elapsedSeconds / 60);

            // Save session with actual duration only if >= 59 seconds
            if (elapsedSeconds >= 59) {
                StorageService.saveSession({
                    end: new Date().toISOString(),
                    duration: actualDurationMinutes,
                    interruptions: this.interruptionSeconds / 60,
                    label: this.activeTag?.name || 'Default',
                    notes: this.currentSessionNotes,
                    is_break: false,
                    archived: false
                });
                this.sessionCount++;
            }

            this.currentSessionNotes = '';
            this.startBreakManually();
            this.notify();
        }
    }

    private startBreakManually() {
        if (!this.activeTag) {
            this.state = 'Idle';
            return;
        }
        this.state = 'Break';
        if (this.sessionCount >= this.activeTag.sessionsBeforeLongBreak) {
            this.targetDurationMinutes = this.activeTag.longBreakTime;
            this.sessionCount = 0;
        } else {
            this.targetDurationMinutes = this.activeTag.breakTime;
        }
        this.timeRemainingSeconds = this.targetDurationMinutes * 60;
        this.interruptionSeconds = 0;
        this.startTicker();
    }

    startBreak() {
        if (this.state === 'Idle' || this.state === 'IdleAfterFocus') {
            if (!this.activeTag) return;
            this.state = 'Break';
            
            // Determine if long or short break
            if (this.sessionCount >= this.activeTag.sessionsBeforeLongBreak) {
                this.targetDurationMinutes = this.activeTag.longBreakTime;
                this.sessionCount = 0; // reset
            } else {
                this.targetDurationMinutes = this.activeTag.breakTime;
            }
            
            this.timeRemainingSeconds = this.targetDurationMinutes * 60;
            this.interruptionSeconds = 0;
            this.idleSeconds = 0;
            this.startTicker();
            this.notify();
        }
    }

    addIdleTimeToSession() {
        if (this.state === 'IdleAfterFocus' && this.idleSeconds > 0) {
            // Update the immediate past record
            const addedMinutes = this.idleSeconds / 60;
            // The session was just saved. We need to update the last saved one.
            StorageService.getSessions().then(sessions => {
                if (sessions.length > 0) {
                    const lastSession = sessions[sessions.length - 1]; // highly likely to be the right one
                    if (!lastSession.is_break) {
                        lastSession.duration += addedMinutes;
                        StorageService.updateSession(lastSession.id!, { duration: lastSession.duration });
                    }
                }
            });
            this.idleSeconds = 0;
            this.notify();
        }
    }

    skipBreak() {
        if (this.state === 'Break' || this.state === 'BreakPaused') {
            this.stopTicker();
            this.stopPausingTicker();
            this.state = 'Idle';
            this.timeRemainingSeconds = this.activeTag ? this.activeTag.focusTime * 60 : 25 * 60;
            this.interruptionSeconds = 0;
            this.idleSeconds = 0;
        }
        this.notify(); // Always notify to sync UI if stuck
    }

    cancelSession() {
        this.stopTicker();
        this.stopPausingTicker();
        this.state = 'Idle';
        this.timeRemainingSeconds = this.activeTag ? this.activeTag.focusTime * 60 : 25 * 60;
        this.interruptionSeconds = 0;
        this.idleSeconds = 0;
        this.notify();
    }

    private startTicker() {
        if (this.intervalId) clearInterval(this.intervalId);
        this.lastTickAt = Date.now();
        this.intervalId = window.setInterval(() => {
            this.tick();
        }, document.hidden ? 5000 : 1000);
    }

    private stopTicker() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    private startPausingTicker() {
        if (this.pauseIntervalId) clearInterval(this.pauseIntervalId);
        this.lastPauseTickAt = Date.now();
        this.pauseIntervalId = window.setInterval(() => {
            const now = Date.now();
            const elapsedSeconds = Math.max(1, Math.floor((now - this.lastPauseTickAt) / 1000));
            this.lastPauseTickAt += elapsedSeconds * 1000;
            this.interruptionSeconds += elapsedSeconds;
            this.notify();
        }, document.hidden ? 5000 : 1000);
    }

    private stopPausingTicker() {
        if (this.pauseIntervalId) {
            clearInterval(this.pauseIntervalId);
            this.pauseIntervalId = null;
        }
    }

    private tick() {
        const now = Date.now();
        const elapsedSeconds = Math.max(1, Math.floor((now - this.lastTickAt) / 1000));
        this.lastTickAt += elapsedSeconds * 1000;

        if (this.state === 'Focus' || this.state === 'Break') {
            if (this.timeRemainingSeconds > elapsedSeconds) {
                this.timeRemainingSeconds -= elapsedSeconds;
            } else {
                this.timeRemainingSeconds = 0;
                this.handlePhaseComplete();
                return;
            }
        } else if (this.state === 'IdleAfterFocus') {
            this.idleSeconds += elapsedSeconds;
        }
        this.notify();
    }

    private async sendPhaseNotification(wasFocus: boolean) {
        if (!('Notification' in window) || Notification.permission !== 'granted') {
            return;
        }

        const title = wasFocus ? 'Focus session completed!' : 'Break ended. Time to focus!';
        const body = wasFocus ? 'Great job! Take a well-deserved break.' : 'Back to work!';
        const options: NotificationOptions = {
            body,
            icon: '/apple-touch-icon.png'
        };

        try {
            new Notification(title, options);
            return;
        } catch (e) {
            console.error('Window notification failed:', e);
        }

        if (!('serviceWorker' in navigator)) {
            return;
        }

        try {
            const registration = await navigator.serviceWorker.ready;
            await registration.showNotification(title, options);
        } catch (e) {
            console.error('Service worker notification failed:', e);
        }
    }

    private handlePhaseComplete() {
        this.stopTicker();
        const wasFocus = this.state === 'Focus';
        
        try {
            // Save session automatically
            StorageService.saveSession({
                end: new Date().toISOString(),
                duration: this.targetDurationMinutes,
                interruptions: this.interruptionSeconds / 60, // save as minutes
                label: this.activeTag?.name || 'Default',
                notes: this.currentSessionNotes,
                is_break: !wasFocus,
                archived: false
            });
        } catch (e) {
            console.error('Failed to save session:', e);
        }

        void this.sendPhaseNotification(wasFocus);

        this.currentSessionNotes = '';

        if (wasFocus) {
            this.sessionCount++;
            this.state = 'IdleAfterFocus';
            this.startTicker(); // Start counting idle UP
        } else {
            this.state = 'Idle';
            if (this.activeTag) {
                this.timeRemainingSeconds = this.activeTag.focusTime * 60;
            }
        }
        
        this.notify();
    }

    private notify() {
        this.dispatchEvent(new Event('change'));
    }

    async getTodaySessionCountForTag(): Promise<number> {
        if (!this.activeTag) return 0;
        const sessions = await StorageService.getSessions();
        const todayStr = new Date().toISOString().split('T')[0];
        return sessions.filter(s => s.end.startsWith(todayStr) && !s.is_break && s.label === this.activeTag?.name).length;
    }

    async getTodayCountsByTag(): Promise<Record<string, number>> {
        const sessions = await StorageService.getSessions();
        const todayStr = new Date().toISOString().split('T')[0];
        const todaySessions = sessions.filter(s => s.end.startsWith(todayStr) && !s.is_break);
        
        const counts: Record<string, number> = {};
        todaySessions.forEach(s => {
            counts[s.label] = (counts[s.label] || 0) + 1;
        });
        return counts;
    }
}
