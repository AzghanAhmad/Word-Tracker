// Calendar Page Component for AuthorFlow
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
  viewMode: 'daily-total' | 'progress-vs-plan' = 'progress-vs-plan';
  calendarView: 'weekly' | 'monthly' | 'yearly' = 'monthly';
  timeFilter: 'future' | 'all' = 'all';

  // Debug flag
  debugMode = false;
  private routeSubscription?: Subscription;
  private navigationSubscription?: Subscription;

  get monthName(): string {
    if (this.calendarView === 'yearly') {
      return this.currentDate.getFullYear().toString();
    }
    if (this.calendarView === 'weekly') {
      const start = this.getStartOfWeek(this.currentDate);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      return `${start.toLocaleDateString('default', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('default', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }
    return this.currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  }

  private getStartOfWeek(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
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

  setViewType(type: string) {
    console.log('Switching view to:', type);
    this.calendarView = type as any;
    this.fetchPlanDays();
  }

  nextMonth() {
    if (this.calendarView === 'yearly') {
      this.currentDate = new Date(this.currentDate.getFullYear() + 1, 0, 1);
    } else if (this.calendarView === 'weekly') {
      this.currentDate = new Date(this.currentDate.getTime() + 7 * 24 * 60 * 60 * 1000);
    } else {
      this.currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 1);
    }
    this.fetchPlanDays();
  }

  prevMonth() {
    if (this.calendarView === 'yearly') {
      this.currentDate = new Date(this.currentDate.getFullYear() - 1, 0, 1);
    } else if (this.calendarView === 'weekly') {
      this.currentDate = new Date(this.currentDate.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else {
      this.currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() - 1, 1);
    }
    this.fetchPlanDays();
  }

  goToday() {
    this.currentDate = new Date();
    this.fetchPlanDays();
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
      // Trigger change detection to update the calendar grid
      this.cdr.detectChanges();
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

      // Fetch actual logs from plan_days table
      this.apiService.getPlanDays(this.planId).subscribe({
        next: (response) => {
          if (response.success && response.data) {
            const logs: { [key: string]: number } = {};
            response.data.forEach((d: any) => {
              // Normalize date to YYYY-MM-DD format
              let dateKey: string;

              if (typeof d.date === 'string') {
                if (d.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
                  dateKey = d.date;
                } else if (d.date.includes('T')) {
                  const dateObj = new Date(d.date);
                  dateKey = this.formatDateKey(dateObj);
                } else {
                  const dateObj = new Date(d.date);
                  dateKey = this.formatDateKey(dateObj);
                }
              } else {
                const dateObj = new Date(d.date);
                dateKey = this.formatDateKey(dateObj);
              }
              // Sum up actual_count if multiple entries exist for the same date
              const actualCount = d.actual_count || d.actualCount || 0;
              logs[dateKey] = (logs[dateKey] || 0) + actualCount;
            });
            // Create a new object reference to trigger change detection
            this.dailyLogs = { ...logs };
            console.log('Daily logs loaded for plan:', this.dailyLogs);
            console.log('Total dates with words:', Object.keys(this.dailyLogs).length);
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
    // Otherwise, fetch all plans for calendar view
    // Otherwise, fetch all plans for calendar view with optimized endpoint
    this.apiService.getCalendarPlans().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          const plans = response.data;
          this.allPlans = plans;
          console.log('Calendar Page - Loaded', plans.length, 'plans with daily logs');

          if (plans.length > 0) {
            console.log('[DEBUG] First plan details:', plans[0]);
            if (plans[0].days) {
              console.log(`[DEBUG] First plan has ${plans[0].days.length} embedded days`);
              if (plans[0].days.length > 0) console.log('[DEBUG] Sample day:', plans[0].days[0]);
            } else {
              console.warn('[DEBUG] First plan has NO days property!');
            }
          }

          this.targets = this.generateTargetsFromPlans(plans);
          this.deadlines = this.generateDeadlinesFromPlans(plans);

          let plansByDate = this.generatePlansByDate(plans);
          const allLogs: { [key: string]: number } = {};

          plans.forEach((plan: any) => {
            if (plan.days && Array.isArray(plan.days)) {
              plan.days.forEach((day: any) => {
                let dateKey: string | null = null;

                if (day.date) {
                  if (typeof day.date === 'string') {
                    if (day.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
                      dateKey = day.date;
                    } else if (day.date.includes('T')) {
                      const dateObj = new Date(day.date);
                      dateKey = this.formatDateKey(dateObj);
                    } else {
                      const dateObj = new Date(day.date);
                      dateKey = this.formatDateKey(dateObj);
                    }
                  }
                  if (!dateKey) {
                    try { dateKey = new Date(day.date).toISOString().split('T')[0]; } catch (e) { }
                  }
                }

                if (dateKey) {
                  const actualCount = (day.actual_count !== undefined) ? day.actual_count : (day.actualCount || 0);
                  allLogs[dateKey] = (allLogs[dateKey] || 0) + actualCount;

                  if (plansByDate[dateKey]) {
                    const planInDate = plansByDate[dateKey].find((p: any) => p.id === plan.id);
                    if (planInDate) {
                      planInDate.actualProgress = actualCount;
                    }
                  }
                }
              });
            }
          });

          this.plansByDate = plansByDate;
          this.dailyLogs = allLogs;
          this.isLoading = false;
          this.cdr.detectChanges();

        } else {
          this.resetData();
        }
      },
      error: (error) => {
        console.error('Error fetching calendar plans:', error);
        this.resetData();
      }
    });
  }

  private resetData() {
    this.targets = {};
    this.deadlines = {};
    this.plansByDate = {};
    this.allPlans = [];
    this.isLoading = false;
    this.cdr.detectChanges();
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
  /**
   * Formats date as YYYY-MM-DD for use as key
   */
  private formatDateKey(date: Date): string {
    // UPDATED: Use local time instead of UTC to match PlanDetailsComponent logic
    // This ensures that the dates displayed in Calendar match exactly with Plan Details
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
   * Includes actual progress for each plan on each date
   * Respects the plan's writing strategy (weekend approach)
   */
  private generatePlansByDate(plans: any[]): { [key: string]: any[] } {
    const plansByDate: { [key: string]: any[] } = {};

    if (!plans || plans.length === 0) {
      console.warn('generatePlansByDate: No plans provided');
      return plansByDate;
    }

    plans.forEach(plan => {
      if (!plan.start_date || !plan.end_date) {
        console.warn('generatePlansByDate: Plan missing dates', plan.id, plan.title || plan.plan_name, {
          start_date: plan.start_date,
          end_date: plan.end_date
        });
        return;
      }

      // Parse dates - handle multiple formats
      let startDate: Date;
      let endDate: Date;

      // Helper function to parse date from various formats
      const parseDate = (dateValue: any): Date | null => {
        if (!dateValue) return null;

        // Handle JSON string containing MySqlDateTime object
        if (typeof dateValue === 'string' && dateValue.startsWith('{')) {
          try {
            const parsed = JSON.parse(dateValue);
            if (parsed.Year && parsed.Month && parsed.Day) {
              return new Date(parsed.Year, parsed.Month - 1, parsed.Day);
            }
          } catch (e) {
            // If JSON parse fails, continue to other formats
          }
        }

        // Handle string dates
        if (typeof dateValue === 'string') {
          // If YYYY-MM-DD, strict local
          if (dateValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
            const parts = dateValue.split('-');
            return new Date(+parts[0], +parts[1] - 1, +parts[2]);
          }
          // If ISO or other, parse normally (handles local timezone if ISO)
          const date = new Date(dateValue);
          if (!isNaN(date.getTime())) {
            return date;
          }
        }

        // Handle MySqlDateTime-like objects (already parsed)
        if (dateValue && typeof dateValue === 'object') {
          if (dateValue.Year && dateValue.Month && dateValue.Day) {
            return new Date(dateValue.Year, dateValue.Month - 1, dateValue.Day);
          }
        }

        // Try standard Date parsing as fallback
        const parsed = new Date(dateValue);
        return isNaN(parsed.getTime()) ? null : parsed;
      };

      startDate = parseDate(plan.start_date);
      endDate = parseDate(plan.end_date);

      // Validate dates
      if (!startDate || !endDate || isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        console.warn('generatePlansByDate: Invalid dates for plan', plan.id, plan.title || plan.plan_name, {
          start_date: plan.start_date,
          end_date: plan.end_date,
          parsed_start: startDate,
          parsed_end: endDate
        });
        return;
      }

      console.log('generatePlansByDate: Processing plan', plan.id, plan.title || plan.plan_name, {
        start: this.formatDateKey(startDate),
        end: this.formatDateKey(endDate),
        total_words: plan.total_word_count || plan.target_amount
      });

      const weekendApproach = plan.weekend_approach || 'The Usual';

      // Calculate writing days count based on weekend approach
      let writingDaysCount = 0;
      const calcDate = new Date(startDate);
      const calcEndDate = new Date(endDate);

      while (calcDate <= calcEndDate) {
        const isWeekend = calcDate.getDay() === 0 || calcDate.getDay() === 6;
        let isWritingDay = true;

        if (weekendApproach === 'Weekdays Only') {
          isWritingDay = !isWeekend;
        } else if (weekendApproach === 'None' || weekendApproach === 'Rest Days') {
          isWritingDay = !isWeekend;
        }

        if (isWritingDay) {
          writingDaysCount++;
        }

        calcDate.setDate(calcDate.getDate() + 1);
      }

      if (writingDaysCount === 0) writingDaysCount = 1;

      const totalWords = plan.total_word_count || plan.target_amount || 0;
      const dailyTarget = Math.ceil(totalWords / writingDaysCount);
      let wordsRemaining = totalWords;
      let daysRemaining = writingDaysCount;

      // Add plan to each day in its date range, respecting writing strategy
      const currentDate = new Date(startDate);
      const endDateObj = new Date(endDate);

      while (currentDate <= endDateObj) {
        const dateKey = this.formatDateKey(currentDate);
        const isWeekend = currentDate.getDay() === 0 || currentDate.getDay() === 6;
        let isWritingDay = true;

        if (weekendApproach === 'Weekdays Only') {
          isWritingDay = !isWeekend;
        } else if (weekendApproach === 'None' || weekendApproach === 'Rest Days') {
          isWritingDay = !isWeekend;
        }

        if (!plansByDate[dateKey]) {
          plansByDate[dateKey] = [];
        }

        let dayTarget = 0;
        if (isWritingDay && daysRemaining > 0) {
          dayTarget = Math.round(wordsRemaining / daysRemaining);
          wordsRemaining -= dayTarget;
          daysRemaining--;
        }

        plansByDate[dateKey].push({
          ...plan,
          dailyTarget: dayTarget,
          actualProgress: 0 // Will be updated when plan days are fetched
        });

        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);
      }
    });

    console.log('generatePlansByDate: Generated plans for', Object.keys(plansByDate).length, 'dates');
    return plansByDate;
  }
}
