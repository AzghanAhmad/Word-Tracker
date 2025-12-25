import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { NotificationService } from '../../services/notification.service';

export interface PlanDay {
    num: number;
    day: string;
    date: string;
    dateObj: Date;
    workToComplete: number;
    actualWorkDone: number;
    expectedProgress: number;
    yourActualProgress: number;
    workLeft: number;
    isCurrentMonth?: boolean;
}

export interface ProgressUpdate {
    id: number;
    date: Date;
    targetWords: number;
    actualWords: number;
    notes: string;
    isToday: boolean;
}

@Component({
    selector: 'app-create-plan',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink],
    templateUrl: './create-plan.component.html',
    styleUrls: ['./create-plan.component.scss']
})
export class CreatePlanComponent implements OnInit {
    planName: string = '';
    planDescription: string = '';
    targetWordCount: number = 0;
    startDate: string = '';
    endDate: string = '';
    selectedColor: string = '#6366f1';
    contentType: string = 'Novella';
    isPrivate: boolean = false;

    // Goals
    startingPoint: number = 0;
    measurementUnit: string = 'words';
    isDailyTarget: boolean = false;
    fixedDeadline: boolean = true;
    targetFinishDate: string = '';

    // Strategy
    strategyType: string = 'Steady';
    strategyIntensity: string = 'Average';

    // Customizations
    weekendApproach: string = 'The Usual';
    reserveDays: number = 0;

    // Display
    displayViewType: 'Table' | 'Graph' | 'Calendar' | 'Bar' = 'Table';
    weekStartDay: 'Sundays' | 'Mondays' = 'Mondays';
    groupingType: 'Day' | 'Week' | 'Month' | 'Year' = 'Day';
    dashboardColor: string = '#000000';

    // Progress
    showHistoricalData: boolean = true;
    progressTrackingType: string = 'Daily Goals';

    viewMode: 'schedule' | 'progress' | 'stats' = 'schedule';
    username: string = 'User';

    // Display Views data
    planDays: PlanDay[] = [];
    totalDays: number = 0;
    daysLeft: number = 0;

    // Progress Tab data
    progressEntries: ProgressUpdate[] = [];

    // Stats Tab data
    dailyAvg: number = 0;
    weeklyAvg: number = 0;
    weekdayAvg: number = 0;
    weekendAvg: number = 0;

    // Chart Refinement
    hoveredDay: PlanDay | null = null;

    // Edit Mode properties
    planId: number | null = null;
    isEditMode: boolean = false;
    isLoading: boolean = false;

    // Share dropdown
    showShareDropdown: boolean = false;

    constructor(
        private apiService: ApiService,
        private router: Router,
        private route: ActivatedRoute,
        private notificationService: NotificationService
    ) { }

    ngOnInit() {
        // Check if user is logged in
        this.username = localStorage.getItem('username') || 'User';
        if (!localStorage.getItem('user_id')) {
            this.router.navigate(['/login']);
        }

        // Close share dropdown when clicking outside
        document.addEventListener('click', (event) => {
            const target = event.target as HTMLElement;
            if (!target.closest('.share-dropdown')) {
                this.showShareDropdown = false;
            }
        });

        // Check for edit mode
        this.route.paramMap.subscribe(params => {
            const id = params.get('id');
            if (id) {
                this.isEditMode = true;
                this.planId = +id;
                this.loadPlan(this.planId);
            } else {
                this.initializeNewPlan();
            }
        });
    }

    initializeNewPlan() {
        // Default start date to today
        const today = new Date();
        this.startDate = today.toISOString().split('T')[0];

        // Default end date to 30 days from now
        const thirtyDaysLater = new Date();
        thirtyDaysLater.setDate(today.getDate() + 30);
        this.endDate = thirtyDaysLater.toISOString().split('T')[0];

        this.generatePlanData();
    }

