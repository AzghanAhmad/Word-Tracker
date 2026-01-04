import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { filter, Subscription } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { NavbarComponent } from '../navbar/navbar.component';
import { ContentLoaderComponent } from '../content-loader/content-loader.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, NavbarComponent, ContentLoaderComponent],
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
  public isLoading = false;

  // Pagination
  currentPage: number = 1;
  itemsPerPage: number = 12;

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

    // Fetch real dashboard stats from backend
    this.apiService.getDashboardStats().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          console.log('Dashboard stats:', response.data);
          this.stats = response.data;
        }
        this.cdr.detectChanges(); // Force update
      },
      error: (error) => {
        console.error('Error fetching dashboard stats:', error);
        // Fallback to mock data on error
        this.cdr.detectChanges(); // Force update
      }
    });

    // Fetch real plans from backend - using finalize here to turn off loading since it's the heavier call
    this.apiService.getPlans()
      .pipe(finalize(() => {
        this.isLoading = false;
        this.cdr.detectChanges(); // Force update on complete
      }))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            console.log('Plans loaded:', response.data);
            // Show all plans except archived ones
            this.plans = response.data
              .filter((p: any) => {
                // Only filter out archived plans - show completed plans too
                const status = (p.status || '').toLowerCase();
                return status !== 'archived';
              })
              .map((p: any) => {
                const color = (p.dashboard_color || p.color_code || '#6366f1').trim();
                const validColor = color && color.length > 0 && color.startsWith('#') ? color : '#6366f1';
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
          } else {
            this.plans = [];
          }
        },
        error: (error) => {
          console.error('Error fetching plans:', error);
          if (userType !== 'demo') {
            this.plans = [];
          } else {
            this.plans = [];
          }
        }
      });
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
      // Scroll to top of plans grid smoothly
      const grid = document.querySelector('.plans-grid');
      if (grid) {
        grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
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
