import { TimerService } from '../services/TimerService.ts';
import { TagsUI } from './TagsUI.ts';

export class TimerUI {
    private container: HTMLElement;
    private timerService: TimerService;
    private tagsUI: TagsUI;
    private lastCountTagId: number | undefined = -1;
    private lastCountValue: number = 0;
    private previousState = '';
    private lastTagBadgeKey = '';
    private currentThemeColor: string | null = null;

    constructor(container: HTMLElement, timerService: TimerService, tagsUI: TagsUI) {
        this.container = container;
        this.timerService = timerService;
        this.tagsUI = tagsUI;
        this.initialize();
        this.timerService.addEventListener('change', () => this.render());
    }

    private initialize() {
        this.container.innerHTML = `
            <div class="timer-container">
                <div class="tag-badge interactive-tag" id="active-tag-badge" style="margin-bottom: 1.5rem;" title="Click to change tag (saves progress if paused)">No Tag</div>
                
                <div class="timer-dial" id="timer-dial">
                    <div class="time-display" id="time-display">25:00</div>
                    <div class="state-label" id="state-label">IDLE</div>
                </div>

                <div class="timer-controls" id="timer-controls">
                    <button class="btn-secondary hidden" id="btn-cancel" title="Cancel session" style="width: 54px; padding: 0; font-weight: 700; color: var(--sys-color-error);">✕</button>
                    <button class="btn-secondary hidden" id="btn-restart">Restart</button>
                    <button class="btn-primary" id="btn-main">Start Focus</button>
                    <button class="btn-secondary hidden" id="btn-skip-focus">Skip to Break</button>
                    
                    <button class="btn-secondary hidden" id="btn-secondary">Pause</button>
                    <button class="btn-secondary hidden" id="btn-skip-break">Skip Break</button>
                </div>
                
                <div class="idle-controls hidden" id="idle-controls" style="background: rgba(255,255,255,0.05); padding: 0.5rem 1rem; border-radius: 12px; display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-top: 1rem; border: 1px solid rgba(255,255,255,0.1);">
                    <div style="display: flex; flex-direction: column; align-items: flex-start;">
                        <span style="font-size: 0.7rem; text-transform: uppercase; letter-spacing: 1px; opacity: 0.6; font-weight: 700;">OVERTIME</span>
                        <span id="idle-display" style="font-family: 'JetBrains Mono', monospace; font-size: 1.2rem; font-weight: 600; color: var(--sys-color-primary);">00:00</span>
                    </div>
                    <button class="btn-icon" id="btn-add-idle" title="Add this extra time to your completed focus session" style="background: var(--sys-color-primary-container); color: var(--sys-color-primary); border-radius: 50%; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; border: none; cursor: pointer; transition: all 0.2s ease;">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    </button>
                </div>

                <div class="interruptions-display hidden" id="interruptions-display" style="color: var(--sys-color-error); margin-top: 1rem;">
                    Interruptions: <span id="interruptions-time">00:00</span>
                </div>

                <input type="text" class="input-field notes-input" id="session-notes" placeholder="Notes for this session..." />
            </div>
        `;
        this.attachEvents();
    }

