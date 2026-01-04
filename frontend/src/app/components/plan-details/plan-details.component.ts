import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink, NavigationEnd } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { NotificationService } from '../../services/notification.service';
import { ContentLoaderComponent } from '../content-loader/content-loader.component';
import { Subscription, filter } from 'rxjs';

@Component({
    selector: 'app-plan-details',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink, ContentLoaderComponent],
    templateUrl: './plan-details.component.html',
    styleUrls: ['./plan-details.component.scss']
})
export class PlanDetailsComponent implements OnInit, OnDestroy {
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

    // Display Toggle
    activeView: 'Graph' | 'Table' | 'Calendar' = 'Graph';

    // Form and UI state
    todayDate: string = '';
    newSessionDate: string = '';
    newSessionWords: number = 0;
    showAddSessionForm: boolean = false;
    activityLogs: any[] = [];
    editingSessionId: number | null = null;
    editingSessionValue: number = 0;
    hoveredPoint: any = null;

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
                    this.plan = response.data;
                    this.activeView = (this.plan.display_view_type === 'Table' || this.plan.display_view_type === 'Calendar')
                        ? this.plan.display_view_type
                        : 'Graph';
                    this.calculateStats();
                    this.loadActivityLogs();
                } else {
                    // Fallback to fetching all plans
                    this.apiService.getPlans().subscribe({
                        next: (allResponse) => {
                            if (allResponse.success && allResponse.data) {
                                const found = allResponse.data.find((p: any) => p.id === this.planId);
                                if (found) {
                                    this.plan = found;
                                    this.activeView = (this.plan.display_view_type === 'Table' || this.plan.display_view_type === 'Calendar')
                                        ? this.plan.display_view_type
                                        : 'Graph';
                                    this.calculateStats();
                                    this.loadActivityLogs();
                                } else {
                                    console.error('Plan not found');
                                    this.notificationService.showError('Plan not found');
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

    loadActivityLogs() {
        if (!this.planId) {
            this.isLoading = false;
            this.cdr.detectChanges();
            return;
        }

        // Fetch plan days for activity logs
        this.apiService.getPlanDays(this.planId).subscribe({
            next: (response) => {
                if (response.success && response.data) {
                    // Store ALL days for Chart (Sorted Ascending)
                    this.allPlanDays = response.data.map((d: any) => {
                        const dateObj = new Date(d.date);
                        return {
                            ...d,
                            dateObj: dateObj,
                            target_count: d.target_count || 0,
                            actual_count: d.actual_count || 0
                        };
                    }).sort((a: any, b: any) => a.dateObj.getTime() - b.dateObj.getTime());

                    this.generateChart();

                    // Calculate fallback daily target if DB returns 0s
                    const totalTarget = this.plan.target_amount || this.plan.total_word_count || 50000;
                    const fallbackDailyTarget = response.data.length > 0
                        ? Math.round(totalTarget / response.data.length)
                        : 0;

                    // Filter only days where work has been done (actual_count > 0)
                    // Sort by date descending (most recent first)
                    // Show only last 10 work days
                    this.activityLogs = response.data
                        .filter((d: any) => (d.actual_count || 0) > 0) // Only days with work done
                        .map((d: any) => {
                            const dateObj = new Date(d.date);
                            let dayTarget = (d.target_count && d.target_count > 0) ? d.target_count : fallbackDailyTarget;

                            // Fix: If daily target erroneously equals total target (and days > 1), use fallback
                            if (this.allPlanDays.length > 1 && dayTarget >= totalTarget) {
                                dayTarget = fallbackDailyTarget;
                            }

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
                                rawDate: d.date, // Store original date string for API calls
                                notes: d.notes || ''
                            };
                        })
                        .sort((a: any, b: any) => b.dateObj.getTime() - a.dateObj.getTime())
                        .slice(0, 10); // Show only last 10 work days

                    // Update completed amount from logs (only within valid date range)
                    let validLogs = response.data;
                    if (this.plan.start_date && this.plan.end_date) {
                        const start = new Date(this.plan.start_date);
                        start.setHours(0, 0, 0, 0);
                        const end = new Date(this.plan.end_date);
                        end.setHours(23, 59, 59, 999);

                        validLogs = response.data.filter((d: any) => {
                            const date = new Date(d.date);
                            return date >= start && date <= end;
                        });
                    }

                    const totalFromLogs = validLogs.reduce((sum: number, d: any) => sum + (d.actual_count || 0), 0);

                    // Always update plan completed amount with the accurate log sum
                    if (this.plan) {
                        this.plan.completed_amount = totalFromLogs;
                    }
                }
                // Recalculate stats after loading logs
                this.calculateStats();
                this.isLoading = false;
                this.cdr.detectChanges();
            },
            error: (err) => {
                console.error('Error loading activity logs', err);
                this.activityLogs = [];
                this.calculateStats(); // Still calculate stats even if logs fail
                this.isLoading = false;
                this.cdr.detectChanges();
            }
        });
    }

    calculateStats() {
        if (!this.plan) return;

        // Days Remaining
        const end = new Date(this.plan.end_date).getTime();
        const now = new Date().getTime();
        const diff = Math.ceil((end - now) / (1000 * 3600 * 24));
        this.stats.daysRemaining = diff > 0 ? diff : 0;

        // Calculate completed amount from activity logs if available
        let totalCompleted = this.activityLogs.reduce((sum, log) => sum + log.words, 0);

        // If we have explicit plan completion amount in DB, use that
        if (this.plan.completed_amount > totalCompleted) {
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
        if (remainingWords > 0 && this.stats.daysRemaining > 0) {
            this.stats.wordsPerDay = Math.ceil(remainingWords / this.stats.daysRemaining);
        } else {
            this.stats.wordsPerDay = 0;
        }

        // Progress percentage for display
        const calculatedProgress = targetAmount > 0
            ? Math.round((totalCompleted / targetAmount) * 100)
            : 0;

        // Use manual progress if set, otherwise fall back to calculated
        this.plan.progress = (this.plan.current_progress && this.plan.current_progress > 0)
            ? this.plan.current_progress
            : calculatedProgress;

        // Update completed_amount for display
        this.plan.completed_amount = (targetAmount > 0)
            ? Math.min(totalCompleted, targetAmount)
            : totalCompleted;
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
        const dateStr = log.rawDate || log.dateObj.toISOString().split('T')[0];

        this.apiService.logProgress(this.planId, dateStr, words, log.notes || '').subscribe({
            next: (response) => {
                if (response.success) {
                    // Update the log in the array
                    log.words = words;
                    this.editingSessionId = null;
                    this.notificationService.showSuccess('Session updated successfully');

                    // Reload plan details to get updated progress percentage
                    this.loadPlanDetails();
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
            const dateStr = log.rawDate || log.dateObj.toISOString().split('T')[0];

            // Set words to 0 to effectively delete the session
            this.apiService.logProgress(this.planId, dateStr, 0, '').subscribe({
                next: (response) => {
                    if (response.success) {
                        this.notificationService.showSuccess('Session deleted successfully');
                        // Reload plan details to get updated progress percentage
                        this.loadPlanDetails();
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

    addNewSession() {
        if (!this.planId || !this.newSessionDate || !this.newSessionWords || this.newSessionWords <= 0) {
            this.notificationService.showError('Please enter a valid date and word count');
            return;
        }

        this.apiService.logProgress(this.planId, this.newSessionDate, this.newSessionWords, '').subscribe({
            next: (response) => {
                if (response.success) {
                    this.notificationService.showSuccess('Session added successfully');
                    // Reset form
                    this.newSessionDate = this.todayDate; // Reset to today
                    this.newSessionWords = 0;
                    this.showAddSessionForm = false;
                    // Reload plan details to get updated progress percentage and refresh sessions list
                    this.loadPlanDetails();
                } else {
                    this.notificationService.showError('Failed to add session');
                }
            },
            error: (err) => {
                console.error('Error adding session', err);
                const errorMsg = err.error?.message || 'Failed to add session';
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
        const points = this.allPlanDays.map((day, index) => {
            // Use DB target if available, otherwise fallback
            let dailyTarget = (day.target_count && day.target_count > 0) ? day.target_count : fallbackDailyTarget;

            // Fix: If daily target erroneously equals total target (and days > 1), use fallback
            if (this.allPlanDays.length > 1 && dailyTarget >= totalTarget) {
                dailyTarget = fallbackDailyTarget;
            }

            cumulativeTarget += dailyTarget;
            cumulativeActual += (day.actual_count || 0);

            return {
                index,
                date: day.date,
                cumTarget: cumulativeTarget,
                cumActual: cumulativeActual,
                dayTarget: dailyTarget,
                dayActual: day.actual_count || 0
            };
        });

        // Determine Max Y Calculation
        this.maxChartValue = Math.max(totalTarget, cumulativeTarget, cumulativeActual);
        if (this.maxChartValue === 0) this.maxChartValue = 1000;

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

        // Actual Line
        this.chartData.actual = points.map((p, i) => {
            const x = i * stepX;
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
    }

    getChartY(value: number, height: number): number {
        return height - (value / this.maxChartValue) * height;
    }
}
