import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { NotificationService } from './notification.service';

export type TimerState = 'idle' | 'running' | 'paused' | 'break_running' | 'completed';
export type SessionMode = 'focus' | 'short_break' | 'long_break';

export interface FocusTimerSettings {
    focusMinutes: number;
    shortBreakMinutes: number;
    longBreakMinutes: number;
    sessionsBeforeLongBreak: number;
    soundEnabled: boolean;
    notificationsEnabled: boolean;
}

export interface FocusTimerStats {
    totalSessionsCompleted: number;
    totalFocusMinutes: number;
    todayFocusMinutes: number;
    weeklyFocusMinutes: number;
    lastStatsDate: string; // YYYY-MM-DD
    weekStartDate: string; // YYYY-MM-DD (Monday)
}

export interface PersistedTimerState {
    timerState: TimerState;
    sessionMode: SessionMode;
    endTime: number | null; // epoch ms when current segment ends
    pausedRemainingMs: number | null;
    completedFocusSessions: number; // in current cycle (for long break)
    segmentDurationMs: number;
    lastUpdated: number;
}

const SETTINGS_KEY = 'authorflow_focus_timer_settings';
const STATS_KEY = 'authorflow_focus_timer_stats';
const STATE_KEY = 'authorflow_focus_timer_state';

const DEFAULT_SETTINGS: FocusTimerSettings = {
    focusMinutes: 25,
    shortBreakMinutes: 5,
    longBreakMinutes: 15,
    sessionsBeforeLongBreak: 4,
    soundEnabled: true,
    notificationsEnabled: true
};

@Injectable({ providedIn: 'root' })
export class FocusTimerService implements OnDestroy {
    private tickInterval?: ReturnType<typeof setInterval>;
    private audioContext?: AudioContext;

    readonly settings$ = new BehaviorSubject<FocusTimerSettings>(this.loadSettings());
    readonly stats$ = new BehaviorSubject<FocusTimerStats>(this.loadStats());
    readonly timerState$ = new BehaviorSubject<TimerState>('idle');
    readonly sessionMode$ = new BehaviorSubject<SessionMode>('focus');
    readonly remainingSeconds$ = new BehaviorSubject<number>(0);
    readonly completedFocusSessions$ = new BehaviorSubject<number>(0);

    constructor(private notificationService: NotificationService) {
        this.restoreFromStorage();
        this.requestNotificationPermission();
        this.startTickLoop();
        if (typeof document !== 'undefined') {
            document.addEventListener('visibilitychange', () => this.syncFromClock());
        }
    }

    ngOnDestroy(): void {
        this.stopTickLoop();
    }

    get settings(): FocusTimerSettings {
        return this.settings$.value;
    }

    get timerState(): TimerState {
        return this.timerState$.value;
    }

    get showInNavbar(): boolean {
        const s = this.timerState;
        return s === 'running' || s === 'paused' || s === 'break_running';
    }

    get modeLabel(): string {
        switch (this.sessionMode$.value) {
            case 'focus': return 'Focus Session';
            case 'short_break': return 'Short Break';
            case 'long_break': return 'Long Break';
        }
    }

    updateSettings(partial: Partial<FocusTimerSettings>): void {
        if (this.timerState !== 'idle' && this.timerState !== 'completed') {
            return; // don't change mid-session
        }
        const next = { ...this.settings$.value, ...partial };
        this.settings$.next(next);
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
    }

    startFocusSession(): void {
        if (this.timerState === 'running' || this.timerState === 'break_running') return;
        const durationMs = this.settings.focusMinutes * 60 * 1000;
        this.beginSegment('focus', 'running', durationMs);
    }

    pause(): void {
        const state = this.timerState;
        if (state !== 'running' && state !== 'break_running') return;
        const remaining = this.computeRemainingMs();
        this.timerState$.next('paused');
        this.persistState({ pausedRemainingMs: remaining });
    }

    resume(): void {
        if (this.timerState !== 'paused') return;
        const persisted = this.loadPersistedState();
        const remaining = persisted?.pausedRemainingMs ?? this.computeRemainingMs();
        if (remaining <= 0) {
            this.onSegmentComplete();
            return;
        }
        const activeState: TimerState = this.sessionMode$.value === 'focus' ? 'running' : 'break_running';
        this.timerState$.next(activeState);
        const endTime = Date.now() + remaining;
        this.persistState({ endTime, pausedRemainingMs: null });
        this.updateRemainingDisplay();
    }

