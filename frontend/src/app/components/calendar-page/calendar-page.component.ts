import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import { CalendarHeaderComponent } from './calendar-header/calendar-header.component';
import { CalendarGridComponent } from './calendar-grid/calendar-grid.component';
import { ContentLoaderComponent } from '../content-loader/content-loader.component';
import { environment } from '../../../environments/environment';
import { ApiService } from '../../services/api.service';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-calendar-page',
  standalone: true,
  imports: [CommonModule, CalendarHeaderComponent, CalendarGridComponent, RouterModule, ContentLoaderComponent],
  templateUrl: './calendar-page.component.html',
  styleUrls: ['./calendar-page.component.scss']
})
export class CalendarPageComponent implements OnInit, OnDestroy {
  currentDate: Date = new Date();
  targets: { [key: string]: number } = {};
  dailyLogs: { [key: string]: number } = {}; // Actual word counts
  deadlines: { [key: string]: boolean } = {};
  plansByDate: { [key: string]: any[] } = {}; // Plans grouped by date for progress-vs-plan mode
  allPlans: any[] = []; // Store all plans for progress-vs-plan mode
  username: string = 'User';
  planId: number | null = null;
  planDetails: any = null;
  isLoading: boolean = false;

  // View State
  viewMode: 'daily-total' | 'progress-vs-plan' = 'daily-total';
  timeFilter: 'future' | 'all' = 'all';
  private routeSubscription?: Subscription;
  private navigationSubscription?: Subscription;

  get monthName(): string {
    return this.currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  }

