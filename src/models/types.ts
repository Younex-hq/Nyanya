export interface Session {
    id?: number;
    end: string; // ISO String
    duration: number; // minutes
    interruptions: number; // minutes
    label: string; // the name of the tag used
    notes: string;
    is_break: boolean;
    archived: boolean;
}

export interface Tag {
    id?: number;
    name: string;
    color: string; // e.g. '#FF5733'
    focusTime: number; // minutes
    breakTime: number; // minutes
    longBreakTime: number; // minutes
    sessionsBeforeLongBreak: number;
}

export type TimerState = 
    | 'Idle'
    | 'Focus'
    | 'FocusPaused'
    | 'Break'
    | 'BreakPaused'
    | 'IdleAfterFocus';
