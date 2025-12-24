import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { ContentLoaderComponent } from '../content-loader/content-loader.component';

@Component({
    selector: 'app-plan-details',
    standalone: true,
    imports: [CommonModule, RouterLink, ContentLoaderComponent],
    templateUrl: './plan-details.component.html',
    styleUrls: ['./plan-details.component.scss']
})
export class PlanDetailsComponent implements OnInit {
    isLoading = true;
    planId: number | null = null;
    plan: any = null;
    stats: any = {
        wordsPerDay: 0,
        daysRemaining: 0,
        projectedFinishDate: null
    };
    mockLogs: any[] = [];

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private apiService: ApiService
    ) { }

    ngOnInit() {
        this.route.paramMap.subscribe(params => {
            const id = params.get('id');
            if (id) {
                this.planId = +id;
                this.loadPlanDetails();
            } else {
                this.router.navigate(['/dashboard']);
            }
        });

        // Generate some mock activity logs
        this.mockLogs = Array(5).fill(0).map((_, i) => ({
            date: new Date(Date.now() - i * 86400000).toLocaleDateString(),
            words: Math.floor(Math.random() * 500) + 100,
            duration: Math.floor(Math.random() * 60) + 30
        }));
    }

    loadPlanDetails() {
        if (!this.planId) return;

        this.isLoading = true;
        this.apiService.getPlan(this.planId).subscribe({
            next: (response) => {
                if (response.success && response.data) {
                    this.plan = response.data;
                    this.calculateStats();
                } else {
                    // If not found in single fetch, try fetching all plans (fallback for mock)
                    this.apiService.getPlans().subscribe(allResponse => {
                        if (allResponse.success && allResponse.data) {
                            const found = allResponse.data.find((p: any) => p.id === this.planId);
                            if (found) {
                                this.plan = found;
                                this.calculateStats();
                            } else {
                                console.error('Plan not found');
                                this.router.navigate(['/dashboard']);
                            }
                        }
                        this.isLoading = false;
                    });
                    return;
                }
                this.isLoading = false;
            },
            error: (err) => {
                console.error('Error loading plan', err);
                this.isLoading = false;
                // Mock fallback if API fails completely
                this.router.navigate(['/dashboard']);
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

        // Words Per Day needed
        const remainingWords = this.plan.target_amount - this.plan.completed_amount;
        if (remainingWords > 0 && this.stats.daysRemaining > 0) {
            this.stats.wordsPerDay = Math.ceil(remainingWords / this.stats.daysRemaining);
        } else {
            this.stats.wordsPerDay = 0;
        }

        // Progress percentage for display
        this.plan.progress = this.plan.target_amount > 0
            ? Math.round((this.plan.completed_amount / this.plan.target_amount) * 100)
            : 0;
    }

    deletePlan() {
        if (confirm('Are you sure you want to delete this plan? This action cannot be undone.')) {
            // In a real app we would call delete API
            // this.apiService.deletePlan(this.planId).subscribe(...)
            alert('Plan deleted (Mock)');
            this.router.navigate(['/dashboard']);
        }
    }

    getFormattedDate(dateStr: string): string {
        return new Date(dateStr).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    }
}
