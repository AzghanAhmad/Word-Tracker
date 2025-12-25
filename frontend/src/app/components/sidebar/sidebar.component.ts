import { Component, HostListener, OnInit, Output, EventEmitter, ViewEncapsulation } from '@angular/core';
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
        private apiService: ApiService
    ) {
        this.checkScreenSize();
    }

    ngOnInit() {
        this.loadActiveChallenges();
        this.loadActivePlans();
    }


    loadActiveChallenges() {
        // Fetch dashboard stats for active plans count (used for the badge in latest progress)
        this.apiService.getDashboardStats().subscribe({
            next: (response) => {
                if (response.success && response.data) {
                    this.activeChallengesCount = response.data.activePlans;
                }
            },
            error: (err) => {
                console.error('Error loading dashboard stats:', err);
                this.activeChallengesCount = 0;
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
                    const filteredPlans = response.data.filter((p: any) => p.status === 'In Progress');
                    console.log('Sidebar - Filtered "In Progress" plans:', filteredPlans);

                    this.activePlans = filteredPlans
                        .map((p: any) => ({
                            ...p,
                            progress: p.target_amount > 0 ? Math.round((p.completed_amount / p.target_amount) * 100) : 0
                        }))
                        .slice(0, 3); // Show top 3 active plans

                    console.log('Sidebar - Active plans with progress:', this.activePlans);
                }
            },
            error: (err) => {
                console.error('Error loading plans for sidebar:', err);
                this.activePlans = [];
            }
        });
    }

    toggleProgress() {
        this.isProgressExpanded = !this.isProgressExpanded;
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
