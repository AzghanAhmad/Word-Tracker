import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FocusTimerService, FocusTimerSettings, FocusTimerStats, TimerState } from '../../services/focus-timer.service';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-focus-timer',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './focus-timer.component.html',
    styleUrls: ['./focus-timer.component.scss']
})
export class FocusTimerComponent implements OnInit, OnDestroy {
    timerState: TimerState = 'idle';
    timeDisplay = '25:00';
    modeLabel = 'Focus Session';
    stats: FocusTimerStats = {
        totalSessionsCompleted: 0,
        totalFocusMinutes: 0,
        todayFocusMinutes: 0,
        weeklyFocusMinutes: 0,
        lastStatsDate: '',
        weekStartDate: ''
    };
    settings: FocusTimerSettings = {
        focusMinutes: 25,
        shortBreakMinutes: 5,
        longBreakMinutes: 15,
        sessionsBeforeLongBreak: 4,
        soundEnabled: true,
        notificationsEnabled: true
    };
    completedSessions = 0;
    showSettings = false;
    editSettings: FocusTimerSettings = { ...this.settings };

    private subs: Subscription[] = [];

    constructor(public timer: FocusTimerService) {}

    ngOnInit(): void {
        this.subs.push(
            this.timer.timerState$.subscribe(s => this.timerState = s),
            this.timer.remainingSeconds$.subscribe(sec => {
                if (this.timerState === 'idle') {
                    this.timeDisplay = this.timer.formatTime(this.settings.focusMinutes * 60);
                } else if (this.timerState === 'completed') {
                    this.timeDisplay = '00:00';
                } else {
                    this.timeDisplay = this.timer.formatTime(sec);
                }
            }),
            this.timer.sessionMode$.subscribe(() => this.modeLabel = this.timer.modeLabel),
            this.timer.stats$.subscribe(s => this.stats = s),
            this.timer.settings$.subscribe(s => {
                this.settings = s;
                if (this.timerState === 'idle') {
                    this.timeDisplay = this.timer.formatTime(s.focusMinutes * 60);
                }
            }),
            this.timer.completedFocusSessions$.subscribe(n => this.completedSessions = n)
        );
        this.modeLabel = this.timer.modeLabel;
        this.stats = this.timer.stats$.value;
        this.settings = this.timer.settings$.value;
        this.timeDisplay = this.timer.formatTime(this.settings.focusMinutes * 60);
    }

    ngOnDestroy(): void {
        this.subs.forEach(s => s.unsubscribe());
    }

    get isActive(): boolean {
        return this.timerState === 'running' || this.timerState === 'break_running' || this.timerState === 'paused';
    }

    startFocus(): void {
        this.timer.startFocusSession();
    }

    startSuggestedBreak(): void {
        this.timer.startBreak(this.timer.getSuggestedBreakMode());
    }

    pause(): void { this.timer.pause(); }
    resume(): void { this.timer.resume(); }
    stop(): void { this.timer.stop(); }
    dismiss(): void { this.timer.dismissCompleted(); }

    openSettings(): void {
        this.editSettings = { ...this.settings };
        this.showSettings = true;
    }

    saveSettings(): void {
        this.timer.updateSettings(this.editSettings);
        this.showSettings = false;
    }

    cancelSettings(): void {
        this.showSettings = false;
    }
}