  constructor(
    private route: ActivatedRoute,
    private apiService: ApiService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit() {
    this.username = localStorage.getItem('username') || 'User';

    // Load data immediately
    this.loadCalendarData();

    // Subscribe to query params to get planId
    this.routeSubscription = this.route.queryParams.subscribe(params => {
      const planIdParam = params['planId'];
      if (planIdParam) {
        this.planId = +planIdParam;
        console.log('Loading plan details for plan ID:', this.planId);
        this.loadPlanDetails();
      } else {
        this.planId = null;
        this.planDetails = null;
        // If no planId, load all plans calendar view
        this.fetchPlanDays();
      }
    });

    // Reload on navigation back to this page
    this.navigationSubscription = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      if (event.url.includes('/calendar')) {
        this.loadCalendarData();
      }
    });
  }

  loadCalendarData() {
    const planIdParam = this.route.snapshot.queryParamMap.get('planId');
    if (planIdParam) {
      this.planId = +planIdParam;
      this.loadPlanDetails();
    } else {
      this.planId = null;
      this.fetchPlanDays();
    }
  }

  ngOnDestroy() {
    if (this.routeSubscription) {
      this.routeSubscription.unsubscribe();
    }
    if (this.navigationSubscription) {
      this.navigationSubscription.unsubscribe();
    }
  }

  /**
   * Loads plan details from backend when planId is provided
   */
  loadPlanDetails() {
    if (!this.planId) return;

    this.isLoading = true;
    this.cdr.detectChanges();

    this.apiService.getPlan(this.planId).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.planDetails = response.data;
          console.log('Plan details loaded:', this.planDetails);

          // Set current date to plan start date if available
          if (this.planDetails.start_date) {
            const startDate = new Date(this.planDetails.start_date);
            if (!isNaN(startDate.getTime())) {
              this.currentDate = startDate;
            }
          }

          // Generate calendar data for single plan
          this.allPlans = [this.planDetails];
          this.targets = this.generateTargetsFromPlan(this.planDetails);
          this.deadlines = this.generateDeadlinesFromPlan(this.planDetails);
          this.plansByDate = this.generatePlansByDate([this.planDetails]);
        } else {
          console.warn('Plan not found with ID:', this.planId);
        }
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading plan details:', error);
        // Fallback: try to get from all plans
        this.apiService.getPlans().subscribe({
          next: (response) => {
            if (response.success && response.data && Array.isArray(response.data)) {
              const plan = response.data.find((p: any) => p.id === this.planId);
              if (plan) {
                this.planDetails = plan;
                if (plan.start_date) {
                  const startDate = new Date(plan.start_date);
                  if (!isNaN(startDate.getTime())) {
                    this.currentDate = startDate;
                  }
                }
                // Generate calendar data for single plan
                this.allPlans = [plan];
                this.targets = this.generateTargetsFromPlan(plan);
                this.deadlines = this.generateDeadlinesFromPlan(plan);
                this.plansByDate = this.generatePlansByDate([plan]);
              }
            }
            this.isLoading = false;
            this.cdr.detectChanges();
          },
          error: () => {
            this.isLoading = false;
            this.cdr.detectChanges();
          }
        });
      }
    });
  }

  nextMonth() {
    this.currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 1);
    this.fetchPlanDays();
  }

  prevMonth() {
    this.currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() - 1, 1);
    this.fetchPlanDays();
  }

  goToday() {
    this.currentDate = new Date();
    this.fetchPlanDays();
  }

  setViewType(type: string) {
    console.log('Switching view to:', type);
    // You could implement weekly/yearly logic here
  }

  setViewMode(mode: 'daily-total' | 'progress-vs-plan') {
    this.viewMode = mode;
    console.log('View Mode changed to:', mode);
    // Refresh calendar data when mode changes
    if (this.allPlans.length > 0) {
      if (this.planId && this.planDetails) {
        this.plansByDate = this.generatePlansByDate([this.planDetails]);
      } else {
        this.plansByDate = this.generatePlansByDate(this.allPlans);
      }
    }
  }

  setTimeFilter(filter: 'future' | 'all') {
    this.timeFilter = filter;
    console.log('Time Filter changed to:', filter);
  }

  fetchPlanDays() {
    this.isLoading = true;
    this.cdr.detectChanges();

    const userId = localStorage.getItem('user_id');
    console.log('Fetching calendar data for User ID:', userId);

    if (!userId) {
      console.warn('No User ID found in localStorage');
      this.isLoading = false;
      this.cdr.detectChanges();
      return;
    }

    // If planId is provided, fetch specific plan details
    if (this.planId && this.planDetails) {
      // Use plan details to populate calendar targets
      // For now, we'll create a basic calendar view
      // In the future, this can fetch plan_days from backend
      this.allPlans = [this.planDetails];
      this.targets = this.generateTargetsFromPlan(this.planDetails);
      this.deadlines = this.generateDeadlinesFromPlan(this.planDetails);
      this.plansByDate = this.generatePlansByDate([this.planDetails]);

      // Fetch actual logs
      this.apiService.getPlanDays(this.planId).subscribe({
        next: (response) => {
          if (response.success && response.data) {
            const logs: { [key: string]: number } = {};
            response.data.forEach((d: any) => {
              logs[d.date] = d.actual_count;
            });
            this.dailyLogs = logs;
          }
          this.isLoading = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Error loading daily logs', err);
          this.isLoading = false;
          this.cdr.detectChanges();
        }
      });
      return;
    }

    // Otherwise, fetch all plans for calendar view
    this.apiService.getPlans().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.allPlans = response.data;
          // Generate targets from all plans
          this.targets = this.generateTargetsFromPlans(response.data);
          this.deadlines = this.generateDeadlinesFromPlans(response.data);
          this.plansByDate = this.generatePlansByDate(response.data);
        } else {
          this.targets = {};
          this.deadlines = {};
          this.plansByDate = {};
          this.allPlans = [];
        }
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error fetching plans for calendar:', error);
        this.targets = {};
        this.deadlines = {};
        this.plansByDate = {};
        this.allPlans = [];
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  /**
   * Generates calendar targets from a single plan
   */
  private generateTargetsFromPlan(plan: any): { [key: string]: number } {
    const targets: { [key: string]: number } = {};

    if (!plan.start_date || !plan.end_date || !plan.total_word_count) {
      return targets;
    }

    const startDate = new Date(plan.start_date);
    const endDate = new Date(plan.end_date);
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const dailyTarget = totalDays > 0 ? Math.ceil(plan.total_word_count / totalDays) : 0;

    // Generate targets for each day
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateKey = this.formatDateKey(d);
      targets[dateKey] = (targets[dateKey] || 0) + dailyTarget;
    }

    return targets;
  }

  /**
   * Generates calendar targets from multiple plans
   */
  private generateTargetsFromPlans(plans: any[]): { [key: string]: number } {
    const targets: { [key: string]: number } = {};

    plans.forEach(plan => {
      const planTargets = this.generateTargetsFromPlan(plan);
      Object.keys(planTargets).forEach(dateKey => {
        targets[dateKey] = (targets[dateKey] || 0) + planTargets[dateKey];
      });
    });

    return targets;
  }

  /**
   * Formats date as YYYY-MM-DD for use as key
   */
  private formatDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Generates deadlines from a single plan (end_date)
   */
  private generateDeadlinesFromPlan(plan: any): { [key: string]: boolean } {
    const deadlines: { [key: string]: boolean } = {};

    if (!plan.end_date) {
      return deadlines;
    }

    const endDate = new Date(plan.end_date);
    const dateKey = this.formatDateKey(endDate);
    deadlines[dateKey] = true;

    return deadlines;
  }

  /**
   * Generates deadlines from multiple plans
   */
  private generateDeadlinesFromPlans(plans: any[]): { [key: string]: boolean } {
    const deadlines: { [key: string]: boolean } = {};

    plans.forEach(plan => {
      const planDeadlines = this.generateDeadlinesFromPlan(plan);
      Object.keys(planDeadlines).forEach(dateKey => {
        deadlines[dateKey] = true;
      });
    });

    return deadlines;
  }

  /**
   * Generates plans grouped by date for progress-vs-plan mode
   */
  private generatePlansByDate(plans: any[]): { [key: string]: any[] } {
    const plansByDate: { [key: string]: any[] } = {};

    plans.forEach(plan => {
      if (!plan.start_date || !plan.end_date) return;

      const startDate = new Date(plan.start_date);
      const endDate = new Date(plan.end_date);
      const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const dailyTarget = totalDays > 0 ? Math.ceil(plan.total_word_count / totalDays) : 0;

      // Add plan to each day in its date range
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateKey = this.formatDateKey(d);
        if (!plansByDate[dateKey]) {
          plansByDate[dateKey] = [];
        }
        plansByDate[dateKey].push({
          ...plan,
          dailyTarget: dailyTarget
        });
      }
    });

    return plansByDate;
  }
}