    loadPlan(id: number) {
        this.isLoading = true;
        this.apiService.getPlan(id).subscribe({
            next: (response) => {
                if (response.success && response.data) {
                    const plan = response.data;
                    this.planName = plan.plan_name;
                    this.targetWordCount = plan.target_amount;
                    // Format dates to YYYY-MM-DD
                    this.startDate = new Date(plan.start_date).toISOString().split('T')[0];
                    this.endDate = new Date(plan.end_date).toISOString().split('T')[0];
                    this.contentType = plan.content_type || 'Novella';
                    this.strategyType = plan.algorithm_type ? this.capitalize(plan.algorithm_type) : 'Steady';
                    this.planDescription = plan.description || '';
                    this.isPrivate = plan.is_private || false;
                    this.startingPoint = plan.starting_point || 0;
                    this.measurementUnit = plan.measurement_unit || 'words';
                    this.isDailyTarget = plan.is_daily_target || false;
                    this.fixedDeadline = plan.fixed_deadline === undefined ? true : plan.fixed_deadline;
                    this.targetFinishDate = plan.target_finish_date || '';
                    this.strategyIntensity = plan.strategy_intensity || 'Average';
                    this.weekendApproach = plan.weekend_approach || 'The Usual';
                    this.reserveDays = plan.reserve_days || 0;
                    this.displayViewType = plan.display_view_type || 'Table';
                    this.weekStartDay = plan.week_start_day || 'Mondays';
                    this.groupingType = plan.grouping_type || 'Day';
                    this.dashboardColor = plan.dashboard_color || '#000000';
                    this.showHistoricalData = plan.show_historical_data === undefined ? true : plan.show_historical_data;
                    this.progressTrackingType = plan.progress_tracking_type || 'Daily Goals';

                    this.generatePlanData();
                    this.loadPlanProgress(id);
                } else {
                    this.notificationService.showError('Plan not found');
                    this.router.navigate(['/dashboard']);
                }
            },
            error: (err) => {
                console.error('Error loading plan', err);
                this.notificationService.showError('Error loading plan');
                this.isLoading = false;
            }
        });
    }

    loadPlanProgress(id: number) {
        this.apiService.getPlanDays(id).subscribe({
            next: (response) => {
                if (response.success && response.data) {
                    this.progressEntries = response.data.map((d: any) => ({
                        id: new Date(d.date).getTime(),
                        date: new Date(d.date),
                        targetWords: d.target_count,
                        actualWords: d.actual_count,
                        notes: d.notes || '',
                        isToday: this.isSameDay(new Date(d.date), new Date())
                    }));
                }
                this.isLoading = false;
            },
            error: (err) => {
                console.error('Error loading progress', err);
                this.isLoading = false;
            }
        });
    }

    capitalize(s: string) {
        return s.charAt(0).toUpperCase() + s.slice(1);
    }

    isSameDay(d1: Date, d2: Date) {
        return d1.getFullYear() === d2.getFullYear() &&
            d1.getMonth() === d2.getMonth() &&
            d1.getDate() === d2.getDate();
    }

