import { Component, OnDestroy, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FocusTimerService, TimerState } from '../../../services/focus-timer.service';
import { Subscription } from 'rxjs';

const DOCK_EXPANDED_KEY = 'authorflow_focus_timer_dock_expanded';

@Component({
    selector: 'app-focus-timer-dock',
    standalone: true,
    imports: [CommonModule, RouterLink],
    templateUrl: './focus-timer-navbar.component.html',
    styleUrls: ['./focus-timer-navbar.component.scss']
})
export class FocusTimerDockComponent implements OnInit, OnDestroy {
    sessionActive = false;
    isExpanded = false;
    modeLabel = '';
    timeDisplay = '00:00';
    timerState: TimerState = 'idle';
    isPaused = false;

    private subs: Subscription[] = [];

    constructor(
        public timer: FocusTimerService,
        private cdr: ChangeDetectorRef
    ) {}

    ngOnInit(): void {
        this.isExpanded = this.loadExpandedPreference();

        this.subs.push(
            this.timer.timerState$.subscribe(s => {
                this.timerState = s;
                this.sessionActive = this.timer.showInNavbar;
                this.isPaused = s === 'paused';
                if (!this.sessionActive) {
                    this.isExpanded = false;
                }
                this.cdr.markForCheck();
            }),
            this.timer.remainingSeconds$.subscribe(sec => {
                this.timeDisplay = this.timer.formatTime(sec);
                this.cdr.markForCheck();
            }),
            this.timer.sessionMode$.subscribe(() => {
                this.modeLabel = this.timer.modeLabel;
                this.cdr.markForCheck();
            })
        );

        this.modeLabel = this.timer.modeLabel;
        this.sessionActive = this.timer.showInNavbar;
        this.timeDisplay = this.timer.formatTime(this.timer.remainingSeconds$.value);
    }

    ngOnDestroy(): void {
        this.subs.forEach(s => s.unsubscribe());
    }

    toggleExpanded(): void {
        this.isExpanded = !this.isExpanded;
        localStorage.setItem(DOCK_EXPANDED_KEY, String(this.isExpanded));
    }

    pause(e: Event): void {
        e.preventDefault();
        e.stopPropagation();
        this.timer.pause();
    }

    resume(e: Event): void {
        e.preventDefault();
        e.stopPropagation();
        this.timer.resume();
    }

    stop(e: Event): void {
        e.preventDefault();
        e.stopPropagation();
        this.timer.stop();
    }

    private loadExpandedPreference(): boolean {
        try {
            return localStorage.getItem(DOCK_EXPANDED_KEY) === 'true';
        } catch {
            return false;
        }
    }
}
