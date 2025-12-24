import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { ContentLoaderComponent } from '../content-loader/content-loader.component';
import { MockDataService } from '../../services/mock-data.service';
import { NotificationService } from '../../services/notification.service';

@Component({
    selector: 'app-challenge-detail',
    standalone: true,
    imports: [CommonModule, RouterLink, FormsModule, ContentLoaderComponent],
    templateUrl: './challenge-detail.component.html',
    styleUrls: ['./challenge-detail.component.scss']
})
export class ChallengeDetailComponent implements OnInit {
    challenge: any = null;
    participants: any[] = [];
    userProgress = 0;
    isLoading = true;
    newProgress: number | null = null;
    currentUserId: any;
    isUpdatingProgress = false;

    constructor(
        private route: ActivatedRoute,
        private apiService: ApiService,
        private router: Router,
        private mockData: MockDataService,
        private notificationService: NotificationService
    ) { }

    ngOnInit() {
        this.currentUserId = localStorage.getItem('user_id');
        if (!this.currentUserId) {
            this.router.navigate(['/login']);
            return;
        }

        this.route.paramMap.subscribe(params => {
            const id = params.get('id');
            if (id) {
                this.loadChallengeDetails(id);
            }
        });
    }

    loadChallengeDetails(id: string) {
        this.isLoading = true;
        const userType = localStorage.getItem('user_type');

        // Use mock data for demo users
        if (userType === 'demo') {
            const mockChallenges = this.mockData.generateMockChallengesDetailed(10);
            const selectedChallenge = mockChallenges.find(c => c.id.toString() === id) || mockChallenges[0];

            const randomProgress = Math.floor(Math.random() * selectedChallenge.goal_amount);
            const progressPercent = Math.round((randomProgress / selectedChallenge.goal_amount) * 100);

            const startDate = new Date(selectedChallenge.start_date);
            const endDate = new Date(selectedChallenge.end_date);
            const today = new Date();
            const daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));

            this.challenge = {
                ...selectedChallenge,
                user_progress: randomProgress,
                progress_percent: progressPercent,
                days_remaining: daysRemaining,
                status: daysRemaining > 0 ? 'Active' : 'Ended'
            };

            this.userProgress = randomProgress;
            this.participants = Array.from({ length: selectedChallenge.participants }, (_, i) => ({
                id: i + 1,
                username: `User ${i + 1}`,
                current_progress: Math.floor(Math.random() * selectedChallenge.goal_amount)
            }));

            this.isLoading = false;
            return;
        }

        // Fetch challenge details from backend
        console.log(`Loading challenge ${id}`);
        this.apiService.getChallenge(parseInt(id)).subscribe({
            next: (response) => {
                console.log('Challenge details response:', response);
                if (response.success && response.data) {
                    this.challenge = response.data;

                    // Calculate days remaining
                    const endDate = new Date(this.challenge.end_date);
                    const today = new Date();
                    const daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));

                    this.challenge.days_remaining = daysRemaining;
                    this.challenge.goal_amount = this.challenge.goal_count || this.challenge.goal_amount;
                    
                    // Get user's progress
                    this.userProgress = this.challenge.my_progress || 0;
                    
                    // Calculate progress percent
                    const goalAmount = this.challenge.goal_amount || this.challenge.goal_count || 1;
                    this.challenge.progress_percent = Math.round((this.userProgress / goalAmount) * 100);

                    // Get participants from the response
                    this.participants = this.challenge.participants_list || [];
                    
                    console.log('Challenge loaded:', this.challenge);
                    console.log('Participants:', this.participants);
                }
                this.isLoading = false;
            },
            error: (error) => {
                console.error('Error loading challenge details:', error);
                this.isLoading = false;
                this.notificationService.showError('Failed to load challenge details.');
            }
        });
    }

    updateProgress() {
        if (this.newProgress === null || this.newProgress < 0) {
            this.notificationService.showError('Please enter a valid word count.');
            return;
        }

        if (!this.challenge) return;

        this.isUpdatingProgress = true;
        const challengeId = this.challenge.id;
        
        console.log(`Updating progress: ${this.newProgress} words for challenge ${challengeId}`);

        this.apiService.updateChallengeProgress(challengeId, this.newProgress).subscribe({
            next: (response) => {
                console.log('Update progress response:', response);
                if (response.success) {
                    this.userProgress = this.newProgress!;
                    this.challenge.my_progress = this.newProgress;
                    
                    // Recalculate progress percent
                    const goalAmount = this.challenge.goal_amount || this.challenge.goal_count || 1;
                    this.challenge.progress_percent = Math.round((this.userProgress / goalAmount) * 100);
                    
                    this.notificationService.showSuccess('Progress updated successfully!');
                    this.newProgress = null;
                    
                    // Reload to get updated leaderboard
                    this.loadChallengeDetails(challengeId.toString());
                } else {
                    this.notificationService.showError('Failed to update progress: ' + response.message);
                }
                this.isUpdatingProgress = false;
            },
            error: (error) => {
                console.error('Error updating progress:', error);
                this.notificationService.showError(error.error?.message || 'Error updating progress.');
                this.isUpdatingProgress = false;
            }
        });
    }

    leaveChallenge() {
        if (!this.challenge) return;
        
        if (!confirm('Are you sure you want to leave this challenge? Your progress will be lost.')) {
            return;
        }

        this.apiService.leaveChallenge(this.challenge.id).subscribe({
            next: (response) => {
                if (response.success) {
                    this.notificationService.showSuccess('You have left the challenge.');
                    this.router.navigate(['/challenges']);
                } else {
                    this.notificationService.showError('Failed to leave challenge: ' + response.message);
                }
            },
            error: (error) => {
                console.error('Error leaving challenge:', error);
                this.notificationService.showError(error.error?.message || 'Error leaving challenge.');
            }
        });
    }

    getPercent(current: number, total: number): number {
        if (!total || total === 0) return 0;
        const pct = Math.round((current / total) * 100);
        return pct > 100 ? 100 : pct;
    }

    copyCode() {
        if (this.challenge && this.challenge.invite_code) {
            navigator.clipboard.writeText(this.challenge.invite_code).then(() => {
                this.notificationService.showSuccess('Invite code copied to clipboard!');
            });
        }
    }

    getRank(participant: any): number {
        const sorted = [...this.participants].sort((a, b) => (b.current_progress || 0) - (a.current_progress || 0));
        return sorted.findIndex(p => p.user_id === participant.user_id) + 1;
    }

    isCurrentUser(participant: any): boolean {
        return participant.user_id?.toString() === this.currentUserId;
    }
}
