import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { MockDataService } from '../../services/mock-data.service';
import { NotificationService } from '../../services/notification.service';

import { ContentLoaderComponent } from '../content-loader/content-loader.component';

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
  viewMode: 'my' | 'public' = 'public'; // Show public challenges by default

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
    private mockData: MockDataService,
    private notificationService: NotificationService
  ) { }

  ngOnInit() {
    this.loadActiveChallenges();
  }

  setViewMode(mode: 'my' | 'public') {
    this.viewMode = mode;
    this.currentPage = 1;
    this.loadActiveChallenges();
  }

  loadActiveChallenges() {
    this.loading = true;
    const userType = localStorage.getItem('user_type');

    // Use mock data for demo users
    if (userType === 'demo') {
      const allChallenges = this.mockData.generateMockChallengesDetailed(15);
      this.activeChallenges = allChallenges.slice(0, this.itemsPerPage);
      this.totalItems = allChallenges.length;
      this.totalPages = Math.ceil(allChallenges.length / this.itemsPerPage);
      this.loading = false;
      return;
    }

    // Fetch challenges from backend
    const request = this.viewMode === 'my' 
      ? this.apiService.getChallenges() 
      : this.apiService.getPublicChallenges();

    request.subscribe({
      next: (response) => {
        console.log('Challenges response:', response);
        if (response.success && response.data) {
          const allChallenges = Array.isArray(response.data) ? response.data : [];
          this.totalItems = allChallenges.length;
          this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
          
          // Apply pagination
          const startIndex = (this.currentPage - 1) * this.itemsPerPage;
          this.activeChallenges = allChallenges.slice(startIndex, startIndex + this.itemsPerPage);
        } else {
          this.activeChallenges = [];
          this.totalItems = 0;
          this.totalPages = 1;
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading challenges:', error);
        this.activeChallenges = [];
        this.loading = false;
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
    this.itemsPerPage = Number(event.target.value);
    this.currentPage = 1;
    this.loadActiveChallenges();
  }

  openModal() {
    this.showModal = true;
    const today = new Date();
    this.newChallenge.start_date = today.toISOString().split('T')[0];
  }

  closeModal() {
    this.showModal = false;
  }

  joinByCode() {
    if (!this.inviteCodeInput) return;
    const userId = localStorage.getItem('user_id');
    if (!userId) {
      this.notificationService.showError('Please login first.');
      return;
    }

    // TODO: Implement invite code lookup in backend
    this.notificationService.showInfo('Invite code feature coming soon!');
  }

  joinChallenge(challengeId: number) {
    const userId = localStorage.getItem('user_id');
    const userType = localStorage.getItem('user_type');

    if (!userId) {
      this.notificationService.showError('Please login to join challenges.');
      return;
    }

    // For demo users, redirect directly to challenge detail page
    if (userType === 'demo') {
      this.router.navigate(['/challenge', challengeId]);
      return;
    }

    console.log(`Joining challenge ${challengeId}`);
    
    this.apiService.joinChallenge(challengeId).subscribe({
      next: (response) => {
        console.log('Join response:', response);
        if (response.success) {
          this.notificationService.showSuccess('Successfully joined the challenge!');
          this.loadActiveChallenges(); // Refresh to update is_joined status
          this.router.navigate(['/challenge', challengeId]);
        } else {
          this.notificationService.showError('Failed: ' + response.message);
        }
      },
      error: (error) => {
        console.error('Join error:', error);
        this.notificationService.showError(error.error?.message || 'Error joining challenge.');
      }
    });
  }

  leaveChallenge(challengeId: number) {
    const userId = localStorage.getItem('user_id');
    if (!userId) {
      this.notificationService.showError('Please login first.');
      return;
    }

    if (!confirm('Are you sure you want to leave this challenge?')) return;

    this.apiService.leaveChallenge(challengeId).subscribe({
      next: (response) => {
        if (response.success) {
          this.notificationService.showSuccess('You have left the challenge.');
          this.loadActiveChallenges();
        } else {
          this.notificationService.showError('Failed: ' + response.message);
        }
      },
      error: (error) => {
        console.error('Leave error:', error);
        this.notificationService.showError(error.error?.message || 'Error leaving challenge.');
      }
    });
  }

  createChallenge() {
    if (!this.newChallenge.name || !this.newChallenge.goal_amount || !this.newChallenge.start_date || !this.newChallenge.end_date) {
      this.notificationService.showError('Please fill in all required fields.');
      return;
    }

    this.isSubmitting = true;
    const challengeData = {
      title: this.newChallenge.name,
      description: this.newChallenge.description,
      type: this.newChallenge.goal_type,
      target_words: this.newChallenge.goal_amount,
      start_date: this.newChallenge.start_date,
      end_date: this.newChallenge.end_date,
      is_public: this.newChallenge.is_public
    };

    console.log('Creating challenge:', challengeData);

    this.apiService.createChallenge(challengeData).subscribe({
      next: (response) => {
        console.log('Create response:', response);
        if (response.success) {
          this.notificationService.showSuccess('Challenge created successfully!');
          this.closeModal();
          this.resetNewChallenge();
          this.loadActiveChallenges();
        } else {
          this.notificationService.showError('Failed to create challenge: ' + response.message);
        }
        this.isSubmitting = false;
      },
      error: (error) => {
        console.error('Create challenge error:', error);
        this.notificationService.showError(error.error?.message || 'Error occurred while creating challenge.');
        this.isSubmitting = false;
      }
    });
  }

  resetNewChallenge() {
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

  getProgressPercentage(challenge: any): number {
    if (!challenge.goal_amount || challenge.goal_amount === 0) return 0;
    const progress = challenge.my_progress || 0;
    return Math.min(100, Math.round((progress / challenge.goal_amount) * 100));
  }
}
