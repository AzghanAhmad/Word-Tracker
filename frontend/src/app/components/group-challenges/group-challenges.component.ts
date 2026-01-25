import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { NotificationService } from '../../services/notification.service';
import { ContentLoaderComponent } from '../content-loader/content-loader.component';
import { forkJoin } from 'rxjs';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-group-challenges',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ContentLoaderComponent],
  templateUrl: './group-challenges.component.html',
  styleUrls: ['./group-challenges.component.scss']
})
export class GroupChallengesComponent implements OnInit, OnDestroy {
  showModal = false;
  showGuideModal = false;
  isSubmitting = false;
  loading = true;
  activeChallenges: any[] = [];
  private routerSubscription: any;

  // Pagination
  currentPage = 1;
  itemsPerPage = 20;
  totalItems = 0;
  totalPages = 1;

  newChallenge = {
    name: '',
    description: '',
    goal_type: 'word_count',
    goal_amount: 50000,
    start_date: '',
    end_date: '',
    is_public: true
  };

  formErrors: any = {};

  inviteCodeInput: string = '';
  todayStr: string = new Date().toISOString().split('T')[0];

  constructor(
    private apiService: ApiService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private notificationService: NotificationService
  ) { }

  scrollToFeatures() {
    const element = document.getElementById('challenge-features');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  ngOnInit() {
    // Load data immediately
    this.loadActiveChallenges();

    // Reload on navigation back to this page
    this.routerSubscription = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      if (event.urlAfterRedirects === '/challenges' || event.urlAfterRedirects.startsWith('/challenges')) {
        console.log('Reloading challenges data on navigation');
        // Use setTimeout to ensure component is ready
        setTimeout(() => {
          this.loadActiveChallenges();
        }, 100);
      }
    });
  }

  ngOnDestroy() {
    // Clean up subscription
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
  }

  loadActiveChallenges() {
    this.loading = true;
    this.cdr.detectChanges();

    forkJoin({
      joined: this.apiService.getChallenges(),
      public: this.apiService.getPublicChallenges()
    }).subscribe({
      next: (results) => {
        const joined = (results.joined.success && results.joined.data) ? results.joined.data : [];
        const publicChallenges = (results.public.success && results.public.data) ? results.public.data : [];

        // Merge challenges unique by ID
        const challengeMap = new Map();

        // Add public challenges first
        publicChallenges.forEach((c: any) => {
          // Parse dates before adding to map
          c.end_date = this.parseDate(c.end_date);
          c.start_date = this.parseDate(c.start_date);
          challengeMap.set(c.id, c);
        });

        // Add/Overwrite with joined challenges (ensure is_joined=1 is respected)
        joined.forEach((c: any) => {
          // Parse dates before adding to map
          c.end_date = this.parseDate(c.end_date);
          c.start_date = this.parseDate(c.start_date);
          challengeMap.set(c.id, c);
        });

        this.activeChallenges = Array.from(challengeMap.values());

        // Sort by id DESC (newest first)
        this.activeChallenges.sort((a, b) => b.id - a.id);

        this.totalItems = this.activeChallenges.length;
        this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);

        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading challenges:', error);
        this.activeChallenges = [];
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.loadActiveChallenges();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadActiveChallenges();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  onPageSizeChange(event: any) {
    this.itemsPerPage = parseInt(event.target.value, 10);
    this.currentPage = 1;
    this.loadActiveChallenges();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  openModal() {
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
  }

  openGuideModal() {
    this.showGuideModal = true;
  }

  closeGuideModal() {
    this.showGuideModal = false;
  }

  joinByCode() {
    const code = this.inviteCodeInput.trim().toUpperCase();

    if (!code) {
      this.notificationService.showError('Please enter an invite code');
      return;
    }

    if (code.length !== 6) {
      this.notificationService.showError('Invite code must be 6 characters');
      return;
    }

    this.isSubmitting = true;
    this.cdr.detectChanges();

    console.log('Joining challenge with invite code:', code);

    this.apiService.joinChallengeByInviteCode(code).subscribe({
      next: (response) => {
        console.log('Join by code response:', response);
        if (response.success) {
          this.notificationService.showSuccess(response.message || 'Successfully joined the challenge!');
          this.inviteCodeInput = '';

          // Reload challenges to show the newly joined challenge
          this.loadActiveChallenges();

          // Navigate to challenge detail page if challenge_id is provided
          if (response.challenge_id) {
            setTimeout(() => {
              this.router.navigate(['/challenge', response.challenge_id]);
            }, 1000);
          }
        } else {
          this.notificationService.showError(response.message || 'Failed to join challenge');
        }
        this.isSubmitting = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error joining challenge by invite code:', error);
        const errorMsg = error.error?.message || 'Invalid or expired invite code';
        this.notificationService.showError(errorMsg);
        this.isSubmitting = false;
        this.cdr.detectChanges();
      }
    });
  }

  joinChallenge(challengeId: number) {
    this.apiService.joinChallenge(challengeId).subscribe({
      next: (response) => {
        if (response.success) {
          this.notificationService.showSuccess(response.message || 'Successfully joined the challenge!');
          const challenge = this.activeChallenges.find(c => c.id === challengeId);
          if (challenge) {
            challenge.is_member = true;
            challenge.is_joined = 1;
            challenge.member_count = (challenge.member_count || challenge.participants || 0) + 1;
          }
          // Reload challenges to get updated data
          this.loadActiveChallenges();
        } else {
          this.notificationService.showError(response.message || 'Failed to join challenge');
        }
      },
      error: (error) => {
        console.error('Error joining challenge:', error);
        const errorMsg = error.error?.message || 'Failed to join challenge';
        this.notificationService.showError(errorMsg);
      }
    });
  }

  leaveChallenge(challengeId: number) {
    this.apiService.leaveChallenge(challengeId).subscribe({
      next: (response) => {
        if (response.success) {
          const challenge = this.activeChallenges.find(c => c.id === challengeId);
          if (challenge) {
            challenge.is_member = false;
            challenge.member_count = Math.max(0, (challenge.member_count || 0) - 1);
          }
        }
      },
      error: (error) => {
        console.error('Error leaving challenge:', error);
      }
    });
  }

  createChallenge() {
    this.formErrors = {};
    const errors: any = {};

    // Client-side validation
    if (!this.newChallenge.name || this.newChallenge.name.trim().length < 3) {
      errors.name = 'Challenge name must be at least 3 characters';
    }
    if (!this.newChallenge.description || this.newChallenge.description.trim().length < 10) {
      errors.description = 'Description must be at least 10 characters';
    }
    if (!this.newChallenge.start_date) {
      errors.start_date = 'Start date is required';
    } else {
      const start = new Date(this.newChallenge.start_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (start < today) {
        errors.start_date = 'Start date must be today or future';
      }
    }
    if (!this.newChallenge.end_date) {
      errors.end_date = 'End date is required';
    } else if (this.newChallenge.start_date) {
      const start = new Date(this.newChallenge.start_date);
      const end = new Date(this.newChallenge.end_date);
      if (end <= start) {
        errors.end_date = 'End date must be after start date';
      }
    }
    if (!this.newChallenge.goal_amount || this.newChallenge.goal_amount <= 0) {
      errors.goal_amount = 'Goal amount must be positive';
    }

    if (Object.keys(errors).length > 0) {
      this.formErrors = errors;
      this.notificationService.showError('Please fix the validation errors');
      return;
    }

    this.isSubmitting = true;
    this.cdr.detectChanges();

    const payload = {
      title: this.newChallenge.name,
      description: this.newChallenge.description,
      goal_type: this.newChallenge.goal_type,
      goal_amount: this.newChallenge.goal_amount,
      start_date: this.newChallenge.start_date,
      end_date: this.newChallenge.end_date,
      is_public: this.newChallenge.is_public
    };

    console.log('Creating challenge:', payload);

    this.apiService.createChallenge(payload).subscribe({
      next: (response) => {
        console.log('Challenge created:', response);
        if (response.success) {
          this.notificationService.showSuccess(response.message || 'Challenge created successfully!');
          this.closeModal();
          this.resetForm();
          this.loadActiveChallenges();

          if (response.id) {
            setTimeout(() => {
              this.router.navigate(['/challenge', response.id]);
            }, 1000);
          }
        } else {
          this.notificationService.showError(response.message || 'Failed to create challenge');
        }
        this.isSubmitting = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error creating challenge:', error);
        if (error.error?.errors) {
          this.formErrors = error.error.errors;
        }
        this.notificationService.showError(error.error?.message || 'Failed to create challenge');
        this.isSubmitting = false;
        this.cdr.detectChanges();
      }
    });
  }

  resetForm() {
    this.newChallenge = {
      name: '',
      description: '',
      goal_type: 'word_count',
      goal_amount: 50000,
      start_date: '',
      end_date: '',
      is_public: true
    };
  }

  /**
   * Parse date from various formats (string, object, MySqlDateTime)
   */
  private parseDate(dateValue: any): Date | null {
    if (!dateValue) return null;

    // Handle JSON string containing MySqlDateTime object
    if (typeof dateValue === 'string' && dateValue.startsWith('{')) {
      try {
        const parsed = JSON.parse(dateValue);
        if (parsed.Year && parsed.Month && parsed.Day) {
          return new Date(parsed.Year, parsed.Month - 1, parsed.Day);
        }
      } catch (e) {
        // If JSON parse fails, continue to other formats
      }
    }

    // Handle string dates (YYYY-MM-DD format from backend)
    if (typeof dateValue === 'string') {
      const dateStr = dateValue.split('T')[0]; // Remove time if present
      if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return new Date(dateStr + 'T00:00:00'); // Add time to avoid timezone issues
      }
      // Try standard Date parsing
      const parsed = new Date(dateValue);
      return isNaN(parsed.getTime()) ? null : parsed;
    }

    // Handle MySqlDateTime-like objects (already parsed)
    if (dateValue && typeof dateValue === 'object') {
      if (dateValue.Year && dateValue.Month && dateValue.Day) {
        return new Date(dateValue.Year, dateValue.Month - 1, dateValue.Day);
      }
    }

    // Try standard Date parsing as fallback
    const parsed = new Date(dateValue);
    return isNaN(parsed.getTime()) ? null : parsed;
  }
}
