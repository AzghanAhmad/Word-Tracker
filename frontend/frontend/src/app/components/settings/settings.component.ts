import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';

@Component({
    selector: 'app-settings',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './settings.component.html',
    styleUrls: ['./settings.component.scss']
})
export class SettingsComponent implements OnInit {
    username: string = '';
    email: string = '';

    // Profession options
    professionOptions = [
        { id: 'author', label: 'Author/Writer', selected: false },
        { id: 'editor', label: 'Editor', selected: false },
        { id: 'translator', label: 'Translator', selected: false },
        { id: 'professor', label: 'Professor/Teacher', selected: false }
    ];

    // Date & Time settings
    dateFormat: string = '12/06/2025';
    weekStartDay: string = 'Monday';
    weekStartOptions = ['Monday', 'Sunday'];



    // Plans tracking
    activePlansCount: number = 0;
    templatesCount: number = 0;

    // Email reminders
    emailRemindersEnabled: boolean = false;
    reminderTimezone: string = 'GMT +00:00 – Africa/Abidjan';
    reminderFrequency: string = 'Daily @ 8AM';

    timezoneOptions = [
        'GMT +00:00 – Africa/Abidjan',
        'GMT +01:00 – Europe/London',
        'GMT +05:30 – Asia/Kolkata',
        'GMT -05:00 – America/New_York',
        'GMT -08:00 – America/Los_Angeles'
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

    constructor(private apiService: ApiService, private router: Router) { }

    ngOnInit() {
        this.username = localStorage.getItem('username') || 'Guest';
        this.email = localStorage.getItem('email') || 'user@example.com';
        this.loadSettings();
        this.loadUserStats();
        this.loadUserDetails();
    }

    loadUserDetails() {
        // User details from localStorage (C backend doesn't have user profile endpoint yet)
        this.username = localStorage.getItem('username') || 'Guest';
        this.email = localStorage.getItem('email') || 'user@example.com';
    }

    loadSettings() {
        const savedProfessions = localStorage.getItem('professions');
        if (savedProfessions) {
            const professions = JSON.parse(savedProfessions);
            this.professionOptions.forEach(option => {
                option.selected = professions.includes(option.id);
            });
        }

        const savedDateFormat = localStorage.getItem('dateFormat');
        if (savedDateFormat) this.dateFormat = savedDateFormat;

        const savedWeekStart = localStorage.getItem('weekStartDay');
        if (savedWeekStart) this.weekStartDay = savedWeekStart;
    }

    loadUserStats() {
        // Plans feature has been removed
        this.activePlansCount = 0;
    }

    saveProfessions() {
        const selectedProfessions = this.professionOptions
            .filter(option => option.selected)
            .map(option => option.id);

        localStorage.setItem('professions', JSON.stringify(selectedProfessions));
        alert('Professions saved successfully!');
    }

    saveDateTimeSettings() {
        localStorage.setItem('dateFormat', this.dateFormat);
        localStorage.setItem('weekStartDay', this.weekStartDay);
        alert('Date & Time settings saved successfully!');
    }

    saveEmailSettings() {
        localStorage.setItem('emailRemindersEnabled', this.emailRemindersEnabled.toString());
        localStorage.setItem('reminderTimezone', this.reminderTimezone);
        localStorage.setItem('reminderFrequency', this.reminderFrequency);
        alert('Email settings saved successfully!');
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

        // Password change not implemented in C backend yet
        this.isSubmittingPassword = true;

        // Simulate delay
        setTimeout(() => {
            this.isSubmittingPassword = false;
            this.passwordError = 'Password change feature coming soon!';
        }, 500);
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
            alert('Account deletion would be processed here.');
        }
    }
}