    generatePlanData() {
        if (!this.startDate || !this.endDate || this.targetWordCount <= 0) {
            this.planDays = [];
            this.totalDays = 0;
            this.calculateStats(); // Call calculateStats even if no plan days to reset averages
            return;
        }

        const start = new Date(this.startDate);
        const end = new Date(this.endDate);
        const diffTime = Math.abs(end.getTime() - start.getTime());
        this.totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const diffToday = end.getTime() - today.getTime();
        this.daysLeft = Math.max(0, Math.ceil(diffToday / (1000 * 60 * 60 * 24)));

        this.planDays = [];
        let cumulativeTarget = 0;

        for (let i = 0; i < this.totalDays; i++) {
            const current = new Date(start);
            current.setDate(start.getDate() + i);

            let dailyTarget = 0;
            const t = i / (this.totalDays - 1 || 1);

            switch (this.strategyType) {
                case 'Front-load':
                    dailyTarget = (this.targetWordCount / this.totalDays) * (1.5 - t);
                    break;
                case 'Back-load':
                    dailyTarget = (this.targetWordCount / this.totalDays) * (0.5 + t);
                    break;
                case 'Mountain':
                    const factor = 1 - Math.abs(0.5 - t) * 2;
                    dailyTarget = (this.targetWordCount / this.totalDays) * (0.5 + factor);
                    break;
                case 'Valley':
                    const valleyFactor = Math.abs(0.5 - t) * 2;
                    dailyTarget = (this.targetWordCount / this.totalDays) * (0.5 + valleyFactor);
                    break;
                case 'Oscillating':
                    const sineFactor = Math.sin(t * Math.PI * 4) * 0.5 + 1;
                    dailyTarget = (this.targetWordCount / this.totalDays) * sineFactor;
                    break;
                case 'Steady':
                default:
                    dailyTarget = this.targetWordCount / this.totalDays;
                    break;
            }

            dailyTarget = Math.round(dailyTarget);
            cumulativeTarget += dailyTarget;

            if (i === this.totalDays - 1) {
                const diff = this.targetWordCount - cumulativeTarget;
                dailyTarget += diff;
                cumulativeTarget = this.targetWordCount;
            }

            this.planDays.push({
                num: i + 1,
                day: current.toLocaleDateString('en-US', { weekday: 'short' }),
                date: current.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }),
                dateObj: current,
                workToComplete: dailyTarget,
                actualWorkDone: 0,
                expectedProgress: cumulativeTarget,
                yourActualProgress: 0,
                workLeft: this.targetWordCount - cumulativeTarget
            });
        }
        this.calculateStats();
    }

    calculateStats() {
        if (this.planDays.length === 0) {
            this.dailyAvg = 0;
            this.weeklyAvg = 0;
            this.weekdayAvg = 0;
            this.weekendAvg = 0;
            return;
        }

        const totalWords = this.targetWordCount;
        this.dailyAvg = Math.round(totalWords / this.totalDays);
        this.weeklyAvg = this.dailyAvg * 7;

        let weekdayTotal = 0;
        let weekdayCount = 0;
        let weekendTotal = 0;
        let weekendCount = 0;

        this.planDays.forEach(day => {
            const date = new Date(day.dateObj);
            const isWeekend = date.getDay() === 0 || date.getDay() === 6;
            if (isWeekend) {
                weekendTotal += day.workToComplete;
                weekendCount++;
            } else {
                weekdayTotal += day.workToComplete;
                weekdayCount++;
            }
        });

        this.weekdayAvg = weekdayCount > 0 ? Math.round(weekdayTotal / weekdayCount) : 0;
        this.weekendAvg = weekendCount > 0 ? Math.round(weekendTotal / weekendCount) : 0;
    }

    onDateChange() {
        this.generatePlanData();
    }

    onTargetChange() {
        this.generatePlanData();
    }

    onStrategyChange() {
        this.generatePlanData();
    }

    getMaxDailyTarget(): number {
        return Math.max(...this.planDays.map(d => d.workToComplete), 1);
    }

    getTodayTarget(): number {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayDay = this.planDays.find(d => {
            const dObj = new Date(d.dateObj);
            dObj.setHours(0, 0, 0, 0);
            return dObj.getTime() === today.getTime();
        });
        return todayDay ? todayDay.workToComplete : 0;
    }

    getFormattedDateRange(): string {
        if (!this.startDate || !this.endDate) return '';
        const start = new Date(this.startDate);
        const end = new Date(this.endDate);
        const startStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).replace(start.getDate().toString(), this.getOrdinalNum(start.getDate()));
        const endStr = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).replace(end.getDate().toString(), this.getOrdinalNum(end.getDate()));
        return `${startStr} - ${endStr}`;
    }

    getOrdinalNum(n: number): string {
        return n + (n > 0 ? ['th', 'st', 'nd', 'rd'][(n > 10 && n < 14) ? 0 : (n % 10 < 4 ? n % 10 : 0)] : '');
    }

    addProgressEntry() {
        const today = new Date();
        const existing = this.progressEntries.find(e => this.isSameDay(new Date(e.date), today));
        if (!existing) {
            this.progressEntries.push({
                id: Date.now(),
                date: today,
                targetWords: this.getTodayTarget(),
                actualWords: 0,
                notes: '',
                isToday: true
            });
        }
    }

    removeProgressEntry(id: number) {
        this.progressEntries = this.progressEntries.filter(e => e.id !== id);
    }

    saveProgress() {
        if (!this.planId) {
            this.notificationService.showError('Cannot save progress for unsaved plan.');
            return;
        }

        const entries = this.progressEntries; // All entries
        let successCount = 0;
        let failCount = 0;

        // Naive loop implementation - in production, backend should have bulk endpoint
        entries.forEach(entry => {
            const dateStr = new Date(entry.date).toISOString().split('T')[0];
            this.apiService.logProgress(this.planId!, dateStr, entry.actualWords, entry.notes).subscribe({
                next: (res) => {
                    successCount++;
                    if (successCount + failCount === entries.length) {
                        this.notificationService.showSuccess('Progress saved successfully!');
                    }
                },
                error: (err) => {
                    console.error('Error saving progress for ' + dateStr, err);
                    failCount++;
                }
            });
        });

        // Immediate feedback if no entries
        if (entries.length === 0) {
            this.notificationService.showSuccess('No progress entries to save.');
        }
    }

    getLinePath(): string {
        if (this.planDays.length < 2) return '';
        const max = this.getMaxDailyTarget();
        const width = 800;
        const height = 200;
        const step = width / (this.planDays.length - 1);

        return this.planDays.map((day, i) => {
            const x = i * step;
            const y = height - (day.workToComplete / max) * height;
            return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
        }).join(' ');
    }

    getCumulativePath(): string {
        if (this.planDays.length < 2) return '';
        const max = this.targetWordCount;
        const width = 800;
        const height = 200;
        const step = width / (this.planDays.length - 1);

        return this.planDays.map((day, i) => {
            const x = i * step;
            const y = height - (day.expectedProgress / max) * height;
            return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
        }).join(' ');
    }

    getDailyPoints(): { x: number, y: number, day: PlanDay }[] {
        if (this.planDays.length === 0) return [];
        const max = this.getMaxDailyTarget();
        const width = 800;
        const height = 200;
        const step = width / (this.planDays.length - 1 || 1);

        return this.planDays.map((day, i) => ({
            x: i * step,
            y: height - (day.workToComplete / max) * height,
            day: day
        }));
    }

    getCumulativePoints(): { x: number, y: number, day: PlanDay }[] {
        if (this.planDays.length === 0) return [];
        const max = this.targetWordCount;
        const width = 800;
        const height = 200;
        const step = width / (this.planDays.length - 1 || 1);

        return this.planDays.map((day, i) => ({
            x: i * step,
            y: height - (day.expectedProgress / max) * height,
            day: day
        }));
    }

    getGridLines(max: number): number[] {
        const lines = [];
        const step = max / 4;
        for (let i = 0; i <= 4; i++) {
            lines.push(i * step);
        }
        return lines;
    }

    getYPos(val: number, max: number): number {
        return 200 - (val / max) * 200;
    }

    savePlan() {
        if (!this.planName) {
            this.notificationService.showError('Please enter a plan name.');
            return;
        }

        if (this.targetWordCount <= 0) {
            this.notificationService.showError('Please enter a valid target word count.');
            return;
        }

        const payload = {
            title: this.planName,
            total_word_count: this.targetWordCount,
            start_date: this.startDate,
            end_date: this.endDate,
            content_type: this.contentType,
            algorithm_type: this.strategyType.toLowerCase(),
            description: this.planDescription,
            is_private: this.isPrivate,
            starting_point: this.startingPoint,
            measurement_unit: this.measurementUnit,
            is_daily_target: this.isDailyTarget,
            fixed_deadline: this.fixedDeadline,
            target_finish_date: this.targetFinishDate || null,
            strategy_intensity: this.strategyIntensity,
            weekend_approach: this.weekendApproach,
            reserve_days: this.reserveDays,
            display_view_type: this.displayViewType,
            week_start_day: this.weekStartDay,
            grouping_type: this.groupingType,
            dashboard_color: this.dashboardColor,
            show_historical_data: this.showHistoricalData,
            progress_tracking_type: this.progressTrackingType
        };

        if (this.isEditMode && this.planId) {
            this.apiService.updatePlan(this.planId, payload).subscribe({
                next: (response) => {
                    if (response.success) {
                        // Success message is shown by interceptor
                        this.router.navigate(['/dashboard']);
                    } else {
                        this.notificationService.showError(response.message || 'Failed to update plan');
                    }
                },
                error: (error) => {
                    console.error('Error updating plan:', error);
                    // Error message is shown by interceptor
                }
            });
            return;
        }

        // console.log('Sending plan to backend:', payload);

        this.apiService.createPlan(payload).subscribe({
            next: (response) => {
                if (response.success) {
                    // Success message is shown by interceptor
                    this.router.navigate(['/dashboard']);
                } else {
                    this.notificationService.showError(response.message || 'Failed to create plan');
                }
            },
            error: (error) => {
                console.error('Error creating plan:', error);
                // Error message is shown by interceptor
            }
        });
    }

    cancel() {
        this.router.navigate(['/dashboard']);
    }

    insertFormatting(type: string) {
        const textarea = document.querySelector('textarea[placeholder="Enter a description"]') as HTMLTextAreaElement;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = this.planDescription;
        let prefix = '', suffix = '';

        switch (type) {
            case 'bold': prefix = '**'; suffix = '**'; break;
            case 'italic': prefix = '_'; suffix = '_'; break;
            case 'list-ul': prefix = '\n- '; break;
            case 'list-ol': prefix = '\n1. '; break;
        }

        this.planDescription = text.substring(0, start) + prefix + text.substring(start, end) + suffix + text.substring(end);

        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + prefix.length, end + prefix.length);
        });
    }

    // Share functionality methods
    toggleShareDropdown() {
        this.showShareDropdown = !this.showShareDropdown;
    }

    copyPlanLink() {
        const planUrl = `${window.location.origin}/plans/${this.planId || 'new'}`;
        navigator.clipboard.writeText(planUrl).then(() => {
            this.notificationService.showSuccess('Plan link copied to clipboard!');
            this.showShareDropdown = false;
        }).catch(() => {
            this.notificationService.showError('Failed to copy link');
        });
    }

    shareToTwitter() {
        const planUrl = `${window.location.origin}/plans/${this.planId || 'new'}`;
        const text = `Check out my writing plan: ${this.planName || 'My Writing Goal'}`;
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(planUrl)}`;
        window.open(twitterUrl, '_blank');
        this.showShareDropdown = false;
    }

    shareToFacebook() {
        const planUrl = `${window.location.origin}/plans/${this.planId || 'new'}`;
        const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(planUrl)}`;
        window.open(facebookUrl, '_blank');
        this.showShareDropdown = false;
    }

    togglePlanVisibility() {
        this.isPrivate = !this.isPrivate;
        this.notificationService.showSuccess(`Plan is now ${this.isPrivate ? 'private' : 'public'}`);
        this.showShareDropdown = false;
    }
}