    private attachEvents() {
        const btnMain = document.getElementById('btn-main')!;
        const btnSecondary = document.getElementById('btn-secondary')!;
        const btnCancel = document.getElementById('btn-cancel')!;
        const btnSkipBreak = document.getElementById('btn-skip-break')!;
        const btnAddIdle = document.getElementById('btn-add-idle')!;
        const notesInput = document.getElementById('session-notes') as HTMLInputElement;

        btnMain.addEventListener('click', () => {
            const state = this.timerService.getState();
            if (state === 'Idle') {
                notesInput.value = ''; // Clear notes on new session
                this.timerService.startFocus();
            } else if (state === 'IdleAfterFocus') {
                this.timerService.startBreak();
            } else if (state === 'FocusPaused') {
                this.timerService.startFocus(); // resumes
            } else if (state === 'BreakPaused') {
                this.timerService.startBreak(); // resumes
            }
        });

        btnCancel.addEventListener('click', () => {
            if (window.confirm("Cancel this session? Progress will be lost.")) {
                this.timerService.cancelSession();
                notesInput.value = '';
            }
        });

        const activeTagBadge = document.getElementById('active-tag-badge')!;
        activeTagBadge.addEventListener('click', () => {
            const state = this.timerService.getState();
            if (state !== 'Idle' && state !== 'IdleAfterFocus' && state !== 'FocusPaused') return;
            this.tagsUI.setManagementMode(false);
            location.hash = 'tags';
        });

        const btnRestart = document.getElementById('btn-restart')!;
        btnRestart.addEventListener('click', () => {
            if (this.timerService.getState() === 'FocusPaused') {
                this.timerService.restartFocus();
            }
        });

        const btnSkipFocus = document.getElementById('btn-skip-focus')!;
        btnSkipFocus.addEventListener('click', () => {
            if (this.timerService.getState() === 'FocusPaused') {
                this.timerService.skipFocusToBreak();
            }
        });

        btnSecondary.addEventListener('click', () => {
            const state = this.timerService.getState();
            if (state === 'Focus') {
                this.timerService.pauseFocus();
            }
        });

        btnSkipBreak.addEventListener('click', () => {
            this.timerService.skipBreak();
        });

        btnAddIdle.addEventListener('click', () => {
            this.timerService.addIdleTimeToSession();
        });

        notesInput.addEventListener('change', (e) => {
            this.timerService.setNotes((e.target as HTMLInputElement).value);
        });

        const btnZenToggle = document.getElementById('btn-zen-toggle')!;
        btnZenToggle.addEventListener('click', () => {
            document.body.classList.toggle('zen-mode');
        });
    }

    private formatTime(totalSeconds: number) {
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;
        
        const mStr = m.toString().padStart(2, '0');
        const sStr = s.toString().padStart(2, '0');
        
        if (h > 0) {
            return `${h.toString().padStart(2, '0')}:${mStr}:${sStr}`;
        }
        return `${mStr}:${sStr}`;
    }

