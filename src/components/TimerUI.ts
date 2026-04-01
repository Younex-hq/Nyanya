import { TimerService } from '../services/TimerService.ts';

export class TimerUI {
    private container: HTMLElement;
    private timerService: TimerService;

    constructor(container: HTMLElement, timerService: TimerService) {
        this.container = container;
        this.timerService = timerService;
        this.initialize();
        this.timerService.addEventListener('change', () => this.render());
    }

    private initialize() {
        this.container.innerHTML = `
            <div class="timer-container">
                <div class="tag-badge" id="active-tag-badge">No Tag</div>
                
                <div class="timer-dial" id="timer-dial">
                    <div class="time-display" id="time-display">25:00</div>
                    <div class="state-label" id="state-label">IDLE</div>
                </div>

                <div class="timer-controls" id="timer-controls">
                    <button class="btn-primary" id="btn-main">Start Focus</button>
                    <button class="btn-secondary hidden" id="btn-secondary">Pause</button>
                </div>
                
                <div class="idle-controls hidden" id="idle-controls">
                    <span>Idle: <span id="idle-display">00:00</span></span>
                    <button class="btn-icon" id="btn-add-idle" title="Add to session">+</button>
                </div>

                <input type="text" class="input-field notes-input" id="session-notes" placeholder="Notes for this session..." />
            </div>
        `;
        this.attachEvents();
    }

    private attachEvents() {
        const btnMain = document.getElementById('btn-main')!;
        const btnSecondary = document.getElementById('btn-secondary')!;
        const btnAddIdle = document.getElementById('btn-add-idle')!;
        const notesInput = document.getElementById('session-notes') as HTMLInputElement;

        btnMain.addEventListener('click', () => {
            const state = this.timerService.getState();
            if (state === 'Idle' || state === 'IdleAfterFocus') {
                this.timerService.startFocus();
            } else if (state === 'FocusPaused') {
                this.timerService.startFocus(); // resumes
            } else if (state === 'BreakPaused') {
                this.timerService.startBreak(); // resumes
            }
        });

        btnSecondary.addEventListener('click', () => {
            const state = this.timerService.getState();
            if (state === 'Focus') {
                this.timerService.pauseFocus();
            } else if (state === 'Break') {
                // Break pausing not strictly requested, but good to have, skipping for now to keep it simple.
            } else if (state === 'Idle' || state === 'IdleAfterFocus') {
                this.timerService.startBreak();
            }
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
        const idleControls = document.getElementById('idle-controls')!;
        const idleDisplay = document.getElementById('idle-display')!;

        const state = this.timerService.getState();
        const tag = this.timerService.activeTag;
        
        // Update Tag
        if (tag) {
            tagBadge.textContent = tag.name;
            tagBadge.style.backgroundColor = tag.color;
        }

        // Update Dial
        timerDial.className = 'timer-dial ' + (state === 'Focus' || state === 'FocusPaused' ? 'focus' : state === 'Break' || state === 'BreakPaused' ? 'break' : 'idle');
        
        // Update Time
        timeDisplay.textContent = this.formatTime(this.timerService.timeRemainingSeconds);
        stateLabel.textContent = state.replace(/([A-Z])/g, ' $1').trim().toUpperCase(); // 'IdleAfterFocus' -> 'IDLE AFTER FOCUS'

        // Idle display
        if (state === 'IdleAfterFocus') {
            idleControls.classList.remove('hidden');
            idleDisplay.textContent = this.formatTime(this.timerService.idleSeconds);
            btnSecondary.classList.remove('hidden');
            btnSecondary.textContent = 'Start Break';
            btnMain.textContent = 'Start Focus';
        } else {
            idleControls.classList.add('hidden');
            if (state === 'Idle') {
                btnMain.textContent = 'Start Focus';
                btnSecondary.textContent = 'Start Break';
                btnSecondary.classList.remove('hidden');
            } else if (state === 'Focus') {
                btnMain.classList.add('hidden');
                btnSecondary.textContent = 'Pause';
                btnSecondary.classList.remove('hidden');
            } else if (state === 'FocusPaused') {
                btnMain.textContent = 'Resume';
                btnMain.classList.remove('hidden');
                btnSecondary.classList.add('hidden');
            } else if (state === 'Break') {
                btnMain.classList.add('hidden');
                btnSecondary.classList.add('hidden'); // Simplified: can't pause break.
            }
        }
    }
}