    stop(): void {
        this.timerState$.next('idle');
        this.sessionMode$.next('focus');
        this.remainingSeconds$.next(0);
        localStorage.removeItem(STATE_KEY);
    }

    dismissCompleted(): void {
        if (this.timerState === 'completed') {
            this.timerState$.next('idle');
            this.remainingSeconds$.next(0);
            localStorage.removeItem(STATE_KEY);
        }
    }

    startBreak(mode: 'short_break' | 'long_break'): void {
        const mins = mode === 'long_break' ? this.settings.longBreakMinutes : this.settings.shortBreakMinutes;
        this.beginSegment(mode, 'break_running', mins * 60 * 1000);
    }

    formatTime(totalSeconds: number): string {
        const s = Math.max(0, Math.ceil(totalSeconds));
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    }

    // --- private ---

    private beginSegment(mode: SessionMode, state: TimerState, durationMs: number): void {
        this.sessionMode$.next(mode);
        this.timerState$.next(state);
        const endTime = Date.now() + durationMs;
        this.persistState({
            timerState: state,
            sessionMode: mode,
            endTime,
            pausedRemainingMs: null,
            segmentDurationMs: durationMs,
            completedFocusSessions: this.completedFocusSessions$.value,
            lastUpdated: Date.now()
        });
        this.updateRemainingDisplay();
    }

    private startTickLoop(): void {
        this.stopTickLoop();
        this.tickInterval = setInterval(() => this.syncFromClock(), 1000);
    }

    private stopTickLoop(): void {
        if (this.tickInterval) {
            clearInterval(this.tickInterval);
            this.tickInterval = undefined;
        }
    }

    private syncFromClock(): void {
        const state = this.timerState;
        if (state === 'running' || state === 'break_running') {
            const remaining = this.computeRemainingMs();
            if (remaining <= 0) {
                this.onSegmentComplete();
            } else {
                this.updateRemainingDisplay();
                this.persistState({ lastUpdated: Date.now() });
            }
        } else if (state === 'paused') {
            this.updateRemainingDisplay();
        }
    }

    private computeRemainingMs(): number {
        const persisted = this.loadPersistedState();
        if (!persisted) return 0;
        if (this.timerState === 'paused' && persisted.pausedRemainingMs != null) {
            return persisted.pausedRemainingMs;
        }
        if (persisted.endTime != null) {
            return Math.max(0, persisted.endTime - Date.now());
        }
        return 0;
    }

    private updateRemainingDisplay(): void {
        const ms = this.computeRemainingMs();
        this.remainingSeconds$.next(Math.ceil(ms / 1000));
    }

    private onSegmentComplete(): void {
        const mode = this.sessionMode$.value;
        if (mode === 'focus') {
            const completed = this.completedFocusSessions$.value + 1;
            this.completedFocusSessions$.next(completed);
            this.recordFocusSessionCompleted(this.settings.focusMinutes);
            this.notifySessionEnd('focus');
            this.timerState$.next('completed');
            this.remainingSeconds$.next(0);
            localStorage.removeItem(STATE_KEY);
        } else {
            this.notifySessionEnd('break');
            this.timerState$.next('completed');
            this.remainingSeconds$.next(0);
            localStorage.removeItem(STATE_KEY);
        }
    }

    private notifySessionEnd(kind: 'focus' | 'break'): void {
        const settings = this.settings;
        if (settings.soundEnabled) {
            this.playChime();
        }
        if (kind === 'focus') {
            const msg = 'Focus session completed. Time for a break!';
            this.notificationService.showSuccess(msg);
            this.showBrowserNotification('Focus session complete', msg);
        } else {
            const msg = 'Break completed. Ready to continue writing?';
            this.notificationService.showInfo(msg);
            this.showBrowserNotification('Break complete', msg);
        }
    }

    private recordFocusSessionCompleted(focusMinutes: number): void {
        const stats = this.refreshStatsDates(this.loadStats());
        stats.totalSessionsCompleted += 1;
        stats.totalFocusMinutes += focusMinutes;
        stats.todayFocusMinutes += focusMinutes;
        stats.weeklyFocusMinutes += focusMinutes;
        this.saveStats(stats);
    }

