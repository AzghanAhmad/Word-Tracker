import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, NavigationEnd } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { ContentLoaderComponent } from '../content-loader/content-loader.component';
import { filter } from 'rxjs/operators';

@Component({
    selector: 'app-settings',
    standalone: true,
    imports: [CommonModule, FormsModule, ContentLoaderComponent],
    templateUrl: './settings.component.html',
    styleUrls: ['./settings.component.scss']
})
export class SettingsComponent implements OnInit {
    isLoading = false;
    isSaving = false;
    username: string = '';
    email: string = '';
    avatar_url: string = '';

    // Profession options
    professionOptions = [
        { id: 'author', label: 'Author/Writer', selected: false },
        { id: 'editor', label: 'Editor', selected: false },
        { id: 'translator', label: 'Translator', selected: false },
        { id: 'professor', label: 'Professor/Teacher', selected: false }
    ];

    // Date & Time settings
    dateFormat: string = 'MM/DD/YYYY';
    weekStartDay: string = 'Monday';
    weekStartOptions = ['Monday', 'Sunday'];

    // Plans tracking
    activePlansCount: number = 0;
    templatesCount: number = 0;

    // Email reminders
    emailRemindersEnabled: boolean = false;
    reminderTimezone: string = 'GMT +00:00';
    reminderFrequency: string = 'Daily @ 8AM';

    timezoneOptions = [
        'GMT +00:00',
        'GMT +01:00',
        'GMT +05:30',
        'GMT -05:00',
        'GMT -08:00'
    ];

    frequencyOptions = [
        'Daily @ 8AM',
        'Daily @ 12PM',
        'Daily @ 6PM',
        'Weekly – Monday @ 9AM',
        'Weekly – Sunday @ 9AM'
    ];

    // Password reset modal
    showPasswordModal: boolean = false;
    currentPassword: string = '';
    newPassword: string = '';
    confirmPassword: string = '';
    passwordError: string = '';
    isSubmittingPassword: boolean = false;

    successMessage: string = '';
    errorMessage: string = '';

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

        this.loadUserDetails();
        this.loadSettings();
        this.loadUserStats();

