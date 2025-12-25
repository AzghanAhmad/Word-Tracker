import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink, NavigationEnd } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { NotificationService } from '../../services/notification.service';
import { ContentLoaderComponent } from '../content-loader/content-loader.component';
import { Subscription, filter } from 'rxjs';

@Component({
    selector: 'app-plan-details',
    standalone: true,
    imports: [CommonModule, RouterLink, ContentLoaderComponent],
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
    activityLogs: any[] = [];
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
                    // Sort by date descending (most recent first)
                    this.activityLogs = response.data
                        .map((d: any) => ({
                            date: new Date(d.date).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric', 
                                year: 'numeric' 
                            }),
                            words: d.actual_count || 0,
                            target: d.target_count || 0,
                            dateObj: new Date(d.date)
                        }))
                        .sort((a: any, b: any) => b.dateObj.getTime() - a.dateObj.getTime())
                        .slice(0, 10); // Show only last 10 entries

                    // Update completed amount from logs
                    const totalFromLogs = response.data.reduce((sum: number, d: any) => sum + (d.actual_count || 0), 0);
                    if (this.plan && totalFromLogs > 0) {
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
        const completedAmount = this.activityLogs.reduce((sum, log) => sum + log.words, 0);
        const totalCompleted = this.plan.completed_amount || completedAmount || 0;
        const targetAmount = this.plan.target_amount || this.plan.total_word_count || 0;

        // Words Per Day needed
        const remainingWords = targetAmount - totalCompleted;
        if (remainingWords > 0 && this.stats.daysRemaining > 0) {
            this.stats.wordsPerDay = Math.ceil(remainingWords / this.stats.daysRemaining);
        } else {
            this.stats.wordsPerDay = 0;
        }

        // Progress percentage for display
        this.plan.progress = targetAmount > 0
            ? Math.round((totalCompleted / targetAmount) * 100)
            : 0;

        // Update completed_amount for display
        this.plan.completed_amount = totalCompleted;
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
}