    private refreshStatsDates(stats: FocusTimerStats): FocusTimerStats {
        const today = this.todayKey();
        const weekStart = this.weekStartKey();
        if (stats.lastStatsDate !== today) {
            stats.todayFocusMinutes = 0;
            stats.lastStatsDate = today;
        }
        if (stats.weekStartDate !== weekStart) {
            stats.weeklyFocusMinutes = 0;
            stats.weekStartDate = weekStart;
        }
        return stats;
    }

    private todayKey(): string {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    private weekStartKey(): string {
        const d = new Date();
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(d.getFullYear(), d.getMonth(), diff);
        return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
    }

    private restoreFromStorage(): void {
        const persisted = this.loadPersistedState();
        if (!persisted) return;

        this.sessionMode$.next(persisted.sessionMode);
        this.completedFocusSessions$.next(persisted.completedFocusSessions);

        if (persisted.timerState === 'paused') {
            this.timerState$.next('paused');
            this.updateRemainingDisplay();
            return;
        }

        if (persisted.timerState === 'running' || persisted.timerState === 'break_running') {
            const remaining = persisted.endTime != null ? persisted.endTime - Date.now() : 0;
            if (remaining <= 0) {
                this.sessionMode$.next(persisted.sessionMode);
                this.onSegmentComplete();
            } else {
                this.timerState$.next(persisted.timerState);
                this.updateRemainingDisplay();
            }
        }
    }

    private persistState(partial: Partial<PersistedTimerState>): void {
        const current = this.loadPersistedState() ?? {
            timerState: this.timerState$.value,
            sessionMode: this.sessionMode$.value,
            endTime: null,
            pausedRemainingMs: null,
            completedFocusSessions: this.completedFocusSessions$.value,
            segmentDurationMs: 0,
            lastUpdated: Date.now()
        };
        const next: PersistedTimerState = { ...current, ...partial, lastUpdated: Date.now() };
        localStorage.setItem(STATE_KEY, JSON.stringify(next));
    }

    private loadPersistedState(): PersistedTimerState | null {
        try {
            const raw = localStorage.getItem(STATE_KEY);
            return raw ? JSON.parse(raw) as PersistedTimerState : null;
        } catch {
            return null;
        }
    }

    private loadSettings(): FocusTimerSettings {
        try {
            const raw = localStorage.getItem(SETTINGS_KEY);
            return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : { ...DEFAULT_SETTINGS };
        } catch {
            return { ...DEFAULT_SETTINGS };
        }
    }

    private loadStats(): FocusTimerStats {
        try {
            const raw = localStorage.getItem(STATS_KEY);
            const base: FocusTimerStats = {
                totalSessionsCompleted: 0,
                totalFocusMinutes: 0,
                todayFocusMinutes: 0,
                weeklyFocusMinutes: 0,
                lastStatsDate: this.todayKey(),
                weekStartDate: this.weekStartKey()
            };
            return raw ? this.refreshStatsDates({ ...base, ...JSON.parse(raw) }) : base;
        } catch {
            return {
                totalSessionsCompleted: 0,
                totalFocusMinutes: 0,
                todayFocusMinutes: 0,
                weeklyFocusMinutes: 0,
                lastStatsDate: this.todayKey(),
                weekStartDate: this.weekStartKey()
            };
        }
    }

    private saveStats(stats: FocusTimerStats): void {
        this.stats$.next(stats);
        localStorage.setItem(STATS_KEY, JSON.stringify(stats));
    }

    private async requestNotificationPermission(): Promise<void> {
        if (typeof Notification === 'undefined' || !this.settings.notificationsEnabled) return;
        if (Notification.permission === 'default') {
            try {
                await Notification.requestPermission();
            } catch { /* ignore */ }
        }
    }

    private showBrowserNotification(title: string, body: string): void {
        if (!this.settings.notificationsEnabled || typeof Notification === 'undefined') return;
        if (Notification.permission === 'granted') {
            try {
                new Notification(title, { body, icon: '/assets/logo-new.png' });
            } catch { /* ignore */ }
        }
    }

    private playChime(): void {
        try {
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            }
            const ctx = this.audioContext;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = 880;
            gain.gain.setValueAtTime(0.15, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.5);
        } catch { /* ignore */ }
    }

    /** After focus completes, suggest next break type */
    getSuggestedBreakMode(): 'short_break' | 'long_break' {
        const n = this.completedFocusSessions$.value;
        if (n > 0 && n % this.settings.sessionsBeforeLongBreak === 0) {
            return 'long_break';
        }
        return 'short_break';
    }
}
