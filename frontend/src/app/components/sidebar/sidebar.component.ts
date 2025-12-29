import { Component, HostListener, OnInit, Output, EventEmitter, ViewEncapsulation, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { ApiService } from '../../services/api.service';


@Component({
    selector: 'app-sidebar',
    standalone: true,
    imports: [CommonModule, RouterLink, RouterLinkActive],
    templateUrl: './sidebar.component.html',
    styleUrls: ['./sidebar.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class SidebarComponent implements OnInit {
    isCollapsed = false;
    activeChallengesCount = 0; // Count of active challenges
    activePlans: any[] = []; // List of active plans for progress
    isProgressExpanded = true; // Toggle for latest progress

    @HostListener('window:resize', ['$event'])
    onResize(event: any) {
        this.checkScreenSize();
    }

    constructor(
        private router: Router,
        private apiService: ApiService,
        private cdr: ChangeDetectorRef
    ) {
        this.checkScreenSize();
    }

    ngOnInit() {
        this.loadActiveChallenges();
        this.loadActivePlans();

        // Refresh sidebar data when needed
        this.apiService.refreshSidebar$.subscribe(() => {
            this.loadActiveChallenges();
            this.loadActivePlans();
        });
    }


    loadActiveChallenges() {
        // Fetch dashboard stats for active plans count (used for the badge in latest progress)
        this.apiService.getDashboardStats().subscribe({
            next: (response) => {
                if (response.success && response.data) {
                    this.activeChallengesCount = response.data.activePlans;
                    this.cdr.detectChanges();
                }
            },
            error: (err) => {
                console.error('Error loading dashboard stats:', err);
                this.activeChallengesCount = 0;
                this.cdr.detectChanges();
            }
        });
    }

    loadActivePlans() {
        // Fetch real plans from backend
        this.apiService.getPlans().subscribe({
            next: (response) => {
                console.log('Sidebar - Plans API Response:', response);
                if (response.success && response.data) {
                    console.log('Sidebar - All plans:', response.data);
                    // Filter plans that are active (simplistic check: has ID and word count)
                    // Since backend doesn't return 'status', we show all or filter by date if needed.
                    // For now, show all valid plans.
                    const validPlans = response.data.filter((p: any) => p.id && (p.total_word_count > 0 || p.target_amount > 0));

                    this.activePlans = validPlans
                        .map((p: any) => {
                            const total = p.total_word_count || p.target_amount || 0;
                            const current = p.current_count || p.completed_amount || 0;

                            return {
                                ...p,
                                plan_name: p.title || p.plan_name || 'Untitled Plan',
                                progress: p.current_progress || (total > 0 ? Math.round((current / total) * 100) : 0)
                            };
                        })
                        .slice(0, 5); // Show top 5

                    console.log('Sidebar - Active plans with progress:', this.activePlans);
                    this.cdr.detectChanges();
                }
            },
            error: (err) => {
                console.error('Error loading plans for sidebar:', err);
                this.activePlans = [];
                this.cdr.detectChanges();
            }
        });
    }

    toggleProgress() {
        this.isProgressExpanded = !this.isProgressExpanded;
        if (this.isProgressExpanded) {
            this.loadActivePlans();
        }
    }




    checkScreenSize() {
        if (typeof window !== 'undefined') {
            // On mobile/tablet (<1024px), default to collapsed (hidden)
            if (window.innerWidth < 1024) {
                this.isCollapsed = true;
            } else {
                this.isCollapsed = false;
            }
        }
    }

    toggleSidebar() {
        this.isCollapsed = !this.isCollapsed;
    }

    // Close sidebar on mobile when nav item is clicked
    onNavItemClick() {
        if (typeof window !== 'undefined' && window.innerWidth < 1024) {
            this.isCollapsed = true;
        }
    }

    // Force reload dashboard data when clicking Full Plan List
    onDashboardClick() {
        // Close sidebar on mobile
        this.onNavItemClick();

        // If already on dashboard, force reload by navigating away and back
        if (this.router.url === '/dashboard') {
            this.router.navigate(['/dashboard'], {
                skipLocationChange: false
            }).then(() => {
                // Trigger a reload event
                window.dispatchEvent(new Event('dashboard-reload'));
            });
        }
    }

    logout() {
        localStorage.removeItem('user_id');
        localStorage.removeItem('username');
        localStorage.removeItem('email');
        this.router.navigate(['/login']);
    }
}
