import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { ContentLoaderComponent } from '../content-loader/content-loader.component';
import { MockDataService } from '../../services/mock-data.service';

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
    userLogs: any[] = [];
    userProgress = 0;
    isLoading = true;
    todayWords: number | null = null;
    currentUserId: any;

    constructor(
        private route: ActivatedRoute,
        private apiService: ApiService,
        private router: Router,
        private mockData: MockDataService
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
            // Generate mock challenge data
            const mockChallenges = this.mockData.generateMockChallengesDetailed(10);
            const selectedChallenge = mockChallenges.find(c => c.id.toString() === id) || mockChallenges[0];

            // Calculate random progress
            const randomProgress = Math.floor(Math.random() * selectedChallenge.goal_amount);
            const progressPercent = Math.round((randomProgress / selectedChallenge.goal_amount) * 100);

            // Calculate days remaining
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
                progress: Math.floor(Math.random() * selectedChallenge.goal_amount)
            }));

            this.isLoading = false;
            return;
        }

        // Fetch challenge details from C backend
        this.apiService.getChallenge(parseInt(id)).subscribe({
            next: (response) => {
                if (response.success && response.data) {
                    this.challenge = response.data;

                    // Calculate days remaining
                    const endDate = new Date(this.challenge.end_date);
                    const today = new Date();
                    const daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));

                    this.challenge.days_remaining = daysRemaining;
                    this.challenge.status = this.challenge.is_active ? 'Active' : 'Ended';

                    // Mock participants for now (would need separate API)
                    this.participants = Array.from({ length: this.challenge.participants || 0 }, (_, i) => ({
                        id: i + 1,
                        username: `User ${i + 1}`,
                        progress: Math.floor(Math.random() * this.challenge.goal_amount)
                    }));

                    this.userProgress = 0; // Would come from user_challenges table
                }
                this.isLoading = false;
            },
            error: (error) => {
                console.error('Error loading challenge details:', error);
                this.isLoading = false;
                alert('Failed to load challenge details.');
            }
        });
    }


    addProgress() {
        // Note: Progress tracking endpoint not implemented in C backend yet
        alert('Progress tracking feature not yet implemented in C backend');
        this.todayWords = null;
    }

    getPercent(current: number, total: number): number {
        if (!total || total === 0) return 0;
        const pct = Math.round((current / total) * 100);
        return pct > 100 ? 100 : pct;
    }

    copyCode() {
        if (this.challenge && this.challenge.invite_code) {
            navigator.clipboard.writeText(this.challenge.invite_code).then(() => {
                alert('Invite code copied to clipboard!');
            });
        }
    }
}
