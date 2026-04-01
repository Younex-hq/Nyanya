import { TimerService } from '../services/TimerService.ts';
import { TagsUI } from './TagsUI.ts';

export class TimerUI {
    private container: HTMLElement;
    private timerService: TimerService;
    private tagsUI: TagsUI;
    private lastCountTagId: number | undefined = -1;
    private lastCountValue: number = 0;

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
                <div class="session-counter" id="session-counter" style="margin-bottom: 1rem; opacity: 0.8;">Today: 0 sessions</div>
                
                <div class="timer-dial" id="timer-dial">
                    <div class="time-display" id="time-display">25:00</div>
                    <div class="state-label" id="state-label">IDLE</div>
                </div>

                <div class="timer-controls" id="timer-controls">
                    <button class="btn-primary" id="btn-main">Start Focus</button>
                    <button class="btn-secondary hidden" id="btn-secondary">Pause</button>
                    <button class="btn-secondary hidden" id="btn-restart">Restart</button>
                    <button class="btn-secondary hidden" id="btn-skip-focus">Skip to Break</button>
                    <button class="btn-secondary hidden" id="btn-skip-break">Skip Break</button>
                </div>
                
                <div class="idle-controls hidden" id="idle-controls">
                    <span>Idle: <span id="idle-display">00:00</span></span>
                    <button class="btn-icon" id="btn-add-idle" title="Add to session">+</button>
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

        const activeTagBadge = document.getElementById('active-tag-badge')!;
        activeTagBadge.addEventListener('click', () => {
            const state = this.timerService.getState();
            if (state !== 'Idle' && state !== 'IdleAfterFocus' && state !== 'FocusPaused') return;
            this.tagsUI.setManagementMode(false);
            document.getElementById('tags-wrapper-modal')!.classList.remove('hidden');
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
    }

    private formatTime(totalSeconds: number) {
        const m = Math.floor(totalSeconds / 60);
        const s = totalSeconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
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
        const sessionCounter = document.getElementById('session-counter')!;
        const btnRestart = document.getElementById('btn-restart')!;
        const btnSkipFocus = document.getElementById('btn-skip-focus')!;

        const state = this.timerService.getState();
        const tag = this.timerService.activeTag;
        
        // Update Tag and fetch session count occasionally
        if (tag) {
            tagBadge.textContent = tag.name;
            tagBadge.style.backgroundColor = tag.color;
            if (this.lastCountTagId !== tag.id || state === 'IdleAfterFocus') {
                this.timerService.getTodaySessionCountForTag().then(c => {
                    this.lastCountValue = c;
                    this.lastCountTagId = tag.id;
                    sessionCounter.textContent = `Today: ${c} sessions`;
                });
            } else {
                sessionCounter.textContent = `Today: ${this.lastCountValue} sessions`;
            }
        }

        // Update Dial
        timerDial.className = 'timer-dial ' + (state === 'Focus' || state === 'FocusPaused' ? 'focus' : state === 'Break' || state === 'BreakPaused' ? 'break' : 'idle');
        
        // Update Time
        timeDisplay.textContent = this.formatTime(this.timerService.timeRemainingSeconds);
        stateLabel.textContent = state.replace(/([A-Z])/g, ' $1').trim().toUpperCase(); // 'IdleAfterFocus' -> 'IDLE AFTER FOCUS'

        // Default: hide extras 
        btnRestart.classList.add('hidden');
        btnSkipFocus.classList.add('hidden');

        // Idle display
        if (state === 'IdleAfterFocus') {
            idleControls.classList.remove('hidden');
            idleDisplay.textContent = this.formatTime(this.timerService.idleSeconds);
            btnMain.textContent = 'Start Break';
            btnMain.classList.remove('hidden');
            btnSecondary.classList.add('hidden');
            btnSkipBreak.classList.add('hidden');
        } else {
            idleControls.classList.add('hidden');
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
    }
}
