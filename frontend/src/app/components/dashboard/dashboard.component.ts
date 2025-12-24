import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { MockDataService } from '../../services/mock-data.service';
import { filter, Subscription } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, OnDestroy {
  stats: any = {
    totalPlans: 0,
    totalWords: 0,
    activePlans: 0,
    completedPlans: 0
  };
  plans: any[] = [];
  private routerSubscription?: Subscription;
  private queryParamsSubscription?: Subscription;
  private reloadHandler?: () => void;
  private isInitialized = false;

  constructor(
    private apiService: ApiService,
    private mockData: MockDataService,
    private router: Router,
    private route: ActivatedRoute
  ) { }

  ngOnInit() {
    // Load data immediately on component initialization
    this.loadDashboardData();
    this.isInitialized = true;

    // Subscribe to router events to reload data when navigating to this route
    this.routerSubscription = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      // Always reload data when navigating to dashboard route
      // This ensures fresh data even when clicking the same route
      if (event.urlAfterRedirects.startsWith('/dashboard')) {
        console.log('Reloading dashboard data on navigation:', event.urlAfterRedirects);
        // Use a small delay to ensure component is ready
        setTimeout(() => {
          this.loadDashboardData();
        }, 0);
      }
    });

    // Subscribe to query params changes (for refresh parameter)
    this.queryParamsSubscription = this.route.queryParams.subscribe(params => {
      if (params['refresh']) {
        console.log('Dashboard refresh triggered via query params');
        this.loadDashboardData();
      }
    });

    // Listen for custom reload event from sidebar (with immediate execution)
    this.reloadHandler = () => {
      console.log('Dashboard reload event received');
      this.loadDashboardData();
    };
    window.addEventListener('dashboard-reload', this.reloadHandler);
  }

  ngOnDestroy() {
    // Clean up subscriptions
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
    if (this.queryParamsSubscription) {
      this.queryParamsSubscription.unsubscribe();
    }
    // Clean up event listener
    if (this.reloadHandler) {
      window.removeEventListener('dashboard-reload', this.reloadHandler);
    }
  }

  /**
   * Loads dashboard stats and plans from the backend
   */
  loadDashboardData() {
    const userType = localStorage.getItem('user_type');

    // Fetch real dashboard stats from backend
    this.apiService.getDashboardStats().subscribe({
      next: (response) => {
        console.log('Dashboard stats response:', response);
        if (response.success && response.data) {
          // Ensure all stats are properly mapped
          this.stats = {
            totalPlans: response.data.totalPlans ?? 0,
            activePlans: response.data.activePlans ?? 0,
            totalWords: response.data.totalWords ?? 0,
            completedPlans: response.data.completedPlans ?? 0
          };
          console.log('Dashboard stats loaded:', this.stats);
        } else {
          console.warn('Dashboard stats response missing data:', response);
          // Reset to defaults if no data
          this.stats = {
            totalPlans: 0,
            activePlans: 0,
            totalWords: 0,
            completedPlans: 0
          };
        }
      },
      error: (error) => {
        console.error('Error fetching dashboard stats:', error);
        console.error('Error details:', error.error);
        // Fallback to defaults on error
        this.stats = {
          totalPlans: 0,
          activePlans: 0,
          totalWords: 0,
          completedPlans: 0
        };
        // Only use mock data if not in demo mode
        if (userType !== 'demo') {
          console.log('Using mock data as fallback');
          this.stats = this.mockData.generateMockStats();
        }
      }
    });

    // Fetch real plans from backend
    this.apiService.getPlans().subscribe({
      next: (response) => {
        console.log('Plans API response:', response);
        if (response.success && response.data && Array.isArray(response.data)) {
          console.log('Plans loaded:', response.data);
          this.plans = response.data.map((p: any) => {
            // Handle both backend field names (total_word_count) and frontend expected names (target_amount)
            const targetAmount = p.target_amount ?? p.total_word_count ?? 0;
            const completedAmount = p.completed_amount ?? 0;
            const progress = targetAmount > 0 ? Math.round((completedAmount / targetAmount) * 100) : 0;
            
            return {
              ...p,
              plan_name: p.plan_name ?? p.title ?? 'Untitled Plan',
              target_amount: targetAmount,
              completed_amount: completedAmount,
              progress: progress
            };
          });
          console.log('Plans processed and displayed:', this.plans.length, 'plans');
        } else {
          console.warn('Plans response missing data or invalid format:', response);
          this.plans = [];
        }
      },
      error: (error) => {
        console.error('Error fetching plans:', error);
        console.error('Error details:', error.error);
        if (userType !== 'demo') {
          this.plans = this.mockData.generateMockPlans(8);
        } else {
          this.plans = [];
        }
      }
    });
  }
}
