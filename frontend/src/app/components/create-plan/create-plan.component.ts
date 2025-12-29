import { Component, OnInit, OnDestroy, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink, NavigationEnd } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { NotificationService } from '../../services/notification.service';
import { Subscription, filter } from 'rxjs';

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
    trend?: 'up' | 'down' | 'steady';
    percentOfTarget?: number;
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
    status: string = 'active';
    currentProgress: number = 0;

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
    totalWordsLogged: number = 0;
    bestDay: { date: string, count: number } | null = null;
    currentStreak: number = 0;
    wordsRemaining: number = 0;
    onTrackPercent: number = 0;
    onTrackStatus: string = '';
    recentActivity: { day: string, count: number, height: number }[] = [];

    // Chart Refinement
    hoveredDay: PlanDay | null = null;

    // Edit Mode properties
    planId: number | null = null;
    isEditMode: boolean = false;
    isLoading: boolean = false;

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

    ngOnDestroy() {
        if (this.routeSubscription) {
            this.routeSubscription.unsubscribe();
        }
        if (this.navigationSubscription) {
            this.navigationSubscription.unsubscribe();
        }
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
                    this.measurementUnit = plan.measurement_unit || 'words';
                    this.isDailyTarget = plan.is_daily_target || false;
                    this.fixedDeadline = plan.fixed_deadline === undefined ? true : plan.fixed_deadline;
                    this.strategyIntensity = plan.strategy_intensity || 'Average';
                    this.weekendApproach = plan.weekend_approach || 'The Usual';
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

                    // Generate plan data first to populate planDays array
                    // Pass true to preserve the loaded progress value
                    this.generatePlanData(true);
                    
                    // Restore the saved progress after generatePlanData (which may have overwritten it)
                    this.currentProgress = savedProgress;
                    console.log(`📊 Restored progress after generatePlanData: ${this.currentProgress}%`);
                    
                    // Then load progress entries to populate the table
                    // Use setTimeout to ensure generatePlanData completes first
                    setTimeout(() => {
                        // Store the progress value before loading progress entries
                        const progressToDisplay = this.currentProgress;
                        console.log(`📊 Storing progress value before loading entries: ${progressToDisplay}%`);
                        
                        this.loadPlanProgress(id, progressToDisplay);
                    }, 200);
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

    loadPlanProgress(id: number, progressToDisplay?: number) {
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
                            id: date.getTime(),
                            date: date,
                            targetWords: d.target_count || 0,
                            actualWords: d.actual_count || 0,
                            notes: d.notes || '',
                            isToday: this.isSameDay(date, new Date())
                        };
                    });
                    console.log(`📝 Loaded ${this.progressEntries.length} progress entries`);
                } else {
                    this.progressEntries = [];
                    console.log(`ℹ️ No progress entries found`);
                }

                // If we found entries, update the generated plan days with actual data
                if (this.progressEntries.length > 0) {
                    console.log(`🔄 Updating plan days table with ${this.progressEntries.length} entries`);
                    this.progressEntries.forEach(entry => {
                        const day = this.planDays.find(d => this.isSameDay(d.dateObj, entry.date));
                        if (day) {
                            day.actualWorkDone = entry.actualWords;
                            try {
                                const dateStr = entry.date instanceof Date && !isNaN(entry.date.getTime()) 
                                    ? entry.date.toISOString().split('T')[0] 
                                    : 'unknown';
                                console.log(`  ✓ Updated day ${dateStr}: ${entry.actualWords} words`);
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
                
                console.log(`✅ Plan progress loading complete. Progress displayed in text box: ${this.currentProgress}%`);
                
                // Mark loading as complete and update UI
                this.isLoading = false;
                this.cdr.detectChanges();
            },
            error: (err) => {
                console.error('❌ Error loading progress', err);
                this.notificationService.showError('Error loading plan progress');
                this.isLoading = false;
                this.cdr.detectChanges();
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

    generatePlanData(skipProgressUpdate: boolean = false) {
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
        this.recalculateCumulativeStats(skipProgressUpdate);
        this.calculateStats();
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
        // Ensure val is a number
        const progress = parseFloat(val);
        if (isNaN(progress) || this.targetWordCount <= 0 || progress === null) return;

        // Update the model immediately just in case (though ngModel should handle it, this ensures local sync)
        this.currentProgress = progress;

        // Calculate expected total words based on manual %
        const targetTotal = Math.round((progress / 100) * this.targetWordCount);

        // Calculate current total in table
        let currentTableTotal = 0;
        this.planDays.forEach(d => currentTableTotal += (d.actualWorkDone || 0));

        const diff = targetTotal - currentTableTotal;

        // Always redistribute from scratch when manual progress is changed
        // This ensures progress is distributed sequentially from day 1
        if (diff !== 0) {
            // Reset all days to 0 first
            this.planDays.forEach(d => d.actualWorkDone = 0);
            
            // Distribute progress sequentially across days based on their target word counts
            // Start from day 1 and fill each day until we reach the target total
            let remainingToDistribute = targetTotal;

            // Distribute progress sequentially across days
            for (let i = 0; i < this.planDays.length && remainingToDistribute > 0; i++) {
                const day = this.planDays[i];
                const dayTarget = day.workToComplete || 0;
                
                if (dayTarget > 0) {
                    // Calculate how much to add to this day
                    const wordsForThisDay = Math.min(dayTarget, remainingToDistribute);
                    day.actualWorkDone = wordsForThisDay;
                    remainingToDistribute -= wordsForThisDay;
                }
            }

            // Recalculate stats/columns, but DO NOT overwrite my manually typed %
            this.recalculateCumulativeStats(true);

            // Force update to visual table
            this.cdr.detectChanges();

            // Auto-save all updated days to backend if plan exists
            if (this.planId) {
                const savePromises: Promise<void>[] = [];
                
                // Save all days that were updated
                this.planDays.forEach(day => {
                    if (day.actualWorkDone !== undefined && day.actualWorkDone !== null) {
                        const dateStr = day.dateObj.toISOString().split('T')[0];
                        savePromises.push(
                            new Promise<void>((resolve) => {
                                this.apiService.logProgress(this.planId!, dateStr, day.actualWorkDone || 0, '').subscribe({
                                    next: () => {
                                        console.log(`Auto-saved progress for ${dateStr}`);
                                        resolve();
                                    },
                                    error: (err) => {
                                        console.error(`Failed to auto-save for ${dateStr}`, err);
                                        resolve(); // Continue even if one fails
                                    }
                                });
                            })
                        );
                    }
                });

                // Wait for all saves to complete
                Promise.all(savePromises).then(() => {
                    console.log('All progress updates saved');
                });
            }
        }
    }

    onTableProgressChange(day: PlanDay) {
        this.recalculateCumulativeStats();

        // Auto-save to backend if plan exists
        if (this.planId) {
            const dateStr = day.dateObj.toISOString().split('T')[0];
            const val = day.actualWorkDone || 0;

            this.apiService.logProgress(this.planId, dateStr, val, '').subscribe({
                next: () => console.log('Auto-saved table progress'),
                error: (err) => console.error('Failed to auto-save table progress', err)
            });
        }
    }

    getOnTrackStroke() {
        // Circumference of circle with r=45 is ~283 
        // We now match the Manual Progress (%) instead of just pace
        const circumference = 283;
        const offset = circumference - (this.currentProgress / 100) * circumference;
        return offset;
    }

    getTrendIcon(trend?: string) {
        if (trend === 'up') return 'fa-arrow-trend-up text-success';
        if (trend === 'down') return 'fa-arrow-trend-down text-danger';
        return 'fa-minus text-muted';
    }

    getFormattedDateProgress(date: Date) {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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
        let streak = 0;
        let countingStreak = true;

        // Iterate backwards for streak
        const sortedDays = [...this.planDays].sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime());
        const today = new Date();
        today.setHours(0, 0, 0, 0);

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

        // Current Streak calculation
        for (const day of sortedDays) {
            const dayDate = new Date(day.dateObj);
            dayDate.setHours(0, 0, 0, 0);

            if (dayDate > today) continue; // Skip future days

            if ((day.actualWorkDone || 0) > 0) {
                streak++;
            } else if (dayDate < today) {
                // If it's before today and 0, streak is broken
                break;
            }
            // If it's today and 0, we don't break the streak yet, giving user time to write
        }

        this.weekdayAvg = weekdayCount > 0 ? Math.round(weekdayTargetTotal / weekdayCount) : 0;
        this.weekendAvg = weekendCount > 0 ? Math.round(weekendTargetTotal / weekendCount) : 0;

        this.totalWordsLogged = actualTotal;
        this.wordsRemaining = Math.max(0, this.targetWordCount - actualTotal);
        this.bestDay = maxCount > 0 ? { date: maxDate, count: maxCount } : null;
        this.currentStreak = streak;

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
    }

    onFixedDeadlineChange() {
        // When fixed deadline is enabled, set target finish date to end date
        if (this.fixedDeadline && this.endDate) {
            this.targetFinishDate = this.endDate;
        } else if (!this.fixedDeadline) {
            // When disabled, clear target finish date
            this.targetFinishDate = '';
        }
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
            algorithm_type: this.strategyType.toLowerCase(),
            description: this.planDescription || '',
            is_private: this.isPrivate,
            starting_point: this.startingPoint,
            measurement_unit: this.measurementUnit,
            is_daily_target: this.isDailyTarget,
            fixed_deadline: this.fixedDeadline,
            target_finish_date: (this.targetFinishDate && this.fixedDeadline) ? this.targetFinishDate : null,
            strategy_intensity: this.strategyIntensity,
            weekend_approach: this.weekendApproach,
            reserve_days: this.reserveDays,
            display_view_type: this.displayViewType,
            week_start_day: this.weekStartDay,
            grouping_type: this.groupingType,
            dashboard_color: this.dashboardColor,
            show_historical_data: this.showHistoricalData,
            progress_tracking_type: this.progressTrackingType,
            activity_type: 'Writing', // Added missing field
            content_type: this.contentType,
            status: this.status || 'active',
            current_progress: this.currentProgress || 0
        };

        this.isLoading = true; // Set loading state
        this.cdr.detectChanges(); // Ensure UI reflects loading state

        const request = (this.isEditMode && this.planId)
            ? this.apiService.updatePlan(this.planId!, payload)
            : this.apiService.createPlan(payload);

        request.subscribe({
            next: (res) => {
                if (res.success) {
                    // Update planId if this was a new plan creation
                    if (!this.planId && res.id) {
                        this.planId = res.id;
                    }

                    // Save progress updates from the table (Actual Work Done)
                    this.saveTableProgressUpdates().then(() => {
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
                    if (typeof err.error === 'string') {
                        errorMessage = err.error;
                    } else if (err.error.message) {
                        errorMessage = err.error.message;
                    } else if (err.error.errors) {
                        // Handle standard ASP.NET validation errors
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

    // Helper to save progress from table inputs
    async saveTableProgressUpdates() {
        if (!this.planId) return;

        // Find days with actual work done and values > 0 (or just non-null if we allow 0)
        // We really want to save any explicit entry.
        const updates = this.planDays
            .filter(d => d.actualWorkDone !== undefined && d.actualWorkDone !== null)
            ;

        const promises = updates.map(day => {
            return new Promise<void>((resolve) => {
                // Format date as yyyy-MM-dd for backend
                const dateStr = day.dateObj.toISOString().split('T')[0];
                this.apiService.logProgress(this.planId!, dateStr, day.actualWorkDone, '').subscribe({
                    next: () => resolve(),
                    error: () => resolve() // Continue even if one fails
                });
            });
        });

        await Promise.all(promises);
    }

    // Placeholder to ignore for now
    private ignore() {
        return;
    }

    cancel() {
        if (this.isEditMode && this.planId) {
            this.router.navigate(['/plans', this.planId]);
        } else {
            this.router.navigate(['/dashboard']);
        }
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

    /**
     * Counts the number of words in the description
     * @returns The word count
     */
    getDescriptionWordCount(): number {
        if (!this.planDescription || !this.planDescription.trim()) {
            return 0;
        }
        // Split by whitespace and filter out empty strings
        const words = this.planDescription.trim().split(/\s+/).filter(word => word.length > 0);
        return words.length;
    }

    /**
     * Checks if description exceeds max words
     * @returns True if description exceeds max words
     */
    isDescriptionOverLimit(): boolean {
        return this.getDescriptionWordCount() > this.maxDescriptionWords;
    }
}
