import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { NotificationService } from '../../services/notification.service';
import { ContentLoaderComponent } from '../content-loader/content-loader.component';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-group-challenges',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ContentLoaderComponent],
  templateUrl: './group-challenges.component.html',
  styleUrls: ['./group-challenges.component.scss']
})
export class GroupChallengesComponent implements OnInit {
  showModal = false;
  isSubmitting = false;
  loading = true;
  activeChallenges: any[] = [];

  // Pagination
  currentPage = 1;
  itemsPerPage = 10;
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

  inviteCodeInput: string = '';

  constructor(
    private apiService: ApiService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private notificationService: NotificationService
  ) { }

  ngOnInit() {
    this.loadActiveChallenges();
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
        publicChallenges.forEach((c: any) => challengeMap.set(c.id, c));

        // Add/Overwrite with joined challenges (ensure is_joined=1 is respected)
        joined.forEach((c: any) => challengeMap.set(c.id, c));

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
    }
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadActiveChallenges();
    }
  }

  onPageSizeChange(event: any) {
    this.itemsPerPage = parseInt(event.target.value, 10);
    this.currentPage = 1;
    this.loadActiveChallenges();
  }

  openModal() {
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
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
    if (!this.newChallenge.name || !this.newChallenge.description || !this.newChallenge.start_date || !this.newChallenge.end_date) {
      return;
    }

    this.isSubmitting = true;

    const payload = {
      title: this.newChallenge.name,
      description: this.newChallenge.description,
      type: this.newChallenge.goal_type,
      target_words: this.newChallenge.goal_amount,
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
        }
        this.isSubmitting = false;
        this.closeModal();
        this.resetForm();
        this.loadActiveChallenges();
      },
      error: (error) => {
        console.error('Error creating challenge:', error);
        this.isSubmitting = false;
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
}
