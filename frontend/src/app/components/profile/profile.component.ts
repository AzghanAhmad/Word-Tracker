import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, NavigationEnd } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { ContentLoaderComponent } from '../content-loader/content-loader.component';
import { filter } from 'rxjs/operators';

@Component({
    selector: 'app-profile',
    standalone: true,
    imports: [CommonModule, FormsModule, ContentLoaderComponent],
    templateUrl: './profile.component.html',
    styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit {
    isLoading = true;
    isEditing = false;
    isSaving = false;

    // User data
    user = {
        id: '',
        username: '',
        email: '',
        bio: '',
        avatar_url: 'test_avatar.png',
        created_at: '',
        initials: ''
    };

    // Edit form
    editForm = {
        username: '',
        email: '',
        bio: ''
    };

    errorMessage = '';
    successMessage = '';

    // Stats
    // Stats
    totalPlans = 0;
    totalWords = 0;
    memberSince = '';
    currentStreak = 0;

    constructor(
        private apiService: ApiService,
        private router: Router,
        private cdr: ChangeDetectorRef
    ) { }

    ngOnInit() {
        const userId = localStorage.getItem('user_id');
        if (!userId) {
            this.router.navigate(['/login']);
            return;
        }

        this.loadUserProfile();
        this.loadUserStats();

        // Reload on navigation back to this page
        this.router.events.pipe(
            filter(event => event instanceof NavigationEnd)
        ).subscribe((event: any) => {
            if (event.url === '/profile') {
                this.loadUserProfile();
                this.loadUserStats();
            }
        });
    }

    loadUserProfile() {
        this.isLoading = true;
        this.cdr.detectChanges();

        this.apiService.getUserProfile().subscribe({
            next: (response) => {
                console.log('Profile response:', response);
                if (response.success && response.data) {
                    const data = response.data;
                    this.user = {
                        id: data.id?.toString() || localStorage.getItem('user_id') || '',
                        username: data.username || 'User',
                        email: data.email || 'user@example.com',
                        bio: data.bio || '',
                        avatar_url: data.avatar_url || 'test_avatar.png',
                        created_at: data.created_at || new Date().toISOString(),
                        initials: this.getInitials(data.username || 'User')
                    };
                    this.memberSince = this.formatMemberSince(data.created_at || new Date().toISOString());

                    // Update localStorage
                    localStorage.setItem('username', this.user.username);
                    localStorage.setItem('email', this.user.email);
                } else {
                    // Fallback to localStorage if API fails
                    const userId = localStorage.getItem('user_id');
                    this.user = {
                        id: userId || '',
                        username: localStorage.getItem('username') || 'Guest',
                        email: localStorage.getItem('email') || 'user@example.com',
                        bio: '',
                        avatar_url: 'test_avatar.png',
                        created_at: new Date().toISOString(),
                        initials: this.getInitials(localStorage.getItem('username') || 'Guest')
                    };
                    this.memberSince = this.formatMemberSince(new Date().toISOString());
                }
                this.isLoading = false;
                this.cdr.detectChanges();
            },
            error: (err) => {
                console.error('Error loading profile:', err);
                // Fallback to localStorage
                const userId = localStorage.getItem('user_id');
                this.user = {
                    id: userId || '',
                    username: localStorage.getItem('username') || 'Guest',
                    email: localStorage.getItem('email') || 'user@example.com',
                    bio: '',
                    avatar_url: localStorage.getItem('avatar_url') || '',
                    created_at: new Date().toISOString(),
                    initials: this.getInitials(localStorage.getItem('username') || 'Guest')
                };
                this.memberSince = this.formatMemberSince(new Date().toISOString());
                this.isLoading = false;
                this.cdr.detectChanges();
            }
        });
    }

    loadUserStats() {
        // Fetch dashboard stats (Plans, Total Words)
        this.apiService.getDashboardStats().subscribe({
            next: (response) => {
                if (response.success && response.data) {
                    this.totalPlans = response.data.totalPlans || 0;
                    this.totalWords = response.data.totalWords || 0;
                    this.cdr.detectChanges();
                }
            },
            error: (err) => {
                console.error('Error loading dashboard stats:', err);
            }
        });

        // Fetch detailed stats (Streak)
        this.apiService.getStats().subscribe({
            next: (response) => {
                if (response.success && response.data) {
                    this.currentStreak = response.data.currentStreak || 0;
                    this.cdr.detectChanges();
                }
            },
            error: (err) => {
                console.error('Error loading detailed stats:', err);
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

    formatMemberSince(date: string): string {
        if (!date) return '';
        const d = new Date(date);
        return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }

    startEditing() {
        this.isEditing = true;
        this.editForm = {
            username: this.user.username,
            email: this.user.email,
            bio: this.user.bio
        };
        this.errorMessage = '';
        this.successMessage = '';
    }

    cancelEditing() {
        this.isEditing = false;
        this.errorMessage = '';
        this.successMessage = '';
    }

    saveProfile() {
        this.errorMessage = '';
        this.successMessage = '';

        // Validation
        if (!this.editForm.username.trim()) {
            this.errorMessage = 'Username is required';
            return;
        }

        if (!this.editForm.email.trim()) {
            this.errorMessage = 'Email is required';
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(this.editForm.email)) {
            this.errorMessage = 'Please enter a valid email address';
            return;
        }

        if (this.editForm.bio && this.editForm.bio.length > 500) {
            this.errorMessage = 'Bio must be 500 characters or less';
            return;
        }

        this.isSaving = true;
        this.cdr.detectChanges();

        this.apiService.updateUserProfile({
            username: this.editForm.username.trim(),
            email: this.editForm.email.trim(),
            bio: this.editForm.bio?.trim() || ''
        }).subscribe({
            next: (response) => {
                if (response.success) {
                    // Update local user data
                    this.user.username = this.editForm.username.trim();
                    this.user.email = this.editForm.email.trim();
                    this.user.bio = this.editForm.bio?.trim() || '';
                    this.user.initials = this.getInitials(this.editForm.username.trim());

                    // Update localStorage
                    localStorage.setItem('username', this.user.username);
                    localStorage.setItem('email', this.user.email);

                    this.successMessage = 'Profile updated successfully!';
                    this.isEditing = false;
                } else {
                    this.errorMessage = response.message || 'Failed to update profile';
                }
                this.isSaving = false;
                this.cdr.detectChanges();
            },
            error: (err) => {
                console.error('Error updating profile:', err);
                this.errorMessage = err.error?.message || 'An error occurred while updating your profile';
                this.isSaving = false;
                this.cdr.detectChanges();
            }
        });
    }

    goToSettings() {
        this.router.navigate(['/settings']);
    }

    onFileSelected(event: any) {
        const file: File = event.target.files[0];
        if (file) {
            // Validation
            const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
            if (!allowedTypes.includes(file.type)) {
                this.errorMessage = 'Invalid file type. Please upload an image (JPG, PNG, GIF, WEBP)';
                return;
            }

            if (file.size > 5 * 1024 * 1024) {
                this.errorMessage = 'File too large. Max 5MB allowed.';
                return;
            }

            this.isSaving = true;
            this.cdr.detectChanges();

            this.apiService.uploadAvatar(file).subscribe({
                next: (response) => {
                    if (response.success) {
                        this.user.avatar_url = response.avatar_url;
                        this.successMessage = 'Avatar updated successfully!';

                        // Update localStorage
                        localStorage.setItem('avatar_url', response.avatar_url);

                        // Notify sidebar/navbar if they show avatar
                        this.apiService.triggerRefreshSidebar();
                    } else {
                        this.errorMessage = response.message || 'Failed to upload avatar';
                    }
                    this.isSaving = false;
                    this.cdr.detectChanges();
                },
                error: (err) => {
                    console.error('Error uploading avatar:', err);
                    this.errorMessage = err.error?.message || 'An error occurred while uploading your avatar';
                    this.isSaving = false;
                    this.cdr.detectChanges();
                }
            });
        }
    }
}