        // Reload on navigation back to this page
        this.router.events.pipe(
            filter(event => event instanceof NavigationEnd)
        ).subscribe((event: any) => {
            if (event.url === '/settings') {
                this.loadSettings();
                this.loadUserStats();
            }
        });
    }

    loadUserDetails() {
        this.apiService.getUserProfile().subscribe({
            next: (response) => {
                if (response.success && response.data) {
                    this.username = response.data.username || localStorage.getItem('username') || 'Guest';
                    this.email = response.data.email || localStorage.getItem('email') || 'user@example.com';
                    this.avatar_url = response.data.avatar_url || localStorage.getItem('avatar_url') || '';
                } else {
                    this.username = localStorage.getItem('username') || 'Guest';
                    this.email = localStorage.getItem('email') || 'user@example.com';
                }
                this.cdr.detectChanges();
            },
            error: (err) => {
                console.error('Error loading user details:', err);
                this.username = localStorage.getItem('username') || 'Guest';
                this.email = localStorage.getItem('email') || 'user@example.com';
                this.cdr.detectChanges();
            }
        });
    }

    loadSettings() {
        this.isLoading = true;
        this.cdr.detectChanges();

        this.apiService.getUserSettings().subscribe({
            next: (response) => {
                if (response.success && response.data) {
                    const data = response.data;

                    // Date & Time
                    this.dateFormat = data.date_format || 'MM/DD/YYYY';
                    this.weekStartDay = data.week_start_day || 'Monday';

                    // Email reminders
                    this.emailRemindersEnabled = data.email_reminders_enabled || false;
                    this.reminderTimezone = data.reminder_timezone || 'GMT +00:00';
                    this.reminderFrequency = data.reminder_frequency || 'Daily @ 8AM';

                    // Professions
                    let professions: string[] = [];
                    if (data.professions) {
                        try {
                            professions = typeof data.professions === 'string'
                                ? JSON.parse(data.professions)
                                : data.professions;
                        } catch (e) {
                            professions = [];
                        }
                    }

                    this.professionOptions.forEach(option => {
                        option.selected = professions.includes(option.id);
                    });
                }
                this.isLoading = false;
                this.cdr.detectChanges();
            },
            error: (err) => {
                console.error('Error loading settings:', err);
                this.isLoading = false;
                this.cdr.detectChanges();
            }
        });
    }

    loadUserStats() {
        this.apiService.getDashboardStats().subscribe({
            next: (response) => {
                if (response.success && response.data) {
                    this.activePlansCount = response.data.activePlans || 0;
                }
                this.cdr.detectChanges();
            },
            error: (err) => {
                console.error('Error loading stats:', err);
                this.cdr.detectChanges();
            }
        });
    }

    saveProfessions() {
        const selectedProfessions = this.professionOptions
            .filter(option => option.selected)
            .map(option => option.id);

        this.isSaving = true;
        this.cdr.detectChanges();

        this.apiService.updateUserSettings({
            professions: selectedProfessions
        }).subscribe({
            next: (response) => {
                if (response.success) {
                    this.successMessage = 'Professions saved successfully!';
                    setTimeout(() => this.successMessage = '', 3000);
                } else {
                    this.errorMessage = response.message || 'Failed to save professions';
                    setTimeout(() => this.errorMessage = '', 3000);
                }
                this.isSaving = false;
                this.cdr.detectChanges();
            },
            error: (err) => {
                console.error('Error saving professions:', err);
                this.errorMessage = err.error?.message || 'Failed to save professions';
                setTimeout(() => this.errorMessage = '', 3000);
                this.isSaving = false;
                this.cdr.detectChanges();
            }
        });
    }

    saveDateTimeSettings() {
        this.isSaving = true;
        this.cdr.detectChanges();

        this.apiService.updateUserSettings({
            date_format: this.dateFormat,
            week_start_day: this.weekStartDay
        }).subscribe({
            next: (response) => {
                if (response.success) {
                    this.successMessage = 'Date & Time settings saved successfully!';
                    setTimeout(() => this.successMessage = '', 3000);
                } else {
                    this.errorMessage = response.message || 'Failed to save settings';
                    setTimeout(() => this.errorMessage = '', 3000);
                }
                this.isSaving = false;
                this.cdr.detectChanges();
            },
            error: (err) => {
                console.error('Error saving date/time settings:', err);
                this.errorMessage = err.error?.message || 'Failed to save settings';
                setTimeout(() => this.errorMessage = '', 3000);
                this.isSaving = false;
                this.cdr.detectChanges();
            }
        });
    }

    saveEmailSettings() {
        this.isSaving = true;
        this.cdr.detectChanges();

        this.apiService.updateUserSettings({
            email_reminders_enabled: this.emailRemindersEnabled,
            reminder_timezone: this.reminderTimezone,
            reminder_frequency: this.reminderFrequency
        }).subscribe({
            next: (response) => {
                if (response.success) {
                    this.successMessage = 'Email settings saved successfully!';
                    setTimeout(() => this.successMessage = '', 3000);
                } else {
                    this.errorMessage = response.message || 'Failed to save email settings';
                    setTimeout(() => this.errorMessage = '', 3000);
                }
                this.isSaving = false;
                this.cdr.detectChanges();
            },
            error: (err) => {
                console.error('Error saving email settings:', err);
                this.errorMessage = err.error?.message || 'Failed to save email settings';
                setTimeout(() => this.errorMessage = '', 3000);
                this.isSaving = false;
                this.cdr.detectChanges();
            }
        });
    }

    resetPassword() {
        this.showPasswordModal = true;
        this.currentPassword = '';
        this.newPassword = '';
        this.confirmPassword = '';
        this.passwordError = '';
    }

    closePasswordModal() {
        this.showPasswordModal = false;
        this.currentPassword = '';
        this.newPassword = '';
        this.confirmPassword = '';
        this.passwordError = '';
    }

    submitPasswordChange() {
        this.passwordError = '';

        // Validation
        if (!this.currentPassword || !this.newPassword || !this.confirmPassword) {
            this.passwordError = 'All fields are required';
            return;
        }

        if (this.newPassword.length < 6) {
            this.passwordError = 'New password must be at least 6 characters long';
            return;
        }

        if (this.newPassword !== this.confirmPassword) {
            this.passwordError = 'New passwords do not match';
            return;
        }

        if (this.currentPassword === this.newPassword) {
            this.passwordError = 'New password must be different from current password';
            return;
        }

        this.isSubmittingPassword = true;
        this.cdr.detectChanges();

        this.apiService.changePassword(this.currentPassword, this.newPassword, this.confirmPassword).subscribe({
            next: (response) => {
                if (response.success) {
                    this.closePasswordModal();
                    this.successMessage = 'Password changed successfully!';
                    setTimeout(() => this.successMessage = '', 3000);
                } else {
                    this.passwordError = response.message || 'Failed to change password';
                }
                this.isSubmittingPassword = false;
                this.cdr.detectChanges();
            },
            error: (err) => {
                console.error('Error changing password:', err);
                this.passwordError = err.error?.message || 'Failed to change password. Please check your current password.';
                this.isSubmittingPassword = false;
                this.cdr.detectChanges();
            }
        });
    }



    viewDashboard() {
        this.router.navigate(['/plans']);
    }

    createPlanTemplate() {
        alert('Create Plan Template functionality coming soon!');
    }

    createChecklistTemplate() {
        alert('Create Checklist Template functionality coming soon!');
    }

    deleteAccount() {
        if (confirm('Are you absolutely sure you want to permanently delete your account? This action cannot be undone!')) {
            this.isSaving = true;
            this.cdr.detectChanges();

            this.apiService.deleteUserAccount().subscribe({
                next: (response) => {
                    if (response.success) {
                        // Clear localStorage and redirect to login
                        localStorage.clear();
                        this.router.navigate(['/login']);
                    } else {
                        this.errorMessage = response.message || 'Failed to delete account';
                        setTimeout(() => this.errorMessage = '', 3000);
                        this.isSaving = false;
                        this.cdr.detectChanges();
                    }
                },
                error: (err) => {
                    console.error('Error deleting account:', err);
                    this.errorMessage = err.error?.message || 'Failed to delete account';
                    setTimeout(() => this.errorMessage = '', 3000);
                    this.isSaving = false;
                    this.cdr.detectChanges();
                }
            });
        }
    }

    onFileSelected(event: any) {
        const file: File = event.target.files[0];
        if (file) {
            // Validation
            const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
            if (!allowedTypes.includes(file.type)) {
                this.errorMessage = 'Invalid file type. Please upload an image (JPG, PNG, GIF, WEBP)';
                setTimeout(() => this.errorMessage = '', 3000);
                return;
            }

            if (file.size > 5 * 1024 * 1024) {
                this.errorMessage = 'File too large. Max 5MB allowed.';
                setTimeout(() => this.errorMessage = '', 3000);
                return;
            }

            this.isSaving = true;
            this.cdr.detectChanges();

            this.apiService.uploadAvatar(file).subscribe({
                next: (response) => {
                    if (response.success) {
                        this.avatar_url = response.avatar_url;
                        this.successMessage = 'Avatar updated successfully!';
                        setTimeout(() => this.successMessage = '', 3000);

                        // Update localStorage
                        localStorage.setItem('avatar_url', response.avatar_url);

                        // Notify sidebar/navbar if they show avatar
                        this.apiService.triggerRefreshSidebar();
                    } else {
                        this.errorMessage = response.message || 'Failed to upload avatar';
                        setTimeout(() => this.errorMessage = '', 3000);
                    }
                    this.isSaving = false;
                    this.cdr.detectChanges();
                },
                error: (err) => {
                    console.error('Error uploading avatar:', err);
                    this.errorMessage = err.error?.message || 'An error occurred while uploading your avatar';
                    setTimeout(() => this.errorMessage = '', 3000);
                    this.isSaving = false;
                    this.cdr.detectChanges();
                }
            });
        }
    }
}
