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
  private isInitialized = false;

  constructor(
    private apiService: ApiService,
    private mockData: MockDataService,
    private router: Router,
    private route: ActivatedRoute
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
    const userType = localStorage.getItem('user_type');

    // Fetch real dashboard stats from backend
    this.apiService.getDashboardStats().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          console.log('Dashboard stats:', response.data);
          this.stats = response.data;
        }
      },
      error: (error) => {
        console.error('Error fetching dashboard stats:', error);
        // Fallback to mock data on error
        if (userType !== 'demo') this.stats = this.mockData.generateMockStats();
      }
    });

    // Fetch real plans from backend
    this.apiService.getPlans().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          console.log('Plans loaded:', response.data);
          this.plans = response.data.map((p: any) => ({
            ...p,
            progress: p.target_amount > 0 ? Math.round((p.completed_amount / p.target_amount) * 100) : 0
          }));
        } else {
          this.plans = [];
        }
      },
      error: (error) => {
        console.error('Error fetching plans:', error);
        if (userType !== 'demo') {
          this.plans = this.mockData.generateMockPlans(8);
        } else {
          this.plans = [];
        }
      }
    });
  }
}
