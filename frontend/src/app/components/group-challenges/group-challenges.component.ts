import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { MockDataService } from '../../services/mock-data.service';

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
    private mockData: MockDataService
  ) { }

  ngOnInit() {
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

    // Fetch challenges from C backend
    this.apiService.getChallenges().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.activeChallenges = response.data;
          this.totalItems = response.data.length;
          this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
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
      alert('Please login.');
      return;
    }

    // Note: C backend doesn't have invite code endpoint yet
    // This would need to be implemented in the backend
    alert('Invite code feature not yet implemented in C backend');
  }

  joinChallenge(challengeId: number) {
    const userId = localStorage.getItem('user_id');
    const userType = localStorage.getItem('user_type');

    if (!userId) {
      alert('Please login to join challenges.');
      return;
    }

    // For demo users, redirect directly to challenge detail page
    if (userType === 'demo') {
      this.router.navigate(['/challenge', challengeId]);
      return;
    }

    // Join challenge via C backend API
    this.apiService.joinChallenge(challengeId).subscribe({
      next: (response) => {
        if (response.success) {
          alert('Successfully joined the challenge!');
          // Redirect to challenge detail page
          this.router.navigate(['/challenge', challengeId]);
        } else {
          alert('Failed: ' + response.message);
        }
      },
      error: (error) => {
        console.error('Join error:', error);
        alert(error.error?.message || 'Error joining challenge.');
      }
    });
  }


  // ... (modals)

  createChallenge() {
    if (!this.newChallenge.name || !this.newChallenge.goal_amount || !this.newChallenge.start_date || !this.newChallenge.end_date) {
      alert('Please fill in all required fields.');
      return;
    }

    this.isSubmitting = true;
    const challengeData = {
      title: this.newChallenge.name,
      description: this.newChallenge.description,
      target_words: this.newChallenge.goal_amount,
      start_date: this.newChallenge.start_date,
      end_date: this.newChallenge.end_date
    };

    this.apiService.createChallenge(challengeData).subscribe({
      next: (response) => {
        if (response.success) {
          alert('Challenge created successfully!');
          this.closeModal();
          this.loadActiveChallenges(); // Refresh list
        } else {
          alert('Failed to create challenge: ' + response.message);
        }
        this.isSubmitting = false;
      },
      error: (error) => {
        console.error('Create challenge error:', error);
        alert(error.error?.message || 'Error occurred while creating challenge.');
        this.isSubmitting = false;
      }
    });
  }
}
