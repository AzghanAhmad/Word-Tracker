import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink, NavigationEnd } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { NotificationService } from '../../services/notification.service';
import { ContentLoaderComponent } from '../content-loader/content-loader.component';
import { OutputStatsChartComponent, WordEntry } from '../stats/output-stats-chart/output-stats-chart.component';
import { DailyStatsChartComponent } from '../stats/daily-stats-chart/daily-stats-chart.component';
import { Subscription, filter } from 'rxjs';

@Component({
    selector: 'app-plan-details',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink, ContentLoaderComponent, OutputStatsChartComponent, DailyStatsChartComponent],
    templateUrl: './plan-details.component.html',
    styleUrls: ['./plan-details.component.scss']
})
export class PlanDetailsComponent implements OnInit, OnDestroy {
    get cumulativeChartData(): WordEntry[] {
        return this.allPlanDays.map(day => {
            // Ensure date is in consistent format (YYYY-MM-DD)
            let dateStr = day.date;
            if (typeof dateStr === 'string') {
                // If it's already in YYYY-MM-DD format, use it
                if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
                    dateStr = dateStr;
                } else if (dateStr.includes('T')) {
                    // If it's ISO format, extract date part
                    dateStr = dateStr.split('T')[0];
                } else {
                    // Try to parse and format
                    const date = new Date(dateStr);
                    if (!isNaN(date.getTime())) {
                        dateStr = date.toISOString().split('T')[0];
                    }
                }
            } else if (day.dateObj) {
                // Use dateObj if available
                dateStr = day.dateObj.toISOString().split('T')[0];
            }

            return {
                date: dateStr,
                count: day.actual_count || 0,
                target: day.target_count || 0
            };
        });
    }

    get dailyChartData(): WordEntry[] {
        return this.allPlanDays.map(day => {
            // Ensure date is in consistent format (YYYY-MM-DD)
            let dateStr = day.date;
            if (typeof dateStr === 'string') {
                // If it's already in YYYY-MM-DD format, use it
                if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
                    dateStr = dateStr;
                } else if (dateStr.includes('T')) {
                    // If it's ISO format, extract date part
                    dateStr = dateStr.split('T')[0];
                } else {
                    // Try to parse and format
                    const date = new Date(dateStr);
                    if (!isNaN(date.getTime())) {
                        dateStr = date.toISOString().split('T')[0];
                    }
                }
            } else if (day.dateObj) {
                // Use dateObj if available
                dateStr = day.dateObj.toISOString().split('T')[0];
            }

            return {
                date: dateStr,
                count: day.actual_count || 0,
                target: day.target_count || 0
            };
        });
    }

    isLoading = true;
    planId: number | null = null;
    plan: any = null;
    stats: any = {
        wordsPerDay: 0,
        daysRemaining: 0,
        projectedFinishDate: null
    };
    // Chart Data
    allPlanDays: any[] = [];
    chartData: { target: string, actual: string, projected: string } = { target: '', actual: '', projected: '' };
    chartPoints: any[] = []; // For tooltips
    chartDimensions = { width: 800, height: 300 };
    maxChartValue: number = 0;
    maxDailyValue: number = 0;

    // Display Toggle
    activeTab: 'plan' | 'schedule' | 'progress' | 'stats' = 'plan';
    activeView: 'Graph' | 'Table' | 'Calendar' = 'Graph';
    scheduleViewMode: 'calendar' | 'chart' = 'calendar';

    // Form and UI state
    todayDate: string = '';
    newSessionDate: string = '';
    newSessionWords: number = 0;
    saveSuccess: boolean = false;
    showAddSessionForm: boolean = false;
    activityLogs: any[] = [];
    editingSessionId: number | null = null;
    editingSessionValue: number = 0;
    hoveredPoint: any = null;
    hoveredChart: 'cumulative' | 'daily' | null = null;
    planNotes: { [key: string]: string } = {};
    calendarDays: any[] = [];

    trackByDateKey(index: number, day: any): string {
        return day.dateKey || index.toString();
    }

    // Expanded Stats Metrics
    extendedStats: any = {
        daysSinceStart: 0,
        bestDay: 0,
        avgWordsPerDay: 0,
        statusLabel: 'On Track',
        statusColor: 'var(--primary-accent)',
        completionRate: 0,
        dailyTargetMet: 0
    };


    // Subscriptions
    private routeSubscription?: Subscription;
    private navigationSubscription?: Subscription;

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private apiService: ApiService,
        private cdr: ChangeDetectorRef,
        private notificationService: NotificationService
    ) { }

    ngOnInit() {
        // Set today's date as max for date input and default for new sessions
        const today = new Date();
        this.todayDate = today.toISOString().split('T')[0];
        this.newSessionDate = this.todayDate; // Default to today

        // Load data immediately
        this.loadPlanData();

        // Subscribe to route params
        this.routeSubscription = this.route.paramMap.subscribe(params => {
            const id = params.get('id');
            if (id) {
                this.planId = +id;
                this.loadPlanDetails();
            } else {
                this.router.navigate(['/dashboard']);
            }
        });

        // Reload on navigation back to this page
        this.navigationSubscription = this.router.events.pipe(
            filter(event => event instanceof NavigationEnd)
        ).subscribe((event: any) => {
            if (event.url.includes('/plans/') && !event.url.includes('/edit')) {
                console.log('🔄 Navigation detected, reloading plan data...');
                // Force refresh all data when navigating back to the page
                this.loadPlanData();
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
            this.planId = +id;
            this.loadPlanDetails();
        }
    }

    loadPlanDetails() {
        if (!this.planId) return;

        this.isLoading = true;
        this.cdr.detectChanges();

        // Fetch plan details
        this.apiService.getPlan(this.planId).subscribe({
            next: (response) => {
                if (response.success && response.data) {
                    // Process the plan data before assigning to avoid ExpressionChangedAfterItHasBeenCheckedError
                    const planData = { ...response.data };

                    // Ensure dates are strings, not objects (handle MySqlDateTime serialization)
                    if (planData.start_date && typeof planData.start_date === 'object') {
                        const sd = planData.start_date as any;
                        if (sd.Year && sd.Month && sd.Day) {
                            planData.start_date = `${sd.Year}-${String(sd.Month).padStart(2, '0')}-${String(sd.Day).padStart(2, '0')}`;
                        }
                    }
                    if (planData.end_date && typeof planData.end_date === 'object') {
                        const ed = planData.end_date as any;
                        if (ed.Year && ed.Month && ed.Day) {
                            planData.end_date = `${ed.Year}-${String(ed.Month).padStart(2, '0')}-${String(ed.Day).padStart(2, '0')}`;
                        }
                    }
                    if (planData.target_finish_date && typeof planData.target_finish_date === 'object') {
                        const tfd = planData.target_finish_date as any;
                        if (tfd.Year && tfd.Month && tfd.Day) {
                            planData.target_finish_date = `${tfd.Year}-${String(tfd.Month).padStart(2, '0')}-${String(tfd.Day).padStart(2, '0')}`;
                        }
                    }

                    // Assign the processed plan data
                    this.plan = planData;

                    this.activeView = (this.plan.display_view_type === 'Table' || this.plan.display_view_type === 'Calendar')
                        ? this.plan.display_view_type
                        : 'Graph';

                    // Use setTimeout to defer change detection after all modifications
                    setTimeout(() => {
                        this.loadActivityLogs();
                        // Defer calculateStats and isLoading to next tick to avoid change detection errors
                        setTimeout(() => {
                            this.calculateStats();
                            this.isLoading = false;
                            this.cdr.detectChanges();
                        }, 0);
                    }, 0);
                } else {
                    // Fallback to fetching all plans
                    this.apiService.getPlans().subscribe({
                        next: (allResponse) => {
                            if (allResponse.success && allResponse.data) {
                                const found = allResponse.data.find((p: any) => p.id === this.planId);
                                if (found) {
                                    // Process the plan data before assigning
                                    const planData = { ...found };

                                    // Ensure dates are strings, not objects
                                    if (planData.start_date && typeof planData.start_date === 'object') {
                                        const sd = planData.start_date as any;
                                        if (sd.Year && sd.Month && sd.Day) {
                                            planData.start_date = `${sd.Year}-${String(sd.Month).padStart(2, '0')}-${String(sd.Day).padStart(2, '0')}`;
                                        }
                                    }
                                    if (planData.end_date && typeof planData.end_date === 'object') {
                                        const ed = planData.end_date as any;
                                        if (ed.Year && ed.Month && ed.Day) {
                                            planData.end_date = `${ed.Year}-${String(ed.Month).padStart(2, '0')}-${String(ed.Day).padStart(2, '0')}`;
                                        }
                                    }

                                    this.plan = planData;
                                    this.activeView = (this.plan.display_view_type === 'Table' || this.plan.display_view_type === 'Calendar')
                                        ? this.plan.display_view_type
                                        : 'Graph';

                                    // Use setTimeout to defer change detection
                                    setTimeout(() => {
                                        this.loadActivityLogs();
                                        // Defer calculateStats and isLoading to next tick to avoid change detection errors
                                        setTimeout(() => {
                                            this.calculateStats();
                                            this.isLoading = false;
                                            this.cdr.detectChanges();
                                        }, 0);
                                    }, 0);
                                } else {
                                    console.error('Plan not found');
                                    this.notificationService.showError('Plan not found');
                                    this.isLoading = false;
                                    this.cdr.detectChanges();
                                    this.router.navigate(['/dashboard']);
                                }
                            } else {
                                this.isLoading = false;
                                this.cdr.detectChanges();
                            }
                        },
                        error: (err) => {
                            console.error('Error fetching fallback plans', err);
                            this.isLoading = false;
                            this.cdr.detectChanges();
                        }
                    });
                }
            },
            error: (err) => {
                console.error('Error loading plan', err);
                this.notificationService.showError('Error loading plan details');
                this.isLoading = false;
                this.cdr.detectChanges();
                this.router.navigate(['/dashboard']);
            }
        });
    }

    get hasDescription(): boolean {
        if (!this.plan || !this.plan.description) return false;
        const desc = this.plan.description.trim();
        return desc !== '{}' && desc !== '<p><br></p>' && desc !== '';
    }

    generateCalendarDays() {
        const year = this.currentCalendarDate.getFullYear();
        const month = this.currentCalendarDate.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        const days = [];
        // Fill previous month days
        const prevMonthDays = new Date(year, month, 0).getDate();
        for (let i = firstDay - 1; i >= 0; i--) {
            const date = new Date(year, month - 1, prevMonthDays - i);
            days.push({
                day: prevMonthDays - i,
                month: 'prev',
                date,
                dateKey: date.toISOString().split('T')[0],
                isToday: false
            });
        }

        // Fill current month days
        for (let i = 1; i <= daysInMonth; i++) {
            const date = new Date(year, month, i);
            const dateKey = date.toISOString().split('T')[0];

            // Find matching plan day - handle both ISO format and YYYY-MM-DD format
            const planDay = this.allPlanDays.find(d => {
                const dayDateKey = typeof d.date === 'string'
                    ? (d.date.includes('T') ? d.date.split('T')[0] : d.date)
                    : new Date(d.date).toISOString().split('T')[0];
                return dayDateKey === dateKey;
            });

            days.push({
                day: i,
                month: 'current',
                date,
                dateKey,
                target: planDay?.target_count || 0,
                actual: planDay?.actual_count || 0,
                isWritingDay: (planDay?.target_count || 0) > 0,
                isToday: dateKey === this.todayDate
            });
        }

        // Fill next month days
        const remaining = 42 - days.length;
        for (let i = 1; i <= remaining; i++) {
            const date = new Date(year, month + 1, i);
            days.push({
                day: i,
                month: 'next',
                date,
                dateKey: date.toISOString().split('T')[0],
                isToday: false
            });
        }

        this.calendarDays = days;
    }

    loadActivityLogs() {
        if (!this.planId || !this.plan) {
            this.isLoading = false;
            this.cdr.detectChanges();
            return;
        }

        console.log('📊 Loading activity logs for plan:', this.planId);

        // Clear existing data to ensure fresh load
        this.allPlanDays = [];
        this.activityLogs = [];
        this.planNotes = {};

        // Fetch plan days for activity logs
        this.apiService.getPlanDays(this.planId).subscribe({
            next: (response) => {
                console.log('✅ Received plan days response:', response);
                if (response.success && response.data && Array.isArray(response.data)) {
                    // Calculate fallback daily target if DB returns 0s
                    const totalTarget = this.plan.target_amount || this.plan.total_word_count || 50000;
                    const fallbackDailyTarget = response.data.length > 0
                        ? Math.round(totalTarget / response.data.length)
                        : 0;

                    // Filter to only include days within the plan's date range for schedule display
                    // This ensures we only show the schedule for this specific plan
                    const planStartDate = new Date(this.plan.start_date);
                    planStartDate.setHours(0, 0, 0, 0);
                    const planEndDate = new Date(this.plan.end_date);
                    planEndDate.setHours(23, 59, 59, 999);

                    // Store ALL days for Chart (Sorted Ascending) - only within plan date range
                    // Use the actual target_count from the database (plan_days table) for each day
                    this.allPlanDays = response.data
                        .filter((d: any) => {
                            // Only include days within the plan's start and end date range
                            const dayDate = new Date(d.date);
                            return dayDate >= planStartDate && dayDate <= planEndDate;
                        })
                        .map((d: any) => {
                            const dateObj = new Date(d.date);
                            // Normalize date to YYYY-MM-DD format for consistent matching
                            let dateKey: string;
                            if (typeof d.date === 'string') {
                                if (d.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
                                    dateKey = d.date;
                                } else if (d.date.includes('T')) {
                                    dateKey = d.date.split('T')[0];
                                } else {
                                    dateKey = dateObj.toISOString().split('T')[0];
                                }
                            } else {
                                dateKey = dateObj.toISOString().split('T')[0];
                            }

                            // Use DB target_count directly from plan_days table
                            // The backend already calculates this based on the writing strategy
                            let dailyTarget = d.target_count || 0;

                            // Load notes into planNotes object (ensure it's always a string or undefined)
                            // Only set if notes exists and is a valid string (not an object)
                            if (d.notes !== null && d.notes !== undefined) {
                                // Ensure notes is a string, not an object
                                if (typeof d.notes === 'string') {
                                    // Only set if it's not empty (empty strings will show placeholder)
                                    if (d.notes.trim() !== '') {
                                        this.planNotes[dateKey] = d.notes;
                                    }
                                    // If empty string, don't set (will show placeholder)
                                } else {
                                    // If it's an object or other type, don't set it
                                    // This prevents "[object] [object]" from appearing
                                    console.warn(`⚠ Skipping invalid notes value for ${dateKey}:`, d.notes);
                                }
                            }
                            // If notes is null/undefined, don't set it (will show placeholder)

                            return {
                                ...d,
                                date: dateKey, // Store normalized date
                                dateObj: dateObj,
                                target_count: dailyTarget, // Use actual database value
                                actual_count: d.actual_count || 0,
                                notes: d.notes || ''
                            };
                        }).sort((a: any, b: any) => a.dateObj.getTime() - b.dateObj.getTime());

                    console.log('✅ Processed allPlanDays:', this.allPlanDays.length, 'days');

                    // Generate calendar and charts with fresh data
                    this.generateCalendarDays();
                    this.generateChart();

                    // Ensure calendar is generated even if schedule tab is active
                    // This fixes the issue where schedule tab doesn't show data until clicked
                    this.cdr.detectChanges();

                    // Filter only days where work has been done (actual_count > 0) - these are "working days"
                    // Sort by date descending (newest first) and take the last 10 working days
                    // Use the filtered and processed allPlanDays instead of raw response.data for consistency
                    const allDaysWithWork = this.allPlanDays.filter((d: any) => (d.actual_count || 0) > 0);
                    this.activityLogs = allDaysWithWork.map((d: any) => {
                        // Use the already processed date from allPlanDays
                        const dateObj = d.dateObj;

                        let dayTarget = (d.target_count && d.target_count > 0) ? d.target_count : fallbackDailyTarget;

                        if (this.allPlanDays.length > 1 && dayTarget >= totalTarget) {
                            dayTarget = fallbackDailyTarget;
                        }

                        // Use the normalized dateKey from allPlanDays
                        const rawDateStr = d.date;

                        return {
                            id: d.id || dateObj.getTime(),
                            date: dateObj.toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                            }),
                            words: d.actual_count || 0,
                            target: dayTarget,
                            dateObj: dateObj,
                            rawDate: rawDateStr,
                            notes: d.notes || ''
                        };
                    })
                        .sort((a: any, b: any) => b.dateObj.getTime() - a.dateObj.getTime()) // Newest first
                        .slice(0, 10); // Last 10 working days

                    // Update completed amount from allPlanDays (already filtered by date range)
                    const totalFromLogs = this.allPlanDays.reduce((sum: number, d: any) => sum + (d.actual_count || 0), 0);
                    if (this.plan) {
                        this.plan.completed_amount = totalFromLogs;
                    }

                    console.log('✅ Updated activity logs:', this.activityLogs.length, 'entries');
                    console.log('✅ Total completed amount:', totalFromLogs);
                } else {
                    console.warn('⚠ No plan days data received or invalid response format');
                    this.allPlanDays = [];
                    this.activityLogs = [];
                }

                // Force change detection and update stats
                this.cdr.detectChanges();

                // Defer calculateStats to ensure all data is processed
                setTimeout(() => {
                    this.calculateStats();
                    this.isLoading = false;
                    // Trigger change detection again after stats calculation
                    this.cdr.detectChanges();
                }, 100);
            },
            error: (err) => {
                console.error('❌ Error loading activity logs:', err);
                console.error('Error details:', err.error || err.message);
                this.allPlanDays = [];
                this.activityLogs = [];
                this.planNotes = {};
                setTimeout(() => {
                    this.calculateStats();
                    this.isLoading = false;
                    this.cdr.detectChanges();
                }, 0);
            }
        });
    }

    calculateStats() {
        if (!this.plan) return;

        // All analytics calculations use backend data from allPlanDays
        // This function is called after loadActivityLogs() completes, ensuring data is available

        // Create new objects to avoid change detection errors
        const newStats = { ...this.stats };
        const newExtendedStats = { ...this.extendedStats };
        const newPlan = { ...this.plan };

        // Days Remaining
        const end = new Date(this.plan.end_date).getTime();
        const now = new Date().getTime();
        const diff = Math.ceil((end - now) / (1000 * 3600 * 24));
        newStats.daysRemaining = diff > 0 ? diff : 0;

        // Calculate completed amount from all plan days (backend data)
        // This ensures we get the complete picture from the backend
        let totalCompleted = 0;
        if (this.allPlanDays && this.allPlanDays.length > 0) {
            totalCompleted = this.allPlanDays.reduce((sum: number, day: any) => {
                return sum + (day.actual_count || 0);
            }, 0);
        } else {
            // Fallback to activity logs if allPlanDays not loaded yet
            totalCompleted = this.activityLogs.reduce((sum, log) => sum + log.words, 0);
        }

        // If we have explicit plan completion amount in DB, use that (it's more authoritative)
        if (this.plan.completed_amount && this.plan.completed_amount > totalCompleted) {
            totalCompleted = this.plan.completed_amount;
        }

        const targetAmount = this.plan.target_amount || this.plan.total_word_count || 0;

        // If manual progress is set, calculate implied words
        if (this.plan.current_progress && this.plan.current_progress > 0) {
            const impliedWords = Math.round((this.plan.current_progress / 100) * targetAmount);
            // Use implied words if it's greater than logged words (user might be updating manually only)
            if (impliedWords > totalCompleted) {
                totalCompleted = impliedWords;
            }
        }

        // Words Per Day needed
        const remainingWords = targetAmount - totalCompleted;
        if (remainingWords > 0 && newStats.daysRemaining > 0) {
            newStats.wordsPerDay = Math.ceil(remainingWords / newStats.daysRemaining);
        } else {
            newStats.wordsPerDay = 0;
        }

        // Progress percentage for display
        const calculatedProgress = targetAmount > 0
            ? Math.round((totalCompleted / targetAmount) * 100)
            : 0;

        // Use manual progress if set, otherwise fall back to calculated
        newPlan.progress = (this.plan.current_progress && this.plan.current_progress > 0)
            ? this.plan.current_progress
            : calculatedProgress;

        // Update completed_amount for display
        newPlan.completed_amount = (targetAmount > 0)
            ? Math.min(totalCompleted, targetAmount)
            : totalCompleted;

        // Calculate Days Since Start
        const start = new Date(this.plan.start_date).getTime();
        const startDiff = Math.floor((now - start) / (1000 * 3600 * 24));
        newExtendedStats.daysSinceStart = Math.max(0, startDiff);

        // Calculate Best Day and Avg
        const writingDays = this.allPlanDays.filter(d => (d.actual_count || 0) > 0);
        newExtendedStats.bestDay = writingDays.length > 0
            ? Math.max(...writingDays.map(d => d.actual_count))
            : 0;

        // Calculate average words per day from actual writing days (not total days)
        newExtendedStats.avgWordsPerDay = writingDays.length > 0
            ? Math.round(totalCompleted / writingDays.length)
            : 0;

        // Ensure we have valid data for analytics
        if (this.allPlanDays.length === 0) {
            console.warn('No plan days data available for analytics calculations');
        }

        // On Track / Behind Status
        // Find today's cumulative stats
        const todayStr = this.todayDate;
        const pastAndTodayDays = this.allPlanDays.filter(d => {
            const dayDateKey = typeof d.date === 'string'
                ? (d.date.includes('T') ? d.date.split('T')[0] : d.date)
                : new Date(d.date).toISOString().split('T')[0];
            return dayDateKey <= todayStr;
        });

        let cumTargetToday = 0;
        let cumActualToday = 0;
        pastAndTodayDays.forEach(d => {
            cumTargetToday += (d.target_count || 0);
            cumActualToday += (d.actual_count || 0);
        });

        if (cumActualToday >= cumTargetToday) {
            newExtendedStats.statusLabel = 'On Track';
            newExtendedStats.statusColor = '#10b981'; // Success Green
        } else if (cumActualToday < cumTargetToday * 0.8) {
            newExtendedStats.statusLabel = 'Behind Plan';
            newExtendedStats.statusColor = '#f59e0b'; // Amber
        } else {
            newExtendedStats.statusLabel = 'Slightly Behind';
            newExtendedStats.statusColor = '#1C2E4A';
        }

        // Daily Target Met % (Average of writing days performance)
        const perfRates = writingDays
            .filter(d => (d.target_count || 0) > 0)
            .map(d => Math.round(((d.actual_count || 0) / (d.target_count || 1)) * 100));

        newExtendedStats.dailyTargetMet = perfRates.length > 0
            ? Math.round(perfRates.reduce((a, b) => a + b, 0) / perfRates.length)
            : 0;

        newExtendedStats.completionRate = newPlan.progress;

        // Assign all changes at once to avoid change detection errors
        this.stats = newStats;
        this.extendedStats = newExtendedStats;
        this.plan = { ...this.plan, ...newPlan };
    }

    toggleArchive() {
        if (!this.plan || !this.planId) return;

        const isArchived = this.plan.status === 'Archived' || this.plan.status === 'archived';
        const newStatus = isArchived ? 'active' : 'archived';
        const confirmMsg = newStatus === 'archived'
            ? 'Are you sure you want to archive this plan? It will be moved to the archives.'
            : 'Are you sure you want to unarchive this plan? It will be moved back to active plans.';

        if (confirm(confirmMsg)) {
            this.isLoading = true;
            this.cdr.detectChanges();

            this.apiService.archivePlan(this.planId, newStatus === 'archived').subscribe({
                next: (response) => {
                    if (response.success) {
                        this.notificationService.showSuccess(`Plan ${newStatus === 'archived' ? 'archived' : 'unarchived'} successfully`);
                        // Reload plan data
                        this.loadPlanDetails();
                    } else {
                        this.notificationService.showError('Failed to update status');
                        this.isLoading = false;
                        this.cdr.detectChanges();
                    }
                },
                error: (err) => {
                    console.error('Error updating status', err);
                    this.notificationService.showError('Failed to update status');
                    this.isLoading = false;
                    this.cdr.detectChanges();
                }
            });
        }
    }

    deletePlan() {
        if (!this.planId) return;

        if (confirm('Are you sure you want to delete this plan? This action cannot be undone.')) {
            this.isLoading = true;
            this.cdr.detectChanges();

            this.apiService.deletePlan(this.planId).subscribe({
                next: (response) => {
                    if (response.success) {
                        this.notificationService.showSuccess(response.message || 'Plan deleted successfully');
                        this.router.navigate(['/dashboard']);
                    } else {
                        this.notificationService.showError(response.message || 'Failed to delete plan');
                        this.isLoading = false;
                        this.cdr.detectChanges();
                    }
                },
                error: (err) => {
                    console.error('Error deleting plan', err);
                    const errorMsg = err.error?.message || 'Failed to delete plan';
                    this.notificationService.showError(errorMsg);
                    this.isLoading = false;
                    this.cdr.detectChanges();
                }
            });
        }
    }

    archivePlan() {
        if (!this.planId) return;

        const isArchived = this.plan.status?.toLowerCase() === 'archived';
        const action = isArchived ? 'restore' : 'archive';
        const confirmMessage = isArchived
            ? 'Are you sure you want to restore this plan?'
            : 'Are you sure you want to archive this plan? It will be moved to archived plans.';

        if (confirm(confirmMessage)) {
            this.isLoading = true;
            this.cdr.detectChanges();

            this.apiService.archivePlan(this.planId, !isArchived).subscribe({
                next: (response) => {
                    if (response.success) {
                        this.notificationService.showSuccess(response.message || `Plan ${action}d successfully`);
                        // Reload plan details to reflect the new status
                        this.loadPlanDetails();
                    } else {
                        this.notificationService.showError(response.message || `Failed to ${action} plan`);
                        this.isLoading = false;
                        this.cdr.detectChanges();
                    }
                },
                error: (err) => {
                    console.error(`Error ${action}ing plan`, err);
                    const errorMsg = err.error?.message || `Failed to ${action} plan`;
                    this.notificationService.showError(errorMsg);
                    this.isLoading = false;
                    this.cdr.detectChanges();
                }
            });
        }
    }

    navigateToEdit() {
        if (this.planId) {
            this.router.navigate(['/plans/edit', this.planId]);
        }
    }

    getFormattedDate(dateStr: string): string {
        return new Date(dateStr).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    }

    startEditingSession(log: any) {
        this.editingSessionId = log.id;
        this.editingSessionValue = log.words;
        // Focus the input after a brief delay to ensure it's rendered
        setTimeout(() => {
            const input = document.querySelector('.words-input') as HTMLInputElement;
            if (input) {
                input.focus();
                input.select();
            }
        }, 100);
    }

    cancelEditingSession() {
        this.editingSessionId = null;
        this.editingSessionValue = 0;
    }

    saveSession(log: any) {
        if (!this.planId) return;

        const words = Math.max(0, this.editingSessionValue || 0);
        // Ensure date is in YYYY-MM-DD format
        let dateStr = log.rawDate;
        if (!dateStr && log.dateObj) {
            dateStr = log.dateObj.toISOString().split('T')[0];
        } else if (dateStr && dateStr.includes('T')) {
            dateStr = dateStr.split('T')[0];
        }

        if (!dateStr) {
            this.notificationService.showError('Invalid date for session');
            return;
        }

        this.apiService.logProgress(this.planId, dateStr, words, log.notes || '').subscribe({
            next: (response) => {
                if (response.success) {
                    // Update the log in the array immediately for better UX
                    log.words = words;
                    this.editingSessionId = null;
                    this.editingSessionValue = 0;
                    this.notificationService.showSuccess('Session updated successfully');

                    // Force refresh all plan days data to ensure Schedule and Analytics are updated
                    this.refreshPlanDaysData();

                    // Also reload plan details to update progress percentage
                    setTimeout(() => {
                        this.loadPlanDetails();
                    }, 100);
                } else {
                    this.notificationService.showError('Failed to update session');
                }
            },
            error: (err) => {
                console.error('Error updating session', err);
                this.notificationService.showError('Failed to update session');
            }
        });
    }

    deleteSession(log: any) {
        if (!this.planId) return;

        if (confirm(`Are you sure you want to delete this session from ${log.date}?`)) {
            // Ensure date is in YYYY-MM-DD format
            let dateStr = log.rawDate;
            if (!dateStr && log.dateObj) {
                dateStr = log.dateObj.toISOString().split('T')[0];
            } else if (dateStr && dateStr.includes('T')) {
                dateStr = dateStr.split('T')[0];
            }

            if (!dateStr) {
                this.notificationService.showError('Invalid date for session');
                return;
            }

            // Set words to 0 to effectively delete the session
            this.apiService.logProgress(this.planId, dateStr, 0, log.notes || '').subscribe({
                next: (response) => {
                    if (response.success) {
                        this.notificationService.showSuccess('Session deleted successfully');
                        // Remove from activity logs immediately for better UX
                        const index = this.activityLogs.findIndex(l => l.id === log.id);
                        if (index !== -1) {
                            this.activityLogs.splice(index, 1);
                        }

                        // Force refresh all plan days data to ensure Schedule and Analytics are updated
                        this.refreshPlanDaysData();

                        // Also reload plan details to update progress percentage
                        setTimeout(() => {
                            this.loadPlanDetails();
                        }, 100);
                    } else {
                        this.notificationService.showError('Failed to delete session');
                    }
                },
                error: (err) => {
                    console.error('Error deleting session', err);
                    this.notificationService.showError('Failed to delete session');
                }
            });
        }
    }

    prepareEditSession(session: any) {
        this.newSessionDate = session.date.split('T')[0];
        this.newSessionWords = session.word_count;
        this.saveSuccess = false;
        // Scroll to top of progress tab smoothly
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    addNewSession() {
        if (!this.planId || !this.newSessionDate || (this.newSessionWords === null || this.newSessionWords === undefined)) {
            this.notificationService.showError('Please enter a valid date and word count');
            return;
        }

        if (this.newSessionWords < 0) {
            this.notificationService.showError('Word count cannot be negative');
            return;
        }

        // Ensure date is in YYYY-MM-DD format
        let dateStr = this.newSessionDate;
        if (dateStr && dateStr.includes('T')) {
            dateStr = dateStr.split('T')[0];
        }

        // Validate date is not in the future
        const selectedDate = new Date(dateStr + 'T00:00:00');
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (selectedDate > today) {
            this.notificationService.showError('Cannot log progress for future dates');
            return;
        }

        this.apiService.logProgress(this.planId, dateStr, this.newSessionWords, '').subscribe({
            next: (response) => {
                if (response.success) {
                    this.notificationService.showSuccess('Progress recorded successfully');
                    // Use setTimeout to avoid ExpressionChangedAfterItHasBeenCheckedError
                    setTimeout(() => {
                        this.saveSuccess = true;
                        this.cdr.detectChanges();
                        setTimeout(() => {
                            this.saveSuccess = false;
                            this.cdr.detectChanges();
                        }, 3000);
                    }, 0);

                    // Immediately add the new entry to the top of Recent Activity for instant feedback
                    const dateObj = new Date(dateStr + 'T00:00:00');
                    const newEntry = {
                        id: Date.now(), // Temporary ID until reload
                        date: dateObj.toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                        }),
                        words: this.newSessionWords,
                        target: 0, // Will be updated on reload
                        dateObj: dateObj,
                        rawDate: dateStr,
                        notes: ''
                    };

                    // Add the new entry to activityLogs array
                    this.activityLogs.push(newEntry);

                    // Sort by date descending (newest first) and keep only the most recent 10 entries
                    this.activityLogs.sort((a: any, b: any) => b.dateObj.getTime() - a.dateObj.getTime());
                    if (this.activityLogs.length > 10) {
                        this.activityLogs = this.activityLogs.slice(0, 10);
                    }

                    // Reset words for next entry, but keep the selected date
                    // This allows users to add multiple entries for the same date if needed
                    this.newSessionWords = 0;

                    // Force refresh all plan days data to ensure Schedule and Analytics are updated
                    this.refreshPlanDaysData();

                    // Also reload plan details to refresh stats, history, and ensure data is in sync
                    setTimeout(() => {
                        this.loadPlanDetails();
                    }, 100);
                } else {
                    this.notificationService.showError('Failed to save progress');
                }
            },
            error: (err) => {
                console.error('Error saving progress', err);
                const errorMsg = err.error?.message || 'Failed to save progress';
                this.notificationService.showError(errorMsg);
            }
        });
    }

    generateChart() {
        if (!this.allPlanDays || this.allPlanDays.length === 0) return;

        let cumulativeTarget = 0;
        let cumulativeActual = 0;
        const totalTarget = this.plan.target_amount || this.plan.total_word_count || 50000;

        // Calculate fallback target (simple average) just in case db returns 0s
        const fallbackDailyTarget = this.allPlanDays.length > 0
            ? Math.round(totalTarget / this.allPlanDays.length)
            : 0;

        // Calculate cumulative points
        // Use the actual target_count from the database (plan_days table)
        const points = this.allPlanDays.map((day, index) => {
            // Use the actual target_count from the database
            // This is the target that was set when the plan was created/updated
            let dailyTarget = day.target_count || 0;

            cumulativeTarget += dailyTarget;
            cumulativeActual += (day.actual_count || 0);

            const diff = cumulativeActual - cumulativeTarget;

            return {
                index,
                date: day.date,
                cumTarget: cumulativeTarget,
                cumActual: cumulativeActual,
                dayTarget: dailyTarget,
                dayActual: day.actual_count || 0,
                diff: diff,
                isWritingDay: dailyTarget > 0,
                statusHeader: dailyTarget > 0 ? 'Writing Day' : 'Day Off'
            };
        });

        // Determine Max Y Calculation
        this.maxChartValue = Math.max(totalTarget, cumulativeTarget, cumulativeActual);
        if (this.maxChartValue === 0) this.maxChartValue = 1000;

        this.maxDailyValue = Math.max(...points.map(p => p.dayActual), ...points.map(p => p.dayTarget));
        if (this.maxDailyValue === 0) this.maxDailyValue = 1000;

        // Dimensions
        const width = this.chartDimensions.width;
        const height = this.chartDimensions.height;
        const stepX = width / (points.length - 1 || 1);

        // Generate SVG Paths
        // Target Line
        this.chartData.target = points.map((p, i) => {
            const x = i * stepX;
            const y = this.getChartY(p.cumTarget, height);
            return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
        }).join(' ');

        // Actual Line (only show up to today)
        const todayStr = new Date().toISOString().split('T')[0];
        const actualPoints = points.filter(p => p.date <= todayStr);

        this.chartData.actual = actualPoints.map((p, i) => {
            const x = p.index * stepX;
            const y = this.getChartY(p.cumActual, height);
            return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
        }).join(' ');

        // Store points for tooltips
        this.chartPoints = points.map((p, i) => ({
            x: i * stepX,
            yActual: this.getChartY(p.cumActual, height),
            yTarget: this.getChartY(p.cumTarget, height),
            data: p
        }));

        // Generate Daily Bar Chart Data
        const dailyMax = Math.max(...points.map(p => p.dayActual), ...points.map(p => p.dayTarget), 100);
        this.maxDailyValue = dailyMax;
    }

    getChartY(value: number, height: number): number {
        return height - (value / this.maxChartValue) * height;
    }

    // Schedule Tab Calendar Helpers
    currentCalendarDate: Date = new Date();


    changeCalendarMonth(delta: number) {
        this.currentCalendarDate = new Date(
            this.currentCalendarDate.getFullYear(),
            this.currentCalendarDate.getMonth() + delta,
            1
        );
        this.generateCalendarDays();
    }

    savePlanNoteToBackend(dateKey: string) {
        if (!this.planId) return;

        const note = this.planNotes[dateKey] || '';

        // Find the plan day to get actual_count
        const planDay = this.allPlanDays.find(d => {
            const dayDateKey = d.date.split('T')[0];
            return dayDateKey === dateKey;
        });
        const actualCount = planDay?.actual_count || 0;

        console.log(`💾 Saving note for ${dateKey}: "${note}"`);

        // Save note to backend
        this.apiService.logProgress(this.planId, dateKey, actualCount, note).subscribe({
            next: (response) => {
                if (response.success) {
                    // Update the plan day's notes in local data
                    if (planDay) {
                        planDay.notes = note;
                    }
                    // Ensure planNotes is also updated (important for persistence)
                    this.planNotes[dateKey] = note;
                    console.log(`✅ Note saved successfully for ${dateKey}: "${note}"`);
                    // Don't refresh all data - just update local state to avoid losing focus
                } else {
                    console.error('Failed to save note:', response.message);
                    this.notificationService.showError(response.message || 'Failed to save note');
                }
            },
            error: (err) => {
                console.error('Error saving note', err);
                this.notificationService.showError('Failed to save note');
            }
        });
    }

    updateWritingStrategy(strategy: string) {
        if (!this.planId || !this.plan) return;

        // Map frontend strategy names to backend values
        // Based on descriptions:
        // - "Weekdays Only": Monday-Friday only, weekends are rest days
        // - "The Usual": All days including weekends
        // - "Adaptive rest": Flexible scheduling, weekends are rest days
        const strategyMap: { [key: string]: string } = {
            'Weekdays Only': 'Weekdays Only',  // Only weekdays (Mon-Fri) get word targets
            'The Usual': 'The Usual',          // All days (Mon-Sun) get word targets
            'Adaptive rest': 'None'            // Weekends are rest days (Mon-Fri only)
        };

        const backendStrategy = strategyMap[strategy] || strategy;

        // Helper function to ensure date is in YYYY-MM-DD format
        const formatDate = (date: any): string => {
            if (!date) return '';
            if (typeof date === 'string') {
                // If it's already a string, ensure it's in YYYY-MM-DD format
                if (date.includes('T')) {
                    return date.split('T')[0];
                }
                return date;
            }
            if (date instanceof Date) {
                return date.toISOString().split('T')[0];
            }
            // If it's an object, try to extract date
            if (typeof date === 'object' && date !== null) {
                if ('Year' in date && 'Month' in date && 'Day' in date) {
                    // MySqlDateTime-like object
                    const year = (date as any).Year;
                    const month = String((date as any).Month).padStart(2, '0');
                    const day = String((date as any).Day).padStart(2, '0');
                    return `${year}-${month}-${day}`;
                }
            }
            return '';
        };

        // Update plan with new weekend approach
        const updateData = {
            title: this.plan.title || this.plan.plan_name,
            total_word_count: this.plan.total_word_count || this.plan.target_amount,
            start_date: formatDate(this.plan.start_date),
            end_date: formatDate(this.plan.end_date),
            algorithm_type: this.plan.algorithm_type || 'steady',
            description: this.plan.description,
            is_private: this.plan.is_private || false,
            starting_point: this.plan.starting_point || 0,
            measurement_unit: this.plan.measurement_unit || 'words',
            is_daily_target: this.plan.is_daily_target || false,
            fixed_deadline: this.plan.fixed_deadline !== undefined ? this.plan.fixed_deadline : true,
            target_finish_date: this.plan.target_finish_date ? formatDate(this.plan.target_finish_date) : null,
            strategy_intensity: this.plan.strategy_intensity || 'Average',
            weekend_approach: backendStrategy,
            reserve_days: this.plan.reserve_days || 0,
            display_view_type: this.plan.display_view_type || 'Table',
            week_start_day: this.plan.week_start_day || 'Mondays',
            grouping_type: this.plan.grouping_type || 'Day',
            dashboard_color: this.plan.dashboard_color || this.plan.color_code || '#000000',
            show_historical_data: this.plan.show_historical_data !== undefined ? this.plan.show_historical_data : true,
            progress_tracking_type: this.plan.progress_tracking_type || 'Daily Goals',
            activity_type: this.plan.activity_type || 'Writing',
            content_type: this.plan.content_type || 'Novel',
            status: (() => {
                const status = this.plan.db_status || this.plan.status;
                if (!status) return 'active';
                if (typeof status === 'string') {
                    return status.toLowerCase();
                }
                // If status is an object or other type, default to active
                return 'active';
            })(),
            current_progress: this.plan.current_progress || this.plan.progress || 0
        };

        this.isLoading = true;
        this.cdr.detectChanges();

        console.log('Updating plan with data:', updateData);

        this.apiService.updatePlan(this.planId, updateData).subscribe({
            next: (response) => {
                if (response.success) {
                    this.notificationService.showSuccess('Writing strategy updated successfully');
                    // Reload plan details to get updated schedule
                    this.loadPlanDetails();
                } else {
                    console.error('Update failed:', response);
                    this.notificationService.showError(response.message || 'Failed to update writing strategy');
                    this.isLoading = false;
                    this.cdr.detectChanges();
                }
            },
            error: (err) => {
                console.error('Error updating writing strategy', err);
                console.error('Error details:', err.error);
                console.error('Request data:', updateData);
                const errorMsg = err.error?.message || err.message || 'Failed to update writing strategy';
                this.notificationService.showError(errorMsg);
                this.isLoading = false;
                this.cdr.detectChanges();
            }
        });
    }

    isToday(date: Date): boolean {
        return date.toISOString().split('T')[0] === this.todayDate;
    }

    formatDateKey(date: Date): string {
        return date.toISOString().split('T')[0];
    }

    onMouseEnterPoint(point: any, chart: 'cumulative' | 'daily') {
        this.hoveredPoint = point;
        this.hoveredChart = chart;
    }

    onMouseLeavePoint() {
        this.hoveredPoint = null;
        this.hoveredChart = null;
    }

    /**
     * Handles tab change - data is already loaded, just switch tabs
     */
    onTabChange(tab: 'plan' | 'schedule' | 'progress' | 'stats') {
        this.activeTab = tab;
        // Data is already loaded in loadActivityLogs() when the page loads
        // Only regenerate calendar if it's not already generated
        if (tab === 'schedule' && this.calendarDays.length === 0 && this.allPlanDays.length > 0) {
            console.log('📅 Schedule tab opened, generating calendar...');
            this.generateCalendarDays();
        }
    }

    /**
     * Force refresh plan days data from backend
     * This ensures Schedule and Analytics always show the latest saved data
     */
    refreshPlanDaysData() {
        if (!this.planId || !this.plan) {
            console.warn('⚠ Cannot refresh plan days: planId or plan data missing');
            return;
        }

        console.log('🔄 Force refreshing plan days data for Schedule/Analytics...');
        // Clear existing data first to force fresh load
        this.allPlanDays = [];
        this.activityLogs = [];
        this.cdr.detectChanges();

        // Reload activity logs which will refresh all data
        this.loadActivityLogs();
    }

    /**
     * Normalizes algorithm_type to handle case differences between database and frontend
     * Returns the strategy in the format used in create-plan component (e.g., 'Steady', 'Front-load')
     */
    getNormalizedAlgorithmType(): string {
        if (!this.plan || !this.plan.algorithm_type) {
            return 'Steady';
        }
        const algo = this.plan.algorithm_type.toString().trim().toLowerCase();

        // Map database values to frontend format (case-sensitive matching)
        const strategyMap: { [key: string]: string } = {
            'steady': 'Steady',
            'front-load': 'Front-load',
            'frontload': 'Front-load',
            'back-load': 'Back-load',
            'backload': 'Back-load',
            'mountain': 'Mountain',
            'valley': 'Valley',
            'oscillating': 'Oscillating',
            'randomly': 'Randomly',
            'random': 'Randomly'
        };

        // Check exact match first
        if (strategyMap[algo]) {
            return strategyMap[algo];
        }

        // Fallback: capitalize first letter and handle hyphens
        const normalized = algo.split('-').map(word =>
            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ).join('-');

        // Check if normalized version exists in map
        if (strategyMap[normalized.toLowerCase()]) {
            return strategyMap[normalized.toLowerCase()];
        }

        return normalized || 'Steady';
    }

    /**
     * Checks if a given strategy is the active one for this plan
     */
    isActiveStrategy(strategy: string): boolean {
        return this.getNormalizedAlgorithmType() === strategy;
    }

    getUnitLabel(count: number): string {
        const unit = this.plan?.measurement_unit?.toLowerCase() || 'word';

        if (Math.abs(count) === 1) {
            return unit;
        }

        const mappings: { [key: string]: string } = {
            'word': 'words', 'page': 'pages', 'poem': 'poems', 'chapter': 'chapters',
            'section': 'sections', 'character': 'characters', 'verse': 'verses', 'act': 'acts',
            'scene': 'scenes', 'stanza': 'stanzas', 'line': 'lines', 'book': 'books',
            'day': 'days', 'hour': 'hours', 'minute': 'minutes', 'unit': 'units',
            'item': 'items', 'task': 'tasks', 'todo': 'todos', 'step': 'steps',
            'entry': 'entries', 'post': 'posts', 'worksheet': 'worksheets', 'dollar': 'dollars',
            'mile': 'miles', 'km': 'kilometers', 'lb': 'pounds', 'kg': 'kilograms',
            'stitch': 'stitches', 'time': 'times', 'episode': 'episodes', 'video': 'videos',
            'movie': 'movies', 'lesson': 'lessons', 'feature': 'features'
        };

        return mappings[unit] || unit + 's';
    }
}