    private setTagBadge(name: string, count: number) {
        const tagBadge = document.getElementById('active-tag-badge')!;
        const key = `${name}|${count}`;
        if (this.lastTagBadgeKey === key) return;
        tagBadge.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
                <line x1="7" y1="7" x2="7.01" y2="7"></line>
            </svg>
            <span class="tag-badge-name">${name}</span>
            <span class="tag-session-count">${count}</span>
        `;
        this.lastTagBadgeKey = key;
    }

    public render() {
        const tagBadge = document.getElementById('active-tag-badge')!;
        const timeDisplay = document.getElementById('time-display')!;
        const stateLabel = document.getElementById('state-label')!;
        const timerDial = document.getElementById('timer-dial')!;
        const btnMain = document.getElementById('btn-main')!;
        const btnSecondary = document.getElementById('btn-secondary')!;
        const btnSkipBreak = document.getElementById('btn-skip-break')!;
        const idleControls = document.getElementById('idle-controls')!;
        const idleDisplay = document.getElementById('idle-display')!;
        const intDisplay = document.getElementById('interruptions-display')!;
        const intTime = document.getElementById('interruptions-time')!;
        const btnRestart = document.getElementById('btn-restart')!;
        const btnSkipFocus = document.getElementById('btn-skip-focus')!;
        const btnCancel = document.getElementById('btn-cancel')!;

        const state = this.timerService.getState();
        const tag = this.timerService.activeTag;
        
        // Update Tag and fetch session count occasionally
        if (tag) {
            // Only update theme if Statistics modal is NOT open to prevent color flickering/override
            if (location.hash !== '#stats') {
                this.updateDynamicTheme(tag.color);
            }
            
            tagBadge.style.setProperty('--tag-color', tag.color);
            tagBadge.style.backgroundColor = 'transparent'; // Let CSS handle the glass look
            if (this.lastCountTagId !== tag.id || (state === 'IdleAfterFocus' && this.previousState !== 'IdleAfterFocus')) {
                this.timerService.getTodaySessionCountForTag().then(c => {
                    if (!this.timerService.activeTag || this.timerService.activeTag.id !== tag.id) {
                        return;
                    }
                    this.lastCountValue = c;
                    this.lastCountTagId = tag.id;
                    this.setTagBadge(tag.name, c);
                });
            } else {
                this.setTagBadge(tag.name, this.lastCountValue);
            }
        } else {
            if (location.hash !== '#stats') {
                this.updateDynamicTheme('#d0bcff'); // Default purple
            }
            this.lastTagBadgeKey = '';
        }

        // Update Dial
        timerDial.className = 'timer-dial ' + (state === 'Focus' || state === 'FocusPaused' ? 'focus' : state === 'Break' || state === 'BreakPaused' ? 'break' : 'idle');
        
        // Update Time
        timeDisplay.textContent = this.formatTime(this.timerService.timeRemainingSeconds);
        stateLabel.textContent = state.replace(/([A-Z])/g, ' $1').trim().toUpperCase(); // 'IdleAfterFocus' -> 'IDLE AFTER FOCUS'

        // Default: hide extras 
        btnRestart.classList.add('hidden');
        btnSkipFocus.classList.add('hidden');
        btnCancel.classList.add('hidden');

        // Idle display
        if (state === 'IdleAfterFocus') {
            idleControls.classList.remove('hidden');
            idleControls.style.display = 'flex'; // override hidden class properly
            idleDisplay.textContent = this.formatTime(this.timerService.idleSeconds);
            btnMain.textContent = 'Start Break';
            btnMain.classList.remove('hidden');
            btnSecondary.classList.add('hidden');
            btnSkipBreak.classList.add('hidden');
        } else {
            idleControls.classList.add('hidden');
            idleControls.style.display = ''; // reset inline style
            if (state === 'Idle') {
                btnMain.textContent = 'Start Focus';
                btnMain.classList.remove('hidden');
                btnSecondary.classList.add('hidden');
                btnSkipBreak.classList.add('hidden');
            } else if (state === 'Focus') {
                btnMain.classList.add('hidden');
                btnSecondary.textContent = 'Pause';
                btnSecondary.classList.remove('hidden');
                btnSkipBreak.classList.add('hidden');
            } else if (state === 'FocusPaused') {
                btnMain.textContent = 'Resume';
                btnMain.classList.remove('hidden');
                btnSecondary.classList.add('hidden');
                btnRestart.classList.remove('hidden');
                btnSkipFocus.classList.remove('hidden');
                btnCancel.classList.remove('hidden');
                btnSkipBreak.classList.add('hidden');
            } else if (state === 'Break') {
                btnMain.classList.add('hidden');
                btnSecondary.classList.add('hidden');
                btnSkipBreak.classList.remove('hidden');
            }
        }

        // Interruptions display
        if (state === 'FocusPaused') {
            intDisplay.classList.remove('hidden');
            intTime.textContent = this.formatTime(this.timerService.interruptionSeconds);
        } else {
            intDisplay.classList.add('hidden');
        }
        this.previousState = state;
    }

    private updateDynamicTheme(color: string) {
        if (this.currentThemeColor === color) {
            return;
        }
        const root = document.documentElement;
        root.style.setProperty('--sys-color-primary', color);
        root.style.setProperty('--sys-color-primary-container', `color-mix(in srgb, ${color}, transparent 92%)`);
        root.style.setProperty('--sys-color-secondary-container', `color-mix(in srgb, ${color}, transparent 95%)`);
        this.currentThemeColor = color;
    }
}
