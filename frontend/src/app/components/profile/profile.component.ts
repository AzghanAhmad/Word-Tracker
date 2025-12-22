import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { ContentLoaderComponent } from '../content-loader/content-loader.component';
import { MockDataService } from '../../services/mock-data.service';

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
    totalPlans = 0;
    totalWords = 0;
    memberSince = '';

    constructor(private apiService: ApiService, private router: Router, private mockData: MockDataService) { }

    ngOnInit() {
        this.loadUserProfile();
        this.loadUserStats();
    }

    loadUserProfile() {
        this.isLoading = true;
        const userId = localStorage.getItem('user_id');
        const userType = localStorage.getItem('user_type');

        if (!userId) {
            this.router.navigate(['/login']);
            return;
        }

        // Use mock data for demo users
        if (userType === 'demo') {
            const mockUser = this.mockData.generateMockUser();
            this.user = {
                id: userId,
                username: localStorage.getItem('username') || mockUser.username,
                email: localStorage.getItem('email') || mockUser.email,
                bio: mockUser.bio,
                created_at: mockUser.created_at,
                initials: this.getInitials(localStorage.getItem('username') || mockUser.username)
            };
            this.memberSince = this.formatMemberSince(mockUser.created_at);
            this.isLoading = false;
            return;
        }

        // Use localStorage for user data (C backend doesn't have user profile endpoint yet)
        this.user = {
            id: userId,
            username: localStorage.getItem('username') || 'User',
            email: localStorage.getItem('email') || 'user@example.com',
            bio: '',
            created_at: new Date().toISOString(),
            initials: this.getInitials(localStorage.getItem('username') || 'User')
        };
        this.memberSince = this.formatMemberSince(new Date().toISOString());
        this.isLoading = false;
    }

    loadUserStats() {
        const userId = localStorage.getItem('user_id');
        const userType = localStorage.getItem('user_type');
        if (!userId) return;

        // Use mock stats for demo users
        if (userType === 'demo') {
            const mockStats = this.mockData.generateMockStats();
            this.totalPlans = mockStats.totalPlans;
            this.totalWords = mockStats.totalWords;
            return;
        }

        // Plans feature has been removed
        this.totalPlans = 0;
        this.totalWords = 0;
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

        // Profile update not implemented in C backend yet
        this.isSaving = true;

        // Update localStorage only
        setTimeout(() => {
            localStorage.setItem('username', this.editForm.username);
            localStorage.setItem('email', this.editForm.email);

            this.user.username = this.editForm.username;
            this.user.email = this.editForm.email;
            this.user.bio = this.editForm.bio;
            this.user.initials = this.getInitials(this.editForm.username);

            this.isSaving = false;
            this.successMessage = 'Profile updated locally (server update coming soon)!';
            this.isEditing = false;
        }, 500);
    }

    goToSettings() {
        this.router.navigate(['/settings']);
    }
}
