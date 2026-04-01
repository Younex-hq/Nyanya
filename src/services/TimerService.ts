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
    
    // Track how many continuous sessions without long break
    private sessionCount = 0;

    constructor() {
        super();
    }

    setTag(tag: Tag) {
        if (this.state !== 'Idle' && this.state !== 'IdleAfterFocus') return;
        this.activeTag = tag;
        this.targetDurationMinutes = tag.focusTime;
        this.timeRemainingSeconds = tag.focusTime * 60;
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
            this.notify();
        }
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
        this.intervalId = window.setInterval(() => {
            this.tick();
        }, 1000);
    }

    private stopTicker() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    private startPausingTicker() {
        if (this.pauseIntervalId) clearInterval(this.pauseIntervalId);
        this.pauseIntervalId = window.setInterval(() => {
            this.interruptionSeconds++;
            this.notify();
        }, 1000);
    }

    private stopPausingTicker() {
        if (this.pauseIntervalId) {
            clearInterval(this.pauseIntervalId);
            this.pauseIntervalId = null;
        }
    }

    private tick() {
        if (this.state === 'Focus' || this.state === 'Break') {
            if (this.timeRemainingSeconds > 0) {
                this.timeRemainingSeconds--;
            } else {
                this.handlePhaseComplete();
            }
        } else if (this.state === 'IdleAfterFocus') {
            this.idleSeconds++;
        }
        this.notify();
    }

    private handlePhaseComplete() {
        this.stopTicker();
        const wasFocus = this.state === 'Focus';
        
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

        // Browser notification
        if (Notification.permission === 'granted') {
            new Notification(wasFocus ? 'Focus session completed!' : 'Break ended. Time to focus!', {
                body: wasFocus ? 'Great job! Take a well-deserved break.' : 'Back to work!',
                icon: '/apple-touch-icon.png' // Ensure icon exists or fallback
            });
        }

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
}
