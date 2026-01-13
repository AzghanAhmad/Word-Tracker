import { Component, OnInit, AfterViewInit, OnDestroy, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { NotificationService } from '../../services/notification.service';
import { Subscription, filter } from 'rxjs';
import { OutputStatsChartComponent, WordEntry } from '../stats/output-stats-chart/output-stats-chart.component';
import { DailyStatsChartComponent } from '../stats/daily-stats-chart/daily-stats-chart.component';
import { QuillModule } from 'ngx-quill';

export interface PlanDay {
    num: number;
    day: string;
    date: string;
    isoDate: string; // YYYY-MM-DD for reliable date pipe parsing
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
    trend?: 'up' | 'down' | 'steady';
    percentOfTarget?: number;
}

@Component({
    selector: 'app-create-plan',
    standalone: true,
    imports: [CommonModule, FormsModule, OutputStatsChartComponent, DailyStatsChartComponent, QuillModule],
    templateUrl: './create-plan.component.html',
    styleUrls: ['./create-plan.component.scss']
})
export class CreatePlanComponent implements OnInit, AfterViewInit {
    protected readonly Math = Math;
    planName: string = '';
    planDescription: string = '';
    targetWordCount: number = 0;
    startDate: string = '';
    endDate: string = '';
    selectedColor: string = '#1C2E4A';
    contentType: string = 'Novella';
    isPrivate: boolean = false;

    // Goals
    startingPoint: number = 0;
    measurementUnit: string = 'word';
    isDailyTarget: boolean = false;
    fixedDeadline: boolean = true;
    targetFinishDate: string = '';

    // Strategy
    strategyType: string = 'Steady';
    strategyIntensity: string = 'Average';
    activityType: string = 'Drafting';

    // Customizations
    weekendApproach: string = 'The Usual';
    reserveDays: number = 0;
    availabilityEvents: any[] = [];
    weekdayOverrides: { [day: number]: number } = {};
    dateOverrides: { [date: string]: number } = {};
    dateRangeOverrides: { start: string, end: string, multiplier: number }[] = [];

    // UI State for Overrides
    showOverrideForm: 'weekday' | 'date' | 'range' | null = null;
    newOverride: any = {
        day: 1,
        date: '',
        start: '',
        end: '',
        approach: 'The Usual'
    };

    // Display
    displayViewType: 'Table' | 'Graph' | 'Calendar' | 'Bar' = 'Table';
    weekStartDay: 'Sundays' | 'Mondays' = 'Mondays';
    groupingType: 'Day' | 'Week' | 'Month' | 'Year' = 'Day';
    dashboardColor: string = '#000000';

    // Progress
    showHistoricalData: boolean = true;
    progressTrackingType: string = 'Daily Goals';
    status: string = 'active';
    currentProgress: number = 0;
    planAdjustment: 'adjust' | 'fixed' = 'fixed';
    recordingType: 'overall' | 'daily' = 'overall';

    viewMode: 'plan' | 'schedule' | 'progress' | 'stats' = 'schedule';
    manualInputDate: string = new Date().toISOString().split('T')[0];
    manualWordCount: number | null = null;

    // Collapsible Section States
    sections = {
        projectInfo: true,
        goalDefinition: true,
        scheduleRules: true,
        preferences: true,
        customizations: true,
        progressBehavior: true
    };

    getUnitLabel(count: number): string {
        const unit = this.measurementUnit?.toLowerCase() || 'word';

        if (Math.abs(count) === 1) {
            return unit;
        }

        // Handle specific irregulars or abbreviations from the dropdown
        const mappings: { [key: string]: string } = {
            'word': 'words',
            'page': 'pages',
            'poem': 'poems',
            'chapter': 'chapters',
            'section': 'sections',
            'character': 'characters',
            'verse': 'verses',
            'act': 'acts',
            'scene': 'scenes',
            'stanza': 'stanzas',
            'line': 'lines',
            'book': 'books',
            'day': 'days',
            'hour': 'hours',
            'minute': 'minutes',
            'unit': 'units',
            'item': 'items',
            'task': 'tasks',
            'todo': 'todos',
            'step': 'steps',
            'entry': 'entries',
            'post': 'posts',
            'worksheet': 'worksheets',
            'dollar': 'dollars',
            'mile': 'miles',
            'km': 'kilometers',
            'lb': 'pounds',
            'kg': 'kilograms',
            'stitch': 'stitches',
            'time': 'times',
            'episode': 'episodes',
            'video': 'videos',
            'movie': 'movies',
            'lesson': 'lessons',
            'feature': 'features'
        };

        return mappings[unit] || unit + 's';
    }

    username: string = 'User';

    // Display Views data
    planDays: PlanDay[] = [];
    calendarDays: any[] = [];
    currentCalendarDate: Date = new Date();
    totalDays: number = 0;
    daysLeft: number = 0;

    // Progress Tab data
    progressEntries: ProgressUpdate[] = [];

    saveManualProgress() {
        if (this.manualWordCount === null || this.manualWordCount < 0) {
            this.notificationService.showError('Please enter a valid word count');
            return;
        }

        const dateStr = this.manualInputDate;
        const progressDate = new Date(dateStr);

        // Find if we already have an entry for this day in planDays
        const existingDay = this.planDays.find(d => d.date === dateStr || d.isoDate === dateStr);
        if (existingDay) {
            existingDay.actualWorkDone = this.manualWordCount;
        }

        if (this.isEditMode && this.planId) {
            this.isLoading = true;
            this.apiService.logProgress(this.planId, dateStr, this.manualWordCount, '').subscribe({
                next: (res) => {
                    this.notificationService.showSuccess('Progress recorded successfully');
                    this.loadPlanProgress(this.planId!); // Reload all progress data
                    this.manualWordCount = null; // Clear input
                    this.isLoading = false;
                    this.cdr.detectChanges();
                },
                error: (err) => {
                    console.error('Error logging manual progress', err);
                    this.notificationService.showError('Failed to save progress');
                    this.isLoading = false;
                    this.cdr.detectChanges();
                }
            });
        } else {
            // New plan mode - update progressEntries locally
            const existingEntryIndex = this.progressEntries.findIndex(e =>
                this.isSameDay(e.date, progressDate)
            );

            const newEntry: ProgressUpdate = {
                id: existingEntryIndex >= 0 ? this.progressEntries[existingEntryIndex].id : Date.now(),
                date: progressDate,
                targetWords: existingDay?.workToComplete || 0,
                actualWords: this.manualWordCount,
                notes: '',
                isToday: this.isSameDay(progressDate, new Date())
            };

            if (existingEntryIndex >= 0) {
                // Update existing entry
                this.progressEntries[existingEntryIndex] = newEntry;
            } else {
                // Add new entry
                this.progressEntries.push(newEntry);
            }

            // Recalculate stats and update UI
            this.recalculateCumulativeStats();
            this.generateCalendarDays();
            this.notificationService.showSuccess('Progress recorded locally');
            this.manualWordCount = null;
            this.cdr.detectChanges();
        }
    }

    // Stats Tab data
    dailyAvg: number = 0;
    weeklyAvg: number = 0;
    weekdayAvg: number = 0;
    weekendAvg: number = 0;
    totalWordsLogged: number = 0;
    bestDay: { date: string, count: number } | null = null;
    currentStreak: number = 0;
    wordsRemaining: number = 0;
    onTrackPercent: number = 0;
    onTrackStatus: string = '';
    recentActivity: { day: string, count: number, height: number }[] = [];

    get chartData(): WordEntry[] {
        return this.planDays.map(day => {
            return {
                date: day.isoDate,
                count: day.actualWorkDone || 0,
                target: day.workToComplete
            };
        });
    }

    get scheduledWorkData(): WordEntry[] {
        if (!this.planDays || this.planDays.length === 0) return [];

        if (this.groupingType === 'Day') {
            return this.planDays.map(day => ({
                date: day.isoDate,
                count: day.actualWorkDone || 0,
                target: day.workToComplete
            }));
        }

        const grouped: { [key: string]: { count: number, target: number } } = {};

        this.planDays.forEach(day => {
            let key: string;
            const date = new Date(day.dateObj);

            if (this.groupingType === 'Week') {
                // Determine week start based on weekStartDay preference
                const startDayIndex = this.weekStartDay === 'Sundays' ? 0 : 1;
                const currentDayIndex = date.getDay();
                let diff = currentDayIndex - startDayIndex;
                if (diff < 0) diff += 7;

                const weekStart = new Date(date);
                weekStart.setDate(date.getDate() - diff);
                key = weekStart.toISOString().split('T')[0];
            } else if (this.groupingType === 'Month') {
                key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
            } else if (this.groupingType === 'Year') {
                key = `${date.getFullYear()}-01-01`;
            } else {
                key = day.isoDate;
            }

            if (!grouped[key]) {
                grouped[key] = { count: 0, target: 0 };
            }
            grouped[key].count += day.actualWorkDone || 0;
            grouped[key].target += day.workToComplete || 0;
        });

        return Object.keys(grouped).sort().map(date => ({
            date,
            count: grouped[date].count,
            target: grouped[date].target
        }));
    }

    // Chart Refinement
    hoveredDay: PlanDay | null = null;

    // Edit Mode properties
    planId: number | null = null;
    isEditMode: boolean = false;
    isLoading: boolean = false;

    // Quill Editor Configuration
    quillModules = {
        toolbar: [
            ['bold', 'italic', 'underline'],
            [{ 'header': [1, 2, 3, false] }],
            [{ 'list': 'ordered' }, { 'list': 'bullet' }],
            [{ 'align': [] }],
            ['clean']
        ]
    };

    // Share dropdown
    showShareDropdown: boolean = false;

    // Description word counter
    maxDescriptionWords: number = 300;

    private routeSubscription?: Subscription;
    private navigationSubscription?: Subscription;

    constructor(
        private apiService: ApiService,
        private router: Router,
        private route: ActivatedRoute,
        private notificationService: NotificationService,
        private cdr: ChangeDetectorRef
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

        // Load data immediately
        this.loadPlanData();

        // Subscribe to route params
        this.routeSubscription = this.route.paramMap.subscribe(params => {
            const id = params.get('id');
            if (id) {
                this.isEditMode = true;
                this.planId = +id;
                this.loadPlan(this.planId);
            } else {
                this.isEditMode = false;
                this.planId = null;
                this.initializeNewPlan();
            }
        });

        // Reload on navigation back to this page
        this.navigationSubscription = this.router.events.pipe(
            filter(event => event instanceof NavigationEnd)
        ).subscribe((event: any) => {
            if (event.url.includes('/plans/edit/')) {
                console.log('Reloading plan edit data on navigation');
                // Use setTimeout to ensure component is ready
                setTimeout(() => {
                    this.loadPlanData();
                }, 100);
            }
        });
    }

    ngAfterViewInit() {
    }

    ngOnDestroy() {
        if (this.routeSubscription) {
            this.routeSubscription.unsubscribe();
        }
        if (this.navigationSubscription) {
            this.navigationSubscription.unsubscribe();
        }
    }


    setWeekendApproach(approach: string) {
        this.weekendApproach = approach;
        this.generatePlanData();
        this.cdr.detectChanges();
    }

    addWeekdayOverride() {
        this.showOverrideForm = 'weekday';
        this.newOverride = { day: 1, approach: 'The Usual' };
    }

    addSpecificDateOverride() {
        this.showOverrideForm = 'date';
        this.newOverride = { date: this.manualInputDate || this.startDate, approach: 'Skip' };
    }

    addDateRangeOverride() {
        this.showOverrideForm = 'range';
        this.newOverride = { start: this.startDate, end: this.endDate, approach: 'Skip' };
    }

    cancelOverride() {
        this.showOverrideForm = null;
    }

    saveOverride() {
        const multipliers: { [key: string]: number } = {
            'Skip': 0,
            'Do Less': 0.5,
            'The Usual': 1,
            'Do More': 1.5,
            'Push!': 2
        };

        const mult = multipliers[this.newOverride.approach];

        if (this.showOverrideForm === 'weekday') {
            this.weekdayOverrides[this.newOverride.day] = mult;
            this.notificationService.showSuccess(`Workload updated for all selected weekdays`);
        } else if (this.showOverrideForm === 'date') {
            if (this.newOverride.date) {
                this.dateOverrides[this.newOverride.date] = mult;
                this.notificationService.showSuccess(`Workload updated for ${this.newOverride.date}`);
            }
        } else if (this.showOverrideForm === 'range') {
            if (this.newOverride.start && this.newOverride.end) {
                this.dateRangeOverrides.push({
                    start: this.newOverride.start,
                    end: this.newOverride.end,
                    multiplier: mult
                });
                this.notificationService.showSuccess(`Workload updated for range ${this.newOverride.start} to ${this.newOverride.end}`);
            }
        }

        this.showOverrideForm = null;
        this.generatePlanData();
        this.cdr.detectChanges();
    }

    setViewMode(mode: 'plan' | 'schedule' | 'progress' | 'stats') {
        this.viewMode = mode;
        this.recalculateCumulativeStats();
        this.cdr.detectChanges();
    }

    loadPlanData() {
        const id = this.route.snapshot.paramMap.get('id');
        if (id) {
            this.isEditMode = true;
            this.planId = +id;
            this.loadPlan(this.planId);
        } else {
            this.isEditMode = false;
            this.planId = null;
            this.initializeNewPlan();
        }
    }

    initializeNewPlan() {
        this.viewMode = 'schedule';
        // Default start date to today
        const today = new Date();
        this.startDate = today.toISOString().split('T')[0];

        // Default end date to 30 days from now
        const thirtyDaysLater = new Date();
        thirtyDaysLater.setDate(today.getDate() + 30);
        this.endDate = thirtyDaysLater.toISOString().split('T')[0];

        this.generatePlanData();
        this.planDescription = '';
    }

    loadPlan(id: number) {
        console.log(`📥 Loading plan with ID: ${id}`);
        this.isLoading = true;

        // Use setTimeout to avoid change detection issues
        setTimeout(() => {
            this.cdr.detectChanges();
        }, 0);

        this.apiService.getPlan(id).subscribe({
            next: (response) => {
                console.log(`✅ Plan response received:`, response);
                if (response.success && response.data) {
                    const plan = response.data;
                    console.log(`📋 Plan data:`, plan);

                    // Helper function to safely parse dates
                    const safeDateParse = (dateStr: any): string => {
                        if (!dateStr) return '';
                        try {
                            const date = new Date(dateStr);
                            if (isNaN(date.getTime())) {
                                console.warn(`⚠️ Invalid date: ${dateStr}`);
                                return '';
                            }
                            return date.toISOString().split('T')[0];
                        } catch (e) {
                            console.error(`❌ Error parsing date ${dateStr}:`, e);
                            return '';
                        }
                    };

                    // Load all plan fields
                    this.planName = plan.plan_name || plan.title || '';
                    this.targetWordCount = plan.target_amount || plan.total_word_count || 0;

                    // Format dates to YYYY-MM-DD with validation
                    this.startDate = safeDateParse(plan.start_date);
                    this.endDate = safeDateParse(plan.end_date);
                    this.targetFinishDate = safeDateParse(plan.target_finish_date);

                    this.contentType = plan.content_type || 'Novella';
                    this.strategyType = plan.algorithm_type ? this.capitalize(plan.algorithm_type) : 'Steady';
                    this.planDescription = plan.description || '';
                    this.isPrivate = plan.is_private || false;
                    this.startingPoint = plan.starting_point || 0;
                    // Map "words" (plural, old format) to "word" (singular, new format) for backward compatibility
                    const measurementUnit = plan.measurement_unit || 'word';
                    this.measurementUnit = measurementUnit === 'words' ? 'word' : measurementUnit;
                    this.isDailyTarget = plan.is_daily_target || false;
                    this.fixedDeadline = plan.fixed_deadline === undefined ? true : plan.fixed_deadline;
                    this.strategyIntensity = plan.strategy_intensity || 'Average';
                    // Map backend values to frontend display values
                    const backendWeekendApproach = plan.weekend_approach || 'The Usual';
                    // Map "None" to "None" (for Adaptive rest), keep others as is
                    this.weekendApproach = backendWeekendApproach === 'None' ? 'None' :
                        backendWeekendApproach === 'Weekdays Only' ? 'Weekdays Only' :
                            backendWeekendApproach === 'The Usual' ? 'The Usual' : 'The Usual';
                    this.reserveDays = plan.reserve_days || 0;
                    this.displayViewType = plan.display_view_type || 'Table';
                    this.weekStartDay = plan.week_start_day || 'Mondays';
                    this.groupingType = plan.grouping_type || 'Day';
                    this.dashboardColor = plan.dashboard_color || plan.color_code || '#000000';
                    this.showHistoricalData = plan.show_historical_data === undefined ? true : plan.show_historical_data;
                    this.progressTrackingType = plan.progress_tracking_type || 'Daily Goals';

                    // Handle status - backend returns db_status for raw value, status for display
                    const rawStatus = plan.db_status || plan.status || 'active';
                    this.status = rawStatus;
                    // Normalize status to lowercase for backend
                    if (this.status && typeof this.status === 'string') {
                        const statusLower = this.status.toLowerCase();
                        if (statusLower === 'in progress') this.status = 'active';
                        else if (statusLower === 'on hold') this.status = 'paused';
                        else if (statusLower === 'completed') this.status = 'completed';
                        else if (statusLower === 'archived') this.status = 'archived';
                    }

                    // Load current progress from database - this is the manual progress percentage
                    const savedProgress = plan.current_progress || 0;
                    this.currentProgress = savedProgress;
                    console.log(`📊 Loaded current progress from database: ${this.currentProgress}%`);

                    console.log(`✅ All plan fields loaded. Generating plan data...`);

                    // Load plan days from backend first to check if we have saved target_count values
                    // This preserves the original algorithm distribution (mountain, front-load, etc.)
                    this.loadPlanProgress(id, savedProgress).then(() => {
                        // Check if we have saved plan days with target_count
                        const hasSavedTargets = this.progressEntries.some(e => e.targetWords && e.targetWords > 0);

                        if (hasSavedTargets && this.progressEntries.length > 0) {
                            // Use saved plan days data instead of recalculating
                            console.log('📋 Using saved plan days from backend (preserving algorithm distribution)');
                            this.buildPlanDaysFromSavedData();
                        } else {
                            // No saved data, generate plan data (for backward compatibility)
                            console.log('📋 No saved plan days found, generating from algorithm');
                            this.generatePlanData(true);
                            this.currentProgress = savedProgress;
                        }
                    });
                } else {
                    console.error(`❌ Plan not found or invalid response`);
                    this.notificationService.showError('Plan not found');
                    setTimeout(() => {
                        this.isLoading = false;
                        this.cdr.detectChanges();
                        this.router.navigate(['/dashboard']);
                    }, 0);
                }
            },
            error: (err) => {
                console.error('❌ Error loading plan', err);
                this.notificationService.showError('Error loading plan');
                setTimeout(() => {
                    this.isLoading = false;
                    this.cdr.detectChanges();
                }, 0);
            }
        });
    }

    loadPlanProgress(id: number, progressToDisplay?: number): Promise<void> {
        return new Promise((resolve) => {
            console.log(`📊 Loading plan progress for plan ID: ${id}`);
            const savedProgress = progressToDisplay !== undefined ? progressToDisplay : this.currentProgress;
            console.log(`📊 Progress value to display: ${savedProgress}%`);

            this.apiService.getPlanDays(id).subscribe({
                next: (response) => {
                    console.log(`✅ Received plan days response:`, response);
                    if (response.success && response.data) {
                        this.progressEntries = response.data.map((d: any) => {
                            // Safely parse date
                            let date: Date;
                            try {
                                date = new Date(d.date);
                                if (isNaN(date.getTime())) {
                                    console.warn(`⚠️ Invalid date in progress entry: ${d.date}`);
                                    date = new Date(); // Fallback to today
                                }
                            } catch (e) {
                                console.error(`❌ Error parsing date ${d.date}:`, e);
                                date = new Date(); // Fallback to today
                            }

                            return {
                                id: d.id || date.getTime(),
                                date: date,
                                targetWords: d.target_count ?? d.workToComplete ?? d.work_to_complete ?? 0,
                                actualWords: d.actual_count ?? d.actualWorkDone ?? d.actual_work_done ?? 0,
                                notes: d.notes || '',
                                isToday: this.isSameDay(date, new Date())
                            };
                        });

                        // Don't sort here - we'll use getSortedProgressEntries() for display
                        // This keeps the raw data, and sorting happens in the display method

                        console.log(`📝 Loaded ${this.progressEntries.length} progress entries`);
                    } else {
                        this.progressEntries = [];
                        console.log(`ℹ️ No progress entries found`);
                    }

                    // If we found entries and planDays already exist, update them
                    // Otherwise, buildPlanDaysFromSavedData() will be called from loadPlan()
                    if (this.progressEntries.length > 0 && this.planDays.length > 0) {
                        console.log(`🔄 Updating existing plan days table with ${this.progressEntries.length} entries`);

                        // Clear any pre-distributed/implied data to prevent duplication
                        this.planDays.forEach(d => d.actualWorkDone = 0);

                        this.progressEntries.forEach(entry => {
                            const day = this.planDays.find(d => this.isSameDay(d.dateObj, entry.date));
                            if (day) {
                                day.actualWorkDone = entry.actualWords;

                                // Use saved target_count if available, otherwise keep calculated value
                                if (entry.targetWords && entry.targetWords > 0) {
                                    day.workToComplete = entry.targetWords;
                                }

                                try {
                                    const dateStr = entry.date instanceof Date && !isNaN(entry.date.getTime())
                                        ? entry.date.toISOString().split('T')[0]
                                        : 'unknown';
                                    console.log(`  ✓ Updated day ${dateStr}: ${entry.actualWords} words (Target: ${entry.targetWords || day.workToComplete})`);
                                } catch (e) {
                                    console.log(`  ✓ Updated day: ${entry.actualWords} words`);
                                }
                            } else {
                                try {
                                    const dateStr = entry.date instanceof Date && !isNaN(entry.date.getTime())
                                        ? entry.date.toISOString().split('T')[0]
                                        : 'unknown';
                                    console.log(`  ⚠️ Day not found in planDays for date: ${dateStr}`);
                                } catch (e) {
                                    console.log(`  ⚠️ Day not found in planDays`);
                                }
                            }
                        });

                        // Recalculate cumulative values after updating
                        let cumulativeTarget = 0;
                        let cumulativeActual = 0;
                        this.planDays.forEach(day => {
                            cumulativeTarget += day.workToComplete;
                            cumulativeActual += day.actualWorkDone || 0;
                            day.expectedProgress = cumulativeTarget;
                            day.yourActualProgress = cumulativeActual;
                            day.workLeft = this.targetWordCount - cumulativeActual;
                        });
                    }

                    // If we have manual progress but no logged entries, distribute it sequentially across days
                    // based on each day's target word count
                    if (this.currentProgress > 0 && this.planDays.length > 0) {
                        const totalImplied = Math.round((this.currentProgress / 100) * this.targetWordCount);
                        const currentLogged = this.planDays.reduce((sum, d) => sum + (d.actualWorkDone || 0), 0);
                        const diff = totalImplied - currentLogged;

                        console.log(`📊 Manual progress: ${this.currentProgress}% = ${totalImplied} words, Current logged: ${currentLogged}, Diff: ${diff}`);

                        if (diff > 0 && this.progressEntries.length === 0) {
                            // Only distribute if there are no existing progress entries
                            console.log(`🔄 Distributing ${totalImplied} words sequentially across days`);
                            // Distribute progress sequentially across days based on their target word counts
                            let remainingToDistribute = totalImplied; // Start fresh distribution

                            // Reset all days first
                            this.planDays.forEach(d => d.actualWorkDone = 0);

                            // Then distribute sequentially
                            for (let i = 0; i < this.planDays.length && remainingToDistribute > 0; i++) {
                                const day = this.planDays[i];
                                const dayTarget = day.workToComplete || 0;

                                if (dayTarget > 0) {
                                    // Calculate how much to add to this day
                                    const wordsForThisDay = Math.min(dayTarget, remainingToDistribute);
                                    day.actualWorkDone = wordsForThisDay;
                                    remainingToDistribute -= wordsForThisDay;
                                    console.log(`  ✓ Day ${i + 1}: ${wordsForThisDay} words (target: ${dayTarget})`);
                                }
                            }
                        }
                    }

                    // Use the saved progress value that was passed in
                    const progressToShow = savedProgress;

                    // Calculate actual progress from logged words for comparison
                    const totalLogged = this.planDays.reduce((sum, d) => sum + (d.actualWorkDone || 0), 0);
                    const calculatedProgress = this.targetWordCount > 0
                        ? Math.min(100, Math.round((totalLogged / this.targetWordCount) * 100))
                        : 0;

                    console.log(`📊 Progress comparison: Manual (from DB) = ${progressToShow}%, Calculated (from words) = ${calculatedProgress}%`);

                    // Recalculate all stats and cumulative values
                    // Pass true to skipProgressUpdate so we don't overwrite the manual progress
                    this.recalculateCumulativeStats(true);

                    // Always use the manual progress from database for the text box
                    // This ensures the user sees the stored progress percentage when editing
                    this.currentProgress = progressToShow;

                    // Load streak from backend stats API (matches profile)
                    this.loadStreakFromBackend();

                    console.log(`✅ Plan progress loading complete. Progress displayed in text box: ${this.currentProgress}%`);

                    // Mark loading as complete and update UI
                    this.isLoading = false;
                    this.generateCalendarDays();
                    this.cdr.detectChanges();
                    resolve();
                },
                error: (err) => {
                    console.error('❌ Error loading progress', err);
                    this.notificationService.showError('Error loading plan progress');
                    this.isLoading = false;
                    this.cdr.detectChanges();
                    resolve();
                }
            });
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

    changeCalendarMonth(delta: number) {
        const newDate = new Date(this.currentCalendarDate);
        newDate.setMonth(newDate.getMonth() + delta);
        this.currentCalendarDate = newDate;
        this.generateCalendarDays();
    }

    generateCalendarDays() {
        const year = this.currentCalendarDate.getFullYear();
        const month = this.currentCalendarDate.getMonth();
        const firstDay = new Date(year, month, 1).getDay(); // 0 is Sunday

        // Adjust for Monday start if needed
        const MondayStartOffset = (firstDay === 0 ? 6 : firstDay - 1);
        const startOffset = this.weekStartDay === 'Mondays' ? MondayStartOffset : firstDay;

        const daysInMonth = new Date(year, month + 1, 0).getDate();

        const days = [];
        // Fill previous month padding
        const prevMonthDays = new Date(year, month, 0).getDate();
        for (let i = startOffset - 1; i >= 0; i--) {
            const date = new Date(year, month - 1, prevMonthDays - i);
            days.push({
                day: prevMonthDays - i,
                month: 'prev',
                date,
                dateKey: date.toISOString().split('T')[0],
                isToday: false,
                workToComplete: 0,
                actualWorkDone: 0
            });
        }

        // Fill current month days
        for (let i = 1; i <= daysInMonth; i++) {
            const date = new Date(year, month, i);
            const dateKey = date.toISOString().split('T')[0];

            // Find matching plan day
            const planDay = this.planDays.find(d => {
                const dayDateKey = d.isoDate || d.date;
                return dayDateKey === dateKey;
            });

            days.push({
                day: i,
                month: 'current',
                date,
                dateKey,
                workToComplete: planDay?.workToComplete || 0,
                actualWorkDone: planDay?.actualWorkDone || 0,
                isToday: dateKey === new Date().toISOString().split('T')[0]
            });
        }

        // Fill next month padding to reach 42 cells (6 weeks)
        const remaining = 42 - days.length;
        for (let i = 1; i <= remaining; i++) {
            const date = new Date(year, month + 1, i);
            days.push({
                day: i,
                month: 'next',
                date,
                dateKey: date.toISOString().split('T')[0],
                isToday: false,
                workToComplete: 0,
                actualWorkDone: 0
            });
        }

        this.calendarDays = days;
    }

    /**
     * Get sorted progress entries for Daily Updates section
     * Shows first 20 days from start date, with days that have progress at the top (latest first),
     * followed by days without progress (earliest first)
     */
    getSortedProgressEntries(): ProgressUpdate[] {
        if (!this.startDate || this.planDays.length === 0) {
            // If no plan days, return existing progress entries sorted by progress status
            const withProgress = this.progressEntries.filter(e => e.actualWords > 0)
                .sort((a, b) => b.date.getTime() - a.date.getTime());
            const withoutProgress = this.progressEntries.filter(e => e.actualWords === 0)
                .sort((a, b) => a.date.getTime() - b.date.getTime());
            return [...withProgress, ...withoutProgress].slice(0, 20);
        }

        // Get first 20 days from planDays (chronological order, earliest to latest)
        const first20Days = this.planDays.slice(0, 20);

        // Create a map of progress entries by date for quick lookup
        const progressMap = new Map<string, ProgressUpdate>();
        this.progressEntries.forEach(entry => {
            const dateStr = entry.date.toISOString().split('T')[0];
            // Only use progress entry if it has actual progress, otherwise prefer planDay data
            if (entry.actualWords > 0) {
                progressMap.set(dateStr, entry);
            }
        });

        // Convert first 20 plan days to ProgressUpdate format
        // Merge with existing progressEntries, but prioritize planDay's actualWorkDone
        const entries: ProgressUpdate[] = first20Days.map(day => {
            const dateStr = day.isoDate || day.date;
            const existingEntry = progressMap.get(dateStr);
            const actualWorkDone = day.actualWorkDone || 0;

            if (existingEntry && actualWorkDone === 0) {
                // Use existing progress entry if planDay has no progress
                return existingEntry;
            } else {
                // Use planDay data (which may have progress from table edits)
                // Or merge if both have data (prioritize planDay)
                return {
                    id: existingEntry?.id || day.num,
                    date: day.dateObj,
                    targetWords: day.workToComplete || existingEntry?.targetWords || 0,
                    actualWords: actualWorkDone || existingEntry?.actualWords || 0,
                    notes: existingEntry?.notes || '',
                    isToday: this.isSameDay(day.dateObj, new Date())
                };
            }
        });

        // Sort: entries with progress first (latest progress first), then entries without progress (earliest first)
        const withProgress = entries.filter(e => e.actualWords > 0)
            .sort((a, b) => b.date.getTime() - a.date.getTime());
        const withoutProgress = entries.filter(e => e.actualWords === 0)
            .sort((a, b) => a.date.getTime() - b.date.getTime());

        return [...withProgress, ...withoutProgress];
    }

    generatePlanData(skipProgressUpdate: boolean = false) {
        const progressToPreserve = this.currentProgress;

        if (!this.startDate || !this.endDate || this.targetWordCount <= 0) {
            this.planDays = [];
            this.totalDays = 0;
            this.calculateStats();
            this.generateCalendarDays();
            return;
        }

        // Set current calendar date to start date if it hasn't been set by user navigation yet
        if (this.startDate) {
            const startStr = this.startDate;
            const startD = new Date(startStr);
            if (!isNaN(startD.getTime())) {
                // Only sync if they are in different months/years (don't force back to start if user is navigating)
                const currentMonth = this.currentCalendarDate.getMonth();
                const currentYear = this.currentCalendarDate.getFullYear();
                const startMonth = startD.getMonth();
                const startYear = startD.getFullYear();

                // If it's the first run or we just loaded a plan, sync them
                if (this.planDays.length === 0) {
                    this.currentCalendarDate = new Date(startD);
                }
            }
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

        // --- Weighted Distribution Logic ---
        const dayWeights: number[] = [];
        let totalWeight = 0;

        for (let i = 0; i < this.totalDays; i++) {
            const current = new Date(start);
            current.setDate(start.getDate() + i);
            const isoDate = current.toISOString().split('T')[0];
            const dayOfWeek = current.getDay();
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

            let weight = 1.0;

            // 1. Weekend Approach Multipliers
            if (isWeekend) {
                switch (this.weekendApproach) {
                    case 'Skip':
                    case 'Weekdays Only': weight = 0; break;
                    case 'Do Less': weight = 0.5; break;
                    case 'Do More': weight = 1.5; break;
                    case 'Push!': weight = 2.0; break;
                    case 'The Usual': default: weight = 1.0; break;
                }
            }

            // 2. Weekday Overrides
            if (this.weekdayOverrides[dayOfWeek] !== undefined) {
                weight = this.weekdayOverrides[dayOfWeek];
            }

            // 3. Date Range Overrides
            for (const range of this.dateRangeOverrides) {
                if (isoDate >= range.start && isoDate <= range.end) {
                    weight = range.multiplier;
                }
            }

            // 4. Specific Date Overrides
            if (this.dateOverrides[isoDate] !== undefined) {
                weight = this.dateOverrides[isoDate];
            }

            // 5. Availability Events
            const event = this.availabilityEvents.find(e => e.date === isoDate);
            if (event) {
                weight = event.multiplier !== undefined ? event.multiplier : 0;
            }

            // 6. Reserve Days (HARD ZERO at the end)
            if (i >= this.totalDays - (this.reserveDays || 0)) {
                weight = 0;
            }

            dayWeights.push(weight);
            totalWeight += weight;
        }

        if (totalWeight === 0) totalWeight = 1;

        let wordsRemaining = this.targetWordCount;
        let weightsRemaining = totalWeight;

        for (let i = 0; i < this.totalDays; i++) {
            const current = new Date(start);
            current.setDate(start.getDate() + i);
            const weight = dayWeights[i];

            let dailyTarget = 0;
            if (weight > 0) {
                const t = i / (this.totalDays - 1 || 1);
                const baseTarget = (this.targetWordCount / totalWeight) * weight;

                // Intensity Factor (controls the "spread" or "steepness")
                let intensityMultiplier = 0.5; // Default for 'Average'
                switch (this.strategyIntensity) {
                    case 'Gentle': intensityMultiplier = 0.1; break;
                    case 'Low': intensityMultiplier = 0.25; break;
                    case 'Average': intensityMultiplier = 0.5; break;
                    case 'Medium': intensityMultiplier = 0.75; break;
                    case 'Hard Core': intensityMultiplier = 1.0; break;
                }

                // Apply Algorithm Modifiers to the base target
                switch (this.strategyType) {
                    case 'Front-load':
                        dailyTarget = baseTarget * ((1 + intensityMultiplier) - (intensityMultiplier * 2 * t));
                        break;
                    case 'Back-load':
                        dailyTarget = baseTarget * ((1 - intensityMultiplier) + (intensityMultiplier * 2 * t));
                        break;
                    case 'Mountain':
                        const factor = 1 - Math.abs(0.5 - t) * 2;
                        dailyTarget = baseTarget * ((1 - intensityMultiplier) + (intensityMultiplier * 2 * factor));
                        break;
                    case 'Valley':
                        const valleyFactor = Math.abs(0.5 - t) * 2;
                        dailyTarget = baseTarget * ((1 - intensityMultiplier) + (intensityMultiplier * 2 * valleyFactor));
                        break;
                    case 'Oscillating':
                        const sineFactor = Math.sin(t * Math.PI * (intensityMultiplier * 8)) * intensityMultiplier + 1;
                        dailyTarget = baseTarget * sineFactor;
                        break;
                    case 'Randomly':
                        // Use a pseudo-random seed based on the date so it stays consistent unless recalculated
                        const seed = current.getDate() + current.getMonth() * 31;
                        const pseudoRandom = ((seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
                        const randomFactor = (1 - intensityMultiplier) + (pseudoRandom * intensityMultiplier * 2);
                        dailyTarget = baseTarget * randomFactor;
                        break;
                    case 'Steady':
                    default:
                        dailyTarget = (wordsRemaining / weightsRemaining) * weight;
                        break;
                }

                dailyTarget = Math.round(dailyTarget);

                // Ensure we don't exceed total count and handle last day rounding
                if (i === this.totalDays - 1 || weightsRemaining <= weight) {
                    dailyTarget = wordsRemaining;
                } else {
                    dailyTarget = Math.min(dailyTarget, wordsRemaining);
                }

                wordsRemaining -= dailyTarget;
                weightsRemaining -= weight;
            }

            cumulativeTarget += dailyTarget;

            this.planDays.push({
                num: i + 1,
                day: current.toLocaleDateString('en-US', { weekday: 'short' }),
                date: current.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }),
                isoDate: current.toISOString().split('T')[0],
                dateObj: new Date(current),
                workToComplete: dailyTarget,
                actualWorkDone: 0,
                expectedProgress: cumulativeTarget,
                yourActualProgress: 0,
                workLeft: this.targetWordCount - cumulativeTarget
            });
        }

        // If we are regenerating data (e.g. changing dates/targets), we generally want to preserve
        // the manual progress percentage, but redistribute the IMPLIED words across the new schedule.
        if (progressToPreserve > 0) {
            const targetTotal = Math.round((progressToPreserve / 100) * this.targetWordCount);
            let remainingToDistribute = targetTotal;

            for (let i = 0; i < this.planDays.length && remainingToDistribute > 0; i++) {
                const day = this.planDays[i];
                const dayTarget = day.workToComplete || 0;

                if (dayTarget > 0) {
                    const wordsForThisDay = Math.min(dayTarget, remainingToDistribute);
                    day.actualWorkDone = wordsForThisDay;
                    remainingToDistribute -= wordsForThisDay;
                }
            }
            // Restore the progress value and tell stats invalidation to skip overwriting it
            this.currentProgress = progressToPreserve;
            skipProgressUpdate = true;
        }

        this.recalculateCumulativeStats(skipProgressUpdate);
        this.calculateStats();
    }

    /**
     * Build planDays array from saved backend data (preserves algorithm distribution)
     */
    buildPlanDaysFromSavedData() {
        if (!this.startDate || !this.endDate) {
            console.warn('Cannot build plan days: missing start or end date');
            return;
        }

        const start = new Date(this.startDate);
        const end = new Date(this.endDate);
        this.totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        this.planDays = [];

        let cumulativeTarget = 0;
        let cumulativeActual = 0;

        // Create a map of saved data by date
        const savedDataMap = new Map<string, { target: number, actual: number }>();
        this.progressEntries.forEach(entry => {
            const dateStr = entry.date.toISOString().split('T')[0];
            savedDataMap.set(dateStr, {
                target: entry.targetWords || 0,
                actual: entry.actualWords || 0
            });
        });

        // Build plan days for the entire date range
        for (let i = 0; i < this.totalDays; i++) {
            const current = new Date(start);
            current.setDate(start.getDate() + i);

            const dateStr = current.toISOString().split('T')[0];
            const savedData = savedDataMap.get(dateStr);

            const target = savedData?.target || 0;
            const actual = savedData?.actual || 0;

            cumulativeTarget += target;
            cumulativeActual += actual;

            this.planDays.push({
                num: i + 1,
                day: current.toLocaleDateString('en-US', { weekday: 'short' }),
                date: current.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }),
                isoDate: dateStr,
                dateObj: new Date(current),
                workToComplete: target,
                actualWorkDone: actual,
                expectedProgress: cumulativeTarget,
                yourActualProgress: cumulativeActual,
                workLeft: this.targetWordCount - cumulativeActual
            });
        }

        console.log(`✓ Built ${this.planDays.length} plan days from saved data`);
        this.calculateStats();
        this.generateCalendarDays();
        this.cdr.detectChanges();
    }

    recalculateCumulativeStats(skipProgressUpdate: boolean = false) {
        let cumulativeActual = 0;
        let cumulativeTarget = 0;

        this.planDays.forEach(day => {
            cumulativeTarget += day.workToComplete; // Use generated target

            // For actual progress
            if (day.actualWorkDone !== undefined && day.actualWorkDone !== null) {
                cumulativeActual += day.actualWorkDone;
            }
            day.yourActualProgress = cumulativeActual;

            // Update Work Left to show actual remaining work to reach goal
            day.workLeft = Math.max(0, this.targetWordCount - cumulativeActual);
        });

        this.totalWordsLogged = cumulativeActual;

        // Update the manual progress percentage in the sidebar to match actual work
        // Only if not skipped (skipped when user is manually editing the %)
        if (!skipProgressUpdate && this.targetWordCount > 0) {
            this.currentProgress = Math.min(100, Math.round((cumulativeActual / this.targetWordCount) * 100));
        }

        // Calculate trends and percentages for progress entries
        this.progressEntries.forEach((entry, index) => {
            entry.percentOfTarget = entry.targetWords > 0 ? Math.round((entry.actualWords / entry.targetWords) * 100) : 0;

            if (index > 0) {
                const prev = this.progressEntries[index - 1];
                if (entry.actualWords > prev.actualWords) entry.trend = 'up';
                else if (entry.actualWords < prev.actualWords) entry.trend = 'down';
                else entry.trend = 'steady';
            } else {
                entry.trend = 'steady';
            }
        });

        // Also update advanced stats
        this.calculateStats();
    }

    onManualProgressChange(val: any) {
        // Ensure val is a number - handle both string and number inputs
        let progress: number;
        if (typeof val === 'string') {
            progress = parseFloat(val.trim());
        } else {
            progress = Number(val);
        }

        // Validate the input
        if (isNaN(progress) || this.targetWordCount <= 0 || progress === null || progress === undefined) {
            // If invalid, restore the previous value and return
            console.warn(`⚠️ Invalid progress value: ${val}, keeping previous value: ${this.currentProgress}%`);
            this.cdr.detectChanges();
            return;
        }

        // STRICT VALIDATION: Clamp value between 0 and 100
        if (progress > 100) {
            progress = 100;
        } else if (progress < 0) {
            progress = 0;
        }

        // Store the previous value to detect if it actually changed
        const previousProgress = this.currentProgress;

        // Update the model immediately to the clamped value
        this.currentProgress = progress;

        console.log(`📊 Progress change: ${previousProgress}% → ${progress}%`);

        // Check if the value actually changed (with small epsilon for floating point comparison)
        const progressChanged = Math.abs(previousProgress - progress) > 0.001;

        // Only skip redistribution if value didn't change AND distribution already matches
        if (!progressChanged && this.planDays.length > 0) {
            const currentTotal = this.planDays.reduce((sum, d) => sum + (d.actualWorkDone || 0), 0);
            const expectedTotal = Math.round((progress / 100) * this.targetWordCount);
            if (Math.abs(currentTotal - expectedTotal) <= 1) { // Allow 1 word difference for rounding
                // Already matches, no need to redistribute
                console.log(`ℹ️ Progress unchanged and distribution matches, skipping redistribution`);
                return;
            }
        }

        // Calculate expected total words based on manual % with EXACT precision
        // Use Math.round for the final total to ensure accuracy
        const exactTotal = (progress / 100) * this.targetWordCount;
        const targetTotal = Math.round(exactTotal);

        console.log(`🔄 Manual progress changed to ${progress}%: Target total = ${targetTotal} words (exact: ${exactTotal})`);

        // ALWAYS redistribute from scratch when manual progress is changed (both increase and decrease)
        // Reset all days to 0 first
        this.planDays.forEach(d => d.actualWorkDone = 0);

        // Clear existing progress entries for fresh start
        this.progressEntries = [];

        // Distribute progress sequentially across days based on their target word counts
        // Start from day 1 and fill each day until we reach the target total
        let remainingToDistribute = targetTotal;
        let totalDistributed = 0;

        // Distribute progress sequentially across days
        for (let i = 0; i < this.planDays.length && remainingToDistribute > 0; i++) {
            const day = this.planDays[i];
            const dayTarget = day.workToComplete || 0;

            if (dayTarget > 0) {
                // Calculate how much to add to this day
                const wordsForThisDay = Math.min(dayTarget, remainingToDistribute);
                day.actualWorkDone = wordsForThisDay;
                remainingToDistribute -= wordsForThisDay;
                totalDistributed += wordsForThisDay;

                // Also update progressEntries for Daily Updates section
                if (wordsForThisDay > 0) {
                    const dateStr = day.isoDate || day.date;
                    const entryDate = day.dateObj || new Date(dateStr);
                    this.progressEntries.push({
                        id: day.num,
                        date: entryDate,
                        targetWords: dayTarget,
                        actualWords: wordsForThisDay,
                        notes: '',
                        isToday: this.isSameDay(entryDate, new Date()),
                        trend: 'steady' as 'up' | 'down' | 'steady'
                    });
                }
            }
        }

        // Handle any rounding difference by adjusting the last day with progress
        // This ensures the total matches exactly the target percentage
        if (Math.abs(totalDistributed - targetTotal) > 0 && this.planDays.length > 0) {
            // Find the last day with progress
            for (let i = this.planDays.length - 1; i >= 0; i--) {
                const day = this.planDays[i];
                if (day.actualWorkDone > 0) {
                    const adjustment = targetTotal - totalDistributed;
                    day.actualWorkDone = Math.max(0, day.actualWorkDone + adjustment);

                    // Update the corresponding progress entry
                    const entryIndex = this.progressEntries.findIndex(e => {
                        const entryDateStr = e.date.toISOString().split('T')[0];
                        const dayDateStr = day.isoDate || day.date;
                        return entryDateStr === dayDateStr || this.isSameDay(e.date, day.dateObj);
                    });
                    if (entryIndex >= 0) {
                        this.progressEntries[entryIndex].actualWords = day.actualWorkDone;
                    }
                    break;
                }
            }
        }

        // Verify the final total matches the target
        const finalTotal = this.planDays.reduce((sum, d) => sum + (d.actualWorkDone || 0), 0);
        const finalPercentage = this.targetWordCount > 0
            ? (finalTotal / this.targetWordCount) * 100
            : 0;

        console.log(`✅ Progress distribution complete: ${finalTotal} words = ${finalPercentage.toFixed(2)}% (target: ${progress}%)`);

        // Recalculate stats/columns, but DO NOT overwrite my manually typed %
        this.recalculateCumulativeStats(true);

        // Force update to visual table
        this.cdr.detectChanges();
    }

    onTableProgressChange(day: PlanDay) {
        this.recalculateCumulativeStats();

        // Update progressEntries for immediate display in Daily Updates section
        const dateStr = day.isoDate || day.date;
        const existingEntryIndex = this.progressEntries.findIndex(e => {
            const entryDateStr = e.date.toISOString().split('T')[0];
            return entryDateStr === dateStr || this.isSameDay(e.date, day.dateObj);
        });

        const updatedEntry: ProgressUpdate = {
            id: existingEntryIndex >= 0 ? this.progressEntries[existingEntryIndex].id : day.num,
            date: day.dateObj,
            targetWords: day.workToComplete || 0,
            actualWords: day.actualWorkDone || 0,
            notes: '',
            isToday: this.isSameDay(day.dateObj, new Date())
        };

        if (existingEntryIndex >= 0) {
            // Update existing entry
            this.progressEntries[existingEntryIndex] = updatedEntry;
        } else {
            // Add new entry
            this.progressEntries.push(updatedEntry);
        }

        // Auto-save to backend if plan exists
        if (this.planId) {
            const val = day.actualWorkDone || 0;

            this.apiService.logProgress(this.planId, dateStr, val, '').subscribe({
                next: () => {
                    console.log('Auto-saved table progress');
                    // Optionally reload to ensure sync, but local update should be enough
                    // this.loadPlanProgress(this.planId!);
                },
                error: (err) => {
                    console.error('Failed to auto-save table progress', err);
                    // On error, we might want to revert, but for now just log
                }
            });
        }

        // Trigger change detection to update Daily Updates section
        this.cdr.markForCheck();
    }


    calculateStats() {
        if (this.planDays.length === 0) {
            this.dailyAvg = 0;
            this.weeklyAvg = 0;
            this.weekdayAvg = 0;
            this.weekendAvg = 0;
            this.recentActivity = [];
            this.totalWordsLogged = 0;
            this.bestDay = null;
            this.currentStreak = 0;
            this.wordsRemaining = this.targetWordCount;
            this.onTrackPercent = 0;
            return;
        }

        // Calculate basic averages (targets)
        const totalWords = this.targetWordCount;
        this.dailyAvg = Math.round(totalWords / this.totalDays);
        this.weeklyAvg = this.dailyAvg * 7;

        let weekdayTargetTotal = 0;
        let weekdayCount = 0;
        let weekendTargetTotal = 0;
        let weekendCount = 0;

        // Calculate actuals
        let actualTotal = 0;
        let maxCount = 0;
        let maxDate = '';

        this.planDays.forEach(day => {
            const date = new Date(day.dateObj);
            const isWeekend = date.getDay() === 0 || date.getDay() === 6;

            // Targets
            if (isWeekend) {
                weekendTargetTotal += day.workToComplete;
                weekendCount++;
            } else {
                weekdayTargetTotal += day.workToComplete;
                weekdayCount++;
            }

            // Actuals
            const actual = day.actualWorkDone || 0;
            actualTotal += actual;

            if (actual > maxCount) {
                maxCount = actual;
                maxDate = day.date;
            }
        });

        // Note: Streak is now loaded from backend stats API via loadStreakFromBackend()
        // to match the profile streak. Local calculation is no longer used.

        this.weekdayAvg = weekdayCount > 0 ? Math.round(weekdayTargetTotal / weekdayCount) : 0;
        this.weekendAvg = weekendCount > 0 ? Math.round(weekendTargetTotal / weekendCount) : 0;

        this.totalWordsLogged = actualTotal;
        this.wordsRemaining = Math.max(0, this.targetWordCount - actualTotal);
        this.bestDay = maxCount > 0 ? { date: maxDate, count: maxCount } : null;

        // On-track percentage (actual words vs expected progress for current date)
        const now = new Date();
        const pastDays = this.planDays.filter(d => d.dateObj <= now);
        if (pastDays.length > 0) {
            const lastPastDay = pastDays[pastDays.length - 1];
            const expectedSoFar = lastPastDay.expectedProgress;

            if (expectedSoFar > 0) {
                const performance = Math.round((actualTotal / expectedSoFar) * 100);
                this.onTrackPercent = Math.min(100, performance);

                if (performance >= 100) this.onTrackStatus = 'Ahead of Schedule';
                else if (performance >= 80) this.onTrackStatus = 'On Track';
                else this.onTrackStatus = 'Behind Schedule';
            } else {
                this.onTrackPercent = 100;
                this.onTrackStatus = actualTotal > 0 ? 'Ahead of Schedule' : 'On Track';
            }
        } else {
            this.onTrackPercent = 100;
            this.onTrackStatus = 'Plan not started';
        }

        // Recent Activity Chart (Last 7 Days)
        const activityMap = new Map<string, number>();
        this.progressEntries.forEach(e => {
            const dateStr = e.date.toISOString().split('T')[0];
            activityMap.set(dateStr, (activityMap.get(dateStr) || 0) + e.actualWords);
        });

        // If no progress entries, maybe check planDays actualWorkDone
        if (this.progressEntries.length === 0) {
            this.planDays.forEach(d => {
                if (d.actualWorkDone > 0) {
                    const dateStr = d.dateObj.toISOString().split('T')[0];
                    activityMap.set(dateStr, d.actualWorkDone);
                }
            });
        }

        this.recentActivity = [];
        const todayDate = new Date();
        let chartMaxCount = 0;

        for (let i = 6; i >= 0; i--) {
            const d = new Date(todayDate);
            d.setDate(todayDate.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            const count = activityMap.get(dateStr) || 0;
            if (count > chartMaxCount) chartMaxCount = count;

            this.recentActivity.push({
                day: d.toLocaleDateString('en-US', { weekday: 'short' }),
                count: count,
                height: 0
            });
        }

        // Normalize heights (min 5% for visibility)
        this.recentActivity.forEach(item => {
            item.height = chartMaxCount > 0 ? Math.max(5, (item.count / chartMaxCount) * 100) : 5;
        });
    }

    onDateChange() {
        this.generatePlanData();
        // If fixed deadline is true, sync target finish date with end date
        if (this.fixedDeadline && this.endDate) {
            this.targetFinishDate = this.endDate;
        }
    }

    onTargetChange() {
        this.generatePlanData();
    }

    onTargetFinishDateChange() {
        // Validate that target finish date is after start date
        if (this.targetFinishDate && this.startDate) {
            const targetDate = new Date(this.targetFinishDate);
            const startDate = new Date(this.startDate);
            if (targetDate < startDate) {
                this.notificationService.showError('Target finish date must be after start date.');
                this.targetFinishDate = '';
                return;
            }
        }

        // Update endDate to match targetFinishDate if it's set
        if (this.targetFinishDate) {
            this.endDate = this.targetFinishDate;
        }
        this.generatePlanData();
    }

    onFixedDeadlineChange() {
        // When fixed deadline is enabled, set target finish date to end date
        if (this.fixedDeadline && this.endDate) {
            this.targetFinishDate = this.endDate;
        } else if (!this.fixedDeadline) {
            // When disabled, clear target finish date
            this.targetFinishDate = '';
        }
        this.recalculateCumulativeStats();
    }

    /**
     * Formats a date string (YYYY-MM-DD) to a readable format (MM/DD/YYYY)
     * @param dateString - Date string in YYYY-MM-DD format
     * @returns Formatted date string or empty string if invalid
     */
    formatDate(dateString: string): string {
        if (!dateString) return '';
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return '';
            return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
        } catch {
            return '';
        }
    }

    onStrategyChange() {
        this.generatePlanData();
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

    savePlan() {
        if (!this.planName) {
            this.notificationService.showError('Please enter a plan name.');
            return;
        }

        if (this.targetWordCount <= 0) {
            this.notificationService.showError('Please enter a valid target amount.');
            return;
        }

        const payload = {
            title: this.planName,
            total_word_count: Math.round(this.targetWordCount),
            start_date: this.startDate,
            end_date: this.endDate,
            algorithm_type: (this.strategyType || 'Steady').toLowerCase(),
            description: this.planDescription || '',
            is_private: !!this.isPrivate,
            starting_point: Math.round(this.startingPoint || 0),
            measurement_unit: this.measurementUnit,
            is_daily_target: !!this.isDailyTarget,
            fixed_deadline: !!this.fixedDeadline,
            target_finish_date: (this.targetFinishDate && this.fixedDeadline) ? this.targetFinishDate : null,
            strategy_intensity: this.strategyIntensity,
            weekend_approach: this.weekendApproach,
            reserve_days: Math.round(this.reserveDays || 0),
            display_view_type: this.displayViewType,
            week_start_day: this.weekStartDay,
            grouping_type: this.groupingType,
            dashboard_color: this.dashboardColor,
            show_historical_data: !!this.showHistoricalData,
            progress_tracking_type: this.progressTrackingType,
            activity_type: this.activityType || 'Writing',
            content_type: this.contentType,
            status: this.status || 'active',
            current_progress: Math.round(this.currentProgress || 0)
        };

        console.log('📦 Saving Plan Payload:', payload);

        this.isLoading = true;
        this.cdr.detectChanges();

        const request = (this.isEditMode && this.planId)
            ? this.apiService.updatePlan(this.planId!, payload)
            : this.apiService.createPlan(payload);

        request.subscribe({
            next: (res) => {
                if (res.success) {
                    const wasNewPlan = !this.planId;
                    if (!this.planId && res.id) {
                        this.planId = res.id;
                    }

                    // Save plan days updates:
                    // - For NEW plans: Save all plan days with targets and actual counts
                    // - For EXISTING plans: Save target_count changes (manual edits) AFTER plan update
                    //   This ensures manual target edits persist even if RegeneratePlanDays ran
                    const savePromise = wasNewPlan
                        ? this.saveTableProgressUpdates()
                        : this.saveTableProgressUpdatesForExistingPlan();

                    savePromise.then(() => {
                        // After saving all plan days, update the plan's current_progress to match the manual value
                        // This is needed because LogPlanProgress recalculates progress, but we want to preserve
                        // the manual percentage set by the user
                        if (!wasNewPlan && this.planId) {
                            console.log(`🔄 Updating plan's current_progress to manual value: ${this.currentProgress}%`);
                            return this.updatePlanProgress(this.planId, this.currentProgress);
                        }
                        return Promise.resolve();
                    }).then(() => {
                        this.notificationService.showSuccess(`Plan ${this.isEditMode ? 'updated' : 'created'} successfully!`);
                        if (this.planId) {
                            this.router.navigate(['/plans', this.planId]);
                        } else {
                            this.router.navigate(['/dashboard']);
                        }
                        this.isLoading = false;
                        this.cdr.detectChanges();
                    }).catch((err) => {
                        console.error('Error saving plan days:', err);
                        // Still navigate even if plan days save failed
                        this.notificationService.showSuccess(`Plan ${this.isEditMode ? 'updated' : 'created'} successfully!`);
                        if (this.planId) {
                            this.router.navigate(['/plans', this.planId]);
                        } else {
                            this.router.navigate(['/dashboard']);
                        }
                        this.isLoading = false;
                        this.cdr.detectChanges();
                    });
                } else {
                    this.notificationService.showError(res.message || 'Failed to save plan');
                    this.isLoading = false;
                    this.cdr.detectChanges();
                }
            },
            error: (err) => {
                console.error('Error saving plan', err);
                let errorMessage = 'Failed to save plan. Please try again.';
                if (err.error) {
                    if (typeof err.error === 'string') errorMessage = err.error;
                    else if (err.error.message) errorMessage = err.error.message;
                    else if (err.error.errors) {
                        const errors = err.error.errors;
                        errorMessage = Object.keys(errors)
                            .map(key => `${key}: ${errors[key].join(', ')}`)
                            .join(' | ');
                    }
                }
                this.notificationService.showError(errorMessage);
                this.isLoading = false;
                this.cdr.detectChanges();
            }
        });
    }

    async saveTableProgressUpdates() {
        if (!this.planId) return;

        // Save ALL plan days with their target_count (workToComplete) and actual_count
        // This ensures the mountain approach and other algorithms are preserved
        const promises = this.planDays.map(day => {
            return new Promise<void>((resolve) => {
                const dateStr = day.dateObj.toISOString().split('T')[0];
                const actualCount = day.actualWorkDone || 0;
                const targetCount = day.workToComplete || 0;

                // Save both target_count and actual_count for all days
                this.apiService.logProgress(this.planId!, dateStr, actualCount, '', targetCount).subscribe({
                    next: () => resolve(),
                    error: () => resolve()
                });
            });
        });
        await Promise.all(promises);
        console.log(`✓ Saved ${this.planDays.length} plan days with target_count to backend`);
    }

    async saveTableProgressUpdatesForExistingPlan() {
        if (!this.planId) {
            console.log('⚠ No planId, skipping plan days save');
            return Promise.resolve();
        }

        // For existing plans, save target_count changes AFTER plan update
        // This ensures manual edits persist even if RegeneratePlanDays ran during plan update
        // Use existing actual_count from planDays to preserve user's logged progress
        console.log(`💾 Saving target_count changes for ${this.planDays.length} plan days for plan ${this.planId}...`);

        let savedCount = 0;
        let failedCount = 0;

        const promises = this.planDays.map(day => {
            return new Promise<void>((resolve) => {
                const dateStr = day.dateObj.toISOString().split('T')[0];
                const targetCount = day.workToComplete || 0;
                const actualCount = day.actualWorkDone || 0; // Use existing actual_count to preserve progress

                // Save both target_count (from user edits) and actual_count (preserve existing)
                // The backend will update target_count while preserving actual_count
                this.apiService.logProgress(this.planId!, dateStr, actualCount, '', targetCount).subscribe({
                    next: (response) => {
                        if (response && response.success) {
                            savedCount++;
                            console.log(`  ✓ Saved day ${dateStr}: target=${targetCount}, actual=${actualCount}`);
                        } else {
                            failedCount++;
                            console.error(`  ✗ Save failed for ${dateStr}:`, response?.message || 'Unknown error');
                        }
                        resolve();
                    },
                    error: (err) => {
                        failedCount++;
                        console.error(`  ✗ Error saving ${dateStr}:`, err);
                        resolve(); // Continue even if one fails
                    }
                });
            });
        });

        await Promise.all(promises);
        console.log(`✅ Completed saving plan days: ${savedCount} succeeded, ${failedCount} failed out of ${this.planDays.length} total`);

        if (failedCount > 0) {
            console.warn(`⚠ Warning: ${failedCount} plan days failed to save. Manual target edits may not be persisted.`);
        }
    }

    /**
     * Update the plan's current_progress field to the manual value
     * This is used to preserve the manual progress percentage after saving plan days
     * (which recalculate progress based on actual word counts)
     */
    async updatePlanProgress(planId: number, progress: number): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            // Build complete payload with all plan fields (backend UpdatePlan requires all fields)
            const updatePayload = {
                title: this.planName,
                total_word_count: Math.round(this.targetWordCount),
                start_date: this.startDate,
                end_date: this.endDate,
                algorithm_type: (this.strategyType || 'Steady').toLowerCase(),
                description: this.planDescription || '',
                is_private: !!this.isPrivate,
                starting_point: Math.round(this.startingPoint || 0),
                measurement_unit: this.measurementUnit,
                is_daily_target: !!this.isDailyTarget,
                fixed_deadline: !!this.fixedDeadline,
                target_finish_date: (this.targetFinishDate && this.fixedDeadline) ? this.targetFinishDate : null,
                strategy_intensity: this.strategyIntensity,
                weekend_approach: this.weekendApproach,
                reserve_days: Math.round(this.reserveDays || 0),
                display_view_type: this.displayViewType,
                week_start_day: this.weekStartDay,
                grouping_type: this.groupingType,
                dashboard_color: this.dashboardColor,
                show_historical_data: !!this.showHistoricalData,
                progress_tracking_type: this.progressTrackingType,
                activity_type: 'Writing',
                content_type: this.contentType,
                status: this.status || 'active',
                current_progress: Math.round(progress || 0)  // Use the manual progress value
            };

            console.log(`📊 Updating plan ${planId} progress to manual value: ${progress}%`);

            this.apiService.updatePlan(planId, updatePayload).subscribe({
                next: (response) => {
                    if (response.success) {
                        console.log(`✅ Successfully updated plan progress to ${progress}%`);
                        resolve();
                    } else {
                        console.error(`✗ Failed to update plan progress:`, response.message || 'Unknown error');
                        // Don't reject - this is not critical, just log the error
                        resolve();
                    }
                },
                error: (err) => {
                    console.error(`✗ Error updating plan progress:`, err);
                    // Don't reject - this is not critical, just log the error
                    resolve();
                }
            });
        });
    }

    cancel() {
        if (this.isEditMode && this.planId) {
            this.router.navigate(['/plans', this.planId]);
        } else {
            this.router.navigate(['/dashboard']);
        }
    }

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

    onContentChanged(event: any) {
        // Quill returns HTML content in event.html
        this.planDescription = event.html || '';
        this.cdr.detectChanges();
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

    getDescriptionWordCount(): number {
        if (!this.planDescription) return 0;
        // Strip HTML tags and entities to get clean text for word counting
        const cleanText = this.planDescription
            .replace(/<[^>]*>/g, ' ')
            .replace(/&nbsp;/g, ' ')
            .trim();
        if (!cleanText) return 0;
        return cleanText.split(/\s+/).filter(word => word.length > 0).length;
    }

    isDescriptionOverLimit(): boolean {
        return this.getDescriptionWordCount() > this.maxDescriptionWords;
    }

    // --- Custom SVG Charting Methods ---

    getCumulativeTargetPath(): string {
        if (this.planDays.length === 0) return '';
        let path = `M 0 ${this.getCumulativeYPos(0)}`;
        this.planDays.forEach((day, i) => {
            const x = (i / (this.totalDays - 1 || 1)) * 1000;
            const y = this.getCumulativeYPos(day.expectedProgress);
            path += ` L ${x} ${y}`;
        });
        return path;
    }

    getCumulativeActualPath(): string {
        if (this.planDays.length === 0) return '';
        const lastDayWithProgress = [...this.planDays].reverse().findIndex(d => (d.actualWorkDone || 0) > 0);
        const lastIndex = lastDayWithProgress === -1 ? 0 : this.planDays.length - 1 - lastDayWithProgress;

        let path = `M 0 ${this.getCumulativeYPos(0)}`;
        for (let i = 0; i <= lastIndex; i++) {
            const day = this.planDays[i];
            const x = (i / (this.totalDays - 1 || 1)) * 1000;
            const y = this.getCumulativeYPos(day.yourActualProgress);
            path += ` L ${x} ${y}`;
        }
        return path;
    }

    getActualCumulativeAreaPath(): string {
        if (this.planDays.length === 0) return '';
        const lastDayWithProgress = [...this.planDays].reverse().findIndex(d => (d.actualWorkDone || 0) > 0);
        const lastIndex = lastDayWithProgress === -1 ? 0 : this.planDays.length - 1 - lastDayWithProgress;

        let path = `M 0 ${this.getCumulativeYPos(0)}`;
        for (let i = 0; i <= lastIndex; i++) {
            const day = this.planDays[i];
            const x = (i / (this.totalDays - 1 || 1)) * 1000;
            const y = this.getCumulativeYPos(day.yourActualProgress);
            path += ` L ${x} ${y}`;
        }
        const lastX = (lastIndex / (this.totalDays - 1 || 1)) * 1000;
        path += ` L ${lastX} 300 L 0 300 Z`;
        return path;
    }

    getCumulativePoints(): { x: number, y: number, day: PlanDay }[] {
        if (this.planDays.length === 0) return [];
        const lastDayWithProgress = [...this.planDays].reverse().findIndex(d => (d.actualWorkDone || 0) > 0);
        const lastIndex = lastDayWithProgress === -1 ? 0 : this.planDays.length - 1 - lastDayWithProgress;

        return this.planDays.slice(0, lastIndex + 1).map((day, i) => ({
            x: (i / (this.totalDays - 1 || 1)) * 1000,
            y: this.getCumulativeYPos(day.yourActualProgress),
            day: day
        }));
    }

    getCumulativeYPos(val: number): number {
        const max = this.targetWordCount || 100;
        const padding = 25;
        const workableHeight = 300 - (padding * 2);
        return 300 - padding - (val / max) * workableHeight;
    }

    // --- Daily Work Chart Methods (800x200) ---

    getMaxDailyTarget(): number {
        if (this.planDays.length === 0) return 100;
        return Math.max(...this.planDays.map(d => d.workToComplete), 100);
    }

    getGridLines(max: number): number[] {
        const lines = [];
        const step = max / 4;
        for (let i = 0; i <= 4; i++) {
            lines.push(i * step);
        }
        return lines;
    }

    getLinePath(): string {
        if (this.planDays.length === 0) return '';
        const max = this.getMaxDailyTarget();
        let path = `M 0 ${this.getYPos(this.planDays[0].workToComplete, max)}`;
        this.planDays.forEach((day, i) => {
            const x = (i / (this.totalDays - 1 || 1)) * 800;
            const y = this.getYPos(day.workToComplete, max);
            path += ` L ${x} ${y}`;
        });
        return path;
    }

    getDailyAreaPath(): string {
        if (this.planDays.length === 0) return '';
        const max = this.getMaxDailyTarget();
        let path = `M 0 200`; // Start at bottom left
        this.planDays.forEach((day, i) => {
            const x = (i / (this.totalDays - 1 || 1)) * 800;
            const y = this.getYPos(day.workToComplete, max);
            path += ` L ${x} ${y}`;
        });
        path += ` L 800 200 Z`; // Close to bottom right and back to start
        return path;
    }

    getDailyPoints(): { x: number, y: number, day: PlanDay }[] {
        const max = this.getMaxDailyTarget();
        if (this.planDays.length === 0) return [];
        return this.planDays.map((day, i) => ({
            x: (i / (this.totalDays - 1 || 1)) * 800,
            y: this.getYPos(day.workToComplete, max),
            day: day
        }));
    }

    getYPos(val: number, max: number): number {
        const height = 200;
        const padding = 20;
        const workableHeight = height - (padding * 2);
        return height - padding - (val / (max || 1)) * workableHeight;
    }

    updateGrowthChart() { }
    initGrowthChart() { }

    loadStreakFromBackend() {
        // Fetch streak from backend stats API to match profile
        this.apiService.getStats().subscribe({
            next: (response) => {
                if (response.success && response.data) {
                    this.currentStreak = response.data.currentStreak || 0;
                    this.cdr.detectChanges();
                }
            },
            error: (error) => {
                console.error('Error fetching streak from backend:', error);
                // Keep current streak value on error
            }
        });
    }
}
