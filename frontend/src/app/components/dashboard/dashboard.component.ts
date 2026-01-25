import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { filter, Subscription } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { ContentLoaderComponent } from '../content-loader/content-loader.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, ContentLoaderComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, OnDestroy {
  stats: any = {
    totalPlans: 0,
    totalWords: 0,
    activePlans: 0,
    completedPlans: 0,
    activeChallenges: 0,
    totalChallenges: 0
  };
  plans: any[] = [];
  challenges: any[] = [];
  private routerSubscription?: Subscription;
  private isInitialized = false;
  public isLoading = false;

  // Pagination
  currentPage: number = 1;
  itemsPerPage = 20;

  constructor(
    private apiService: ApiService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit() {
    // Load data on initial load
    this.loadDashboardData();
    this.isInitialized = true;

    // Subscribe to router events to reload data when navigating to this route
    this.routerSubscription = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      // Always reload data when navigating to dashboard route
      // This ensures fresh data even when clicking the same route
      if (event.urlAfterRedirects.startsWith('/dashboard')) {
        console.log('Reloading dashboard data on navigation');
        // Use setTimeout to ensure component is ready
        setTimeout(() => {
          this.loadDashboardData();
        }, 100);
      }
    });

    // Listen for custom reload event from sidebar
    window.addEventListener('dashboard-reload', () => {
      console.log('Dashboard reload event received');
      this.loadDashboardData();
    });
  }

  ngOnDestroy() {
    // Clean up subscription
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
  }

  /**
   * Loads dashboard stats and plans from the backend
   */
  loadDashboardData() {
    this.isLoading = true;
    this.cdr.detectChanges(); // Force initial loader
    const userType = localStorage.getItem('user_type');
    
    // Check if we have valid authentication data
    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('user_id');
    
    if (!token || !userId) {
      console.warn('🔐 No valid authentication data found - redirecting to login');
      localStorage.clear();
      this.router.navigate(['/login']);
      return;
    }

    // Fetch real plans from backend
    this.apiService.getPlans()
      .subscribe({
        next: (response) => {
          console.log('Full API response:', response);
          console.log('Response success:', response.success);
          console.log('Response data type:', typeof response.data);
          console.log('Response data:', response.data);
          console.log('Is array?', Array.isArray(response.data));
          console.log('Response data length:', response.data?.length);

          if (response.success && response.data && Array.isArray(response.data)) {
            console.log('Plans loaded (raw):', response.data);
            console.log('Plans count before filter:', response.data.length);

            // Show all plans except archived ones
            const filteredPlans = response.data.filter((p: any) => {
              // Only filter out archived plans - show completed plans too
              const status = (p.status || '').toLowerCase();
              return status !== 'archived';
            });

            console.log('Plans count after filter:', filteredPlans.length);

            this.plans = filteredPlans
              .map((p: any) => {
                const color = (p.dashboard_color || p.color_code || '#1C2E4A').trim();
                const validColor = color && color.length > 0 && color.startsWith('#') ? color : '#1C2E4A';
                const progress = p.current_progress || (p.target_amount > 0 ? Math.round((p.completed_amount / p.target_amount) * 100) : 0);

                // Normalize status for display
                let displayStatus = p.status || 'In Progress';
                if (displayStatus.toLowerCase() === 'active') {
                  displayStatus = 'In Progress';
                } else if (displayStatus.toLowerCase() === 'completed') {
                  displayStatus = 'Completed';
                }

                return {
                  ...p,
                  plan_name: p.title || p.plan_name || 'Untitled Plan',
                  progress: progress,
                  completed_amount: (p.current_progress && p.current_progress > 0)
                    ? Math.max(p.completed_amount, Math.round((p.current_progress / 100) * p.target_amount))
                    : p.completed_amount,
                  color_code: validColor, // Ensure color is never empty
                  dashboard_color: validColor,
                  status: displayStatus
                };
              });

            console.log('Final plans array:', this.plans);
            console.log('Final plans count:', this.plans.length);
            
            // Calculate stats from plans data
            this.calculateStatsFromPlans();
          } else {
            console.warn('No plans data in response:', { success: response.success, hasData: !!response.data });
            this.plans = [];
          }
        },
        error: (error) => {
          console.error('❌ Error fetching plans:', error);
          
          // Check if it's an authentication error
          if (error.status === 401) {
            console.warn('🔐 Authentication error - clearing localStorage and redirecting to login');
            localStorage.clear();
            this.router.navigate(['/login']);
            return;
          }
          
          this.plans = [];
        }
      });

    // Fetch challenges from backend
    this.apiService.getChallenges()
      .pipe(finalize(() => {
        this.isLoading = false;
        this.cdr.detectChanges(); // Force update on complete
      }))
      .subscribe({
        next: (response) => {
          console.log('🏆 Challenges API response:', response);
          
          if (response.success && response.data && Array.isArray(response.data)) {
            this.challenges = response.data;
            console.log('🏆 Challenges loaded:', this.challenges.length);
            
            // Recalculate stats including challenges
            this.calculateStatsFromData();
          } else {
            console.warn('No challenges data in response:', { success: response.success, hasData: !!response.data });
            this.challenges = [];
            // Still calculate stats from plans only
            this.calculateStatsFromData();
          }
        },
        error: (error) => {
          console.error('❌ Error fetching challenges:', error);
          
          // Check if it's an authentication error
          if (error.status === 401) {
            console.warn('🔐 Authentication error - clearing localStorage and redirecting to login');
            localStorage.clear();
            this.router.navigate(['/login']);
            return;
          }
          
          this.challenges = [];
          // Still calculate stats from plans only
          this.calculateStatsFromData();
        }
      });
  }

  /**
   * Calculate dashboard stats from both plans and challenges data
   */
  private calculateStatsFromData() {
    // Calculate plans stats
    let totalPlans = 0;
    let activePlans = 0;
    let completedPlans = 0;
    let totalWords = 0;

    if (this.plans && this.plans.length > 0) {
      this.plans.forEach(plan => {
        totalPlans++;
        
        // Count active plans (not completed or archived)
        const status = (plan.status || '').toLowerCase();
        if (status === 'completed') {
          completedPlans++;
        } else if (status !== 'archived') {
          activePlans++;
        }
        
        // Sum up completed words from all plans
        const completedAmount = plan.completed_amount || 0;
        totalWords += completedAmount;
      });
    }

    // Calculate challenges stats
    let totalChallenges = 0;
    let activeChallenges = 0;

    if (this.challenges && this.challenges.length > 0) {
      this.challenges.forEach(challenge => {
        totalChallenges++;
        
        // Count active challenges
        const status = (challenge.status || '').toLowerCase();
        if (status === 'active') {
          activeChallenges++;
        }
      });
    }

    this.stats = {
      totalPlans,
      activePlans,
      completedPlans,
      totalWords,
      totalChallenges,
      activeChallenges
    };

    console.log('📊 Calculated stats from data:', this.stats);
    console.log(`📊 Plans: ${totalPlans} total, ${activePlans} active, ${completedPlans} completed, ${totalWords} words`);
    console.log(`🏆 Challenges: ${totalChallenges} total, ${activeChallenges} active`);
    
    this.cdr.detectChanges();
  }

  /**
   * Calculate dashboard stats directly from the plans data (legacy method)
   */
  private calculateStatsFromPlans() {
    // Call the new comprehensive method
    this.calculateStatsFromData();
  }

  // Pagination Methods
  get paginatedPlans(): any[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return this.plans.slice(startIndex, startIndex + this.itemsPerPage);
  }

  get totalPages(): number {
    return Math.ceil(this.plans.length / this.itemsPerPage);
  }

  setPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  getPages(): any[] {
    const total = this.totalPages;
    const current = this.currentPage;
    const delta = 2;
    const range = [];
    const rangeWithDots: any[] = [];
    let l;

    for (let i = 1; i <= total; i++) {
      if (i === 1 || i === total || (i >= current - delta && i <= current + delta)) {
        range.push(i);
      }
    }

    for (let i of range) {
      if (l) {
        if (i - l === 2) {
          rangeWithDots.push(l + 1);
        } else if (i - l !== 1) {
          rangeWithDots.push('...');
        }
      }
      rangeWithDots.push(i);
      l = i;
    }

    return rangeWithDots;
  }
}
