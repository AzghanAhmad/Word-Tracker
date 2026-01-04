import { Component, ViewEncapsulation, Input, Output, EventEmitter, OnInit, ChangeDetectorRef, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-navbar',
    standalone: true,
    imports: [CommonModule, RouterLink, RouterLinkActive],
    templateUrl: './navbar.component.html',
    styleUrls: ['./navbar.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class NavbarComponent implements OnInit, OnChanges {
    @Input() isPublic = false;
    @Input() isMenuOpen = false;
    @Output() toggleSidebarEvent = new EventEmitter<void>();

    userAvatar: string = '';
    userInitials: string = '';
    isLoggedIn = false;
    private refreshSub?: Subscription;

    constructor(
        private router: Router,
        private apiService: ApiService,
        private cdr: ChangeDetectorRef
    ) { }

    ngOnInit() {
        this.checkAndLoadProfile();
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes['isPublic']) {
            this.checkAndLoadProfile();
        }
    }

    ngOnDestroy() {
        if (this.refreshSub) {
            this.refreshSub.unsubscribe();
        }
    }

    private checkAndLoadProfile() {
        if (typeof localStorage !== 'undefined') {
            this.isLoggedIn = !!localStorage.getItem('user_id');
        }

        if (!this.isPublic) {
            this.loadUserProfile();

            // Refresh when profile/avatar is updated
            if (!this.refreshSub) {
                this.refreshSub = this.apiService.refreshSidebar$.subscribe(() => {
                    this.loadUserProfile();
                });
            }
        } else {
            // Check if we are logged in even on public pages
            if (this.isLoggedIn) {
                this.loadUserProfile();
            }

            // Clean up if it becomes public
            if (this.refreshSub) {
                this.refreshSub.unsubscribe();
                this.refreshSub = undefined;
            }
        }
    }

    loadUserProfile() {
        // Initial fallbacks from localStorage for instant feedback
        const savedAvatar = localStorage.getItem('avatar_url');
        const savedUsername = localStorage.getItem('username');

        if (savedAvatar) this.userAvatar = savedAvatar;
        if (savedUsername) this.userInitials = this.getInitials(savedUsername);

        const userId = localStorage.getItem('user_id');
        if (!userId) {
            this.isLoggedIn = false;
            return;
        }

        this.apiService.getUserProfile().subscribe({
            next: (response) => {
                if (response.success && response.data) {
                    this.userAvatar = response.data.avatar_url || '';
                    this.userInitials = this.getInitials(response.data.username || 'User');

                    // Sync localStorage
                    if (response.data.avatar_url) {
                        localStorage.setItem('avatar_url', response.data.avatar_url);
                    }
                    if (response.data.username) {
                        localStorage.setItem('username', response.data.username);
                    }

                    this.cdr.detectChanges();
                }
            },
            error: (err) => {
                console.error('Error loading profile for navbar:', err);
                // Even on error, ensure initials are set if possible
                if (!this.userInitials && savedUsername) {
                    this.userInitials = this.getInitials(savedUsername);
                    this.cdr.detectChanges();
                }
            }
        });
    }

    getInitials(name: string): string {
        if (!name) return '?';
        const parts = name.split(' ');
        if (parts.length >= 2) {
            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    }

    toggleMobileMenu() {
        this.toggleSidebarEvent.emit();
    }

    closeMobileMenu() {
        this.isMenuOpen = false;
    }

    logout() {
        localStorage.removeItem('user_id');
        localStorage.removeItem('username');
        localStorage.removeItem('email');
        localStorage.setItem('avatar_url', '');
        this.router.navigate(['/login']);
    }
}
